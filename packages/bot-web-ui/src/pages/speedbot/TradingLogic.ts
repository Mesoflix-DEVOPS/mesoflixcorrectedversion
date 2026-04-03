// @ts-ignore
import { api_base } from '@deriv/bot-skeleton/src/services/api/api-base';
// @ts-ignore
import { copy_trading_service } from '@deriv/bot-skeleton/src/services/api/copy-trading-service';

export type TradeMode = 'Normal' | 'Bulk' | 'Flash';

export interface TradeParams {
    amount: number;
    basis: 'stake' | 'payout';
    contract_type: string;
    currency: string;
    duration: number;
    duration_unit: string;
    symbol: string;
    barrier?: string;
    barrier2?: string;
    prediction?: number;
}

export interface TradeResult {
    id: string;
    ref: string;
    status: 'pending' | 'won' | 'lost' | 'error';
    profit?: number;
    entry_tick?: string;
    exit_tick?: string;
    contract_id?: number | string;
}

class TradingLogic {
    private is_running = false;
    private flash_limit = 5;
    private flash_interval: any = null;

    setFlashLimit(limit: number) {
        this.flash_limit = limit;
    }

    async placeTrade(params: TradeParams): Promise<any> {
        if (!api_base.api) throw new Error('API not initialized');

        // Broadcast to subscribers
        copy_trading_service.broadcast(params);

        const proposal_req = {
            proposal: 1,
            subscribe: 0,
            ...params,
        };

        try {
            // 1. Get Proposal
            const proposal_res = await api_base.api.send(proposal_req);
            if (proposal_res.error) throw proposal_res.error;

            const { id, ask_price } = proposal_res.proposal;

            // 2. Buy
            const buy_res = await api_base.api.send({ buy: id, price: ask_price });
            if (buy_res.error) throw buy_res.error;

            return buy_res.buy;
        } catch (error) {
            console.error('Trade placement failed:', error);
            throw error;
        }
    }

    async placeBulkTrades(params: TradeParams, quantity: number): Promise<any[]> {
        const trades = Array.from({ length: quantity }, () => this.placeTrade(params));
        return Promise.all(trades);
    }

    startFlashTrades(params: TradeParams, limit: number, onTradePlaced: (res: any) => void) {
        if (this.is_running) return;
        this.is_running = true;
        let count = 0;

        this.flash_interval = setInterval(async () => {
            if (count >= limit || !this.is_running) {
                this.stopFlashTrades();
                return;
            }

            try {
                const res = await this.placeTrade(params);
                onTradePlaced(res);
                count++;
            } catch (error) {
                console.error('Flash trade failed:', error);
            }
        }, 1000);
    }

    stopFlashTrades() {
        this.is_running = false;
        if (this.flash_interval) {
            clearInterval(this.flash_interval);
            this.flash_interval = null;
        }
    }
}

export const trading_logic = new TradingLogic();
