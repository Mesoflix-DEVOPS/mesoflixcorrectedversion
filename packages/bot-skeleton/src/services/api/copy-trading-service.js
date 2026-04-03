import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import { getSocketURL, website_name } from '@deriv/shared';
import { getLanguage } from '@deriv/translations';
import APIMiddleware from './api-middleware';

class CopyTradingService {
    constructor() {
        this.subscriber_apis = new Map(); // token -> { api, account_id }
        this.is_enabled = false;
        this.loadSettings();
    }

    loadSettings() {
        try {
            const enabled = localStorage.getItem('is_copy_trading_enabled') === 'true';
            this.is_enabled = enabled;

            if (this.is_enabled) {
                this.initializeSubscribers();
            }
        } catch (error) {
            console.error('[CopyTradingService] Error loading settings:', error);
        }
    }

    async initializeSubscribers() {
        const tokens_str = localStorage.getItem('deriv_copy_tokens');
        if (!tokens_str) return;

        try {
            const tokens = JSON.parse(tokens_str);
            for (const token of tokens) {
                if (!this.subscriber_apis.has(token)) {
                    await this.addSubscriber(token);
                }
            }
        } catch (error) {
            console.error('[CopyTradingService] Error initializing subscribers:', error);
        }
    }

    async addSubscriber(token) {
        if (this.subscriber_apis.has(token)) return;

        const app_id = 118970; // Hardcoded app_id from appId.js
        const socket_url = `wss://${getSocketURL()}/websockets/v3?app_id=${app_id}&l=${getLanguage()}&brand=${website_name.toLowerCase()}`;

        const deriv_socket = new WebSocket(socket_url);
        const deriv_api = new DerivAPIBasic({
            connection: deriv_socket,
            middleware: new APIMiddleware({}),
        });

        try {
            await deriv_api.authorize(token);
            const { authorize } = await deriv_api.expectResponse('authorize');

            this.subscriber_apis.set(token, {
                api: deriv_api,
                account_id: authorize.loginid,
                is_demo: authorize.is_virtual === 1
            });

            console.log(`[CopyTradingService] Subscriber authorized: ${authorize.loginid}`);
        } catch (error) {
            console.error(`[CopyTradingService] Failed to authorize token ${token.slice(0, 4)}...:`, error);
            deriv_api.disconnect();
        }
    }

    removeSubscriber(token) {
        const entry = this.subscriber_apis.get(token);
        if (entry) {
            entry.api.disconnect();
            this.subscriber_apis.delete(token);
        }
    }

    async replicateTrade(entry, trade_params) {
        try {
            console.log(`[CopyTradingService] Replicating trade for ${entry.account_id}:`, trade_params.symbol, trade_params.contract_type);
            
            // 1. Get a fresh proposal for this specific subscriber account
            const proposal_req = {
                proposal: 1,
                subscribe: 0,
                ...trade_params,
            };

            // Ensure we don't pass any old IDs
            delete proposal_req.buy;
            delete proposal_req.price;

            const proposal_res = await entry.api.send(proposal_req);
            if (proposal_res.error) {
                throw new Error(proposal_res.error.message || 'Proposal failed');
            }

            const { id, ask_price } = proposal_res.proposal;

            // 2. Execute the buy with the new proposal_id
            const buy_res = await entry.api.send({ buy: id, price: ask_price });
            if (buy_res.error) {
                throw new Error(buy_res.error.message || 'Buy failed');
            }

            console.log(`[CopyTradingService] Successfully replicated trade for ${entry.account_id}. Contract ID: ${buy_res.buy.contract_id}`);
        } catch (error) {
            console.error(`[CopyTradingService] Failed to replicate trade for ${entry.account_id}:`, error.message);
        }
    }

    broadcast(trade_params) {
        if (!this.is_enabled || this.subscriber_apis.size === 0) return;

        console.log(`[CopyTradingService] Broadcasting trade to ${this.subscriber_apis.size} subscribers`);

        this.subscriber_apis.forEach((entry) => {
            this.replicateTrade(entry, trade_params);
        });
    }

    setEnabled(enabled) {
        this.is_enabled = enabled;
        localStorage.setItem('is_copy_trading_enabled', enabled);
        if (enabled) {
            this.initializeSubscribers();
        } else {
            this.subscriber_apis.forEach(entry => entry.api.disconnect());
            this.subscriber_apis.clear();
        }
    }
}

export const copy_trading_service = new CopyTradingService();
