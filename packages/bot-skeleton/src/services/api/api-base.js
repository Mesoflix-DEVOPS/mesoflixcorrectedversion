import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, socket_state } from '../tradeEngine/utils/helpers';
import { generateDerivApiInstance, getLoginId, getToken } from './appId';

class APIBase {
    api;
    token;
    account_id;
    pip_sizes = {};
    account_info = {};
    is_running = false;
    subscriptions = [];
    time_interval = null;
    has_activeSymbols = false;
    is_stopping = false;

    initializing = false;

    async init(force_update = false, account_id) {
        if (getLoginId()) {
            if (this.initializing) {
                // eslint-disable-next-line no-console
                console.log(`[APIBase] Already initializing for ${this.account_id}. Skipping redundant init.`);
                return;
            }
            this.initializing = true;
            this.toggleRunButton(true);
            if (force_update) this.terminate();
            this.api = generateDerivApiInstance();

            // Notify system that a new API instance is available
            globalObserver.emit('api.new_instance', this.api);

            this.initEventListeners();
            await this.authorizeAndSubscribe(account_id);
            if (this.time_interval) clearInterval(this.time_interval);
            this.time_interval = null;
            this.getTime();
            this.initializing = false;
        }
    }

    getConnectionStatus() {
        if (this.api?.connection) {
            const ready_state = this.api.connection.readyState;
            return socket_state[ready_state] || 'Unknown';
        }
        return 'Socket not initialized';
    }

    terminate() {
        // eslint-disable-next-line no-console
        console.log('connection terminated');
        this.clearSubscriptions();
        if (this.api) this.api.disconnect();
    }

    listeners_initialized = false;

    initEventListeners() {
        if (window && !this.listeners_initialized) {
            window.addEventListener('online', this.reconnectIfNotConnected);
            window.addEventListener('focus', this.reconnectIfNotConnected);
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.reconnectIfNotConnected();
                }
            });

            // Re-authorize with the correct account when user switches demo/real.
            // Deriv updates `active_loginid` in localStorage whenever account changes.
            window.addEventListener('storage', (event) => {
                if (event.key === 'active_loginid' && event.newValue && event.newValue !== this.account_id) {
                    // eslint-disable-next-line no-console
                    console.log(`[APIBase] Account switched via storage to ${event.newValue} — re-initializing API.`);
                    this.createNewInstance(event.newValue);
                }
            });

            // Listen for manual account switch events (for same-tab updates on mobile)
            globalObserver.register('client.switch_account', (loginid) => {
                if (loginid && loginid !== this.account_id) {
                    // eslint-disable-next-line no-console
                    console.log(`[APIBase] Account switched via observer to ${loginid} — re-initializing API.`);
                    this.createNewInstance(loginid);
                }
            });

            this.listeners_initialized = true;
        }
    }

    async createNewInstance(account_id) {
        if (this.account_id !== account_id) {
            await this.init(true, account_id);
        }
    }

    reconnectIfNotConnected = () => {
        // eslint-disable-next-line no-console
        console.log('connection state: ', this.api.connection.readyState);
        if (this.api.connection.readyState !== 1) {
            // eslint-disable-next-line no-console
            console.log('Info: Connection to the server was closed, trying to reconnect.');
            this.init();
        }
    };

    async authorizeAndSubscribe(account_id) {
        const { token, account_id: active_account_id } = getToken(account_id);
        if (token) {
            this.token = token;
            this.account_id = active_account_id;
            this.api.authorize(this.token);
            try {
                const { authorize } = await this.api.expectResponse('authorize');
                if (this.has_activeSymbols) {
                    this.toggleRunButton(false);
                } else {
                    this.getActiveSymbols();
                }
                await this.subscribe();
                this.account_info = authorize;
            } catch (e) {
                globalObserver.emit('Error', e);
            }
        }
    }

    async subscribe() {
        await Promise.all([
            doUntilDone(() => this.api.send({ balance: 1, subscribe: 1 })),
            doUntilDone(() => this.api.send({ transaction: 1, subscribe: 1 })),
            doUntilDone(() => this.api.send({ proposal_open_contract: 1, subscribe: 1 })),
        ]);
    }

    getActiveSymbols = async () => {
        doUntilDone(() => this.api.send({ active_symbols: 'brief' })).then(({ active_symbols = [] }) => {
            const pip_sizes = {};
            if (active_symbols.length) this.has_activeSymbols = true;
            active_symbols.forEach(({ symbol, pip }) => {
                pip_sizes[symbol] = +(+pip).toExponential().substring(3);
            });
            this.pip_sizes = pip_sizes;
            this.toggleRunButton(false);
        });
    };

    toggleRunButton = toggle => {
        const run_button = document.querySelector('#db-animation__run-button');
        if (!run_button) return;
        run_button.disabled = toggle;
    };

    setIsRunning(toggle = false) {
        this.is_running = toggle;
    }

    pushSubscription(subscription) {
        this.subscriptions.push(subscription);
    }

    clearSubscriptions() {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];

        // Resetting timeout resolvers
        const global_timeouts = globalObserver.getState('global_timeouts') ?? [];

        global_timeouts.forEach((_, i) => {
            clearTimeout(i);
        });
    }

    getTime() {
        if (!this.time_interval) {
            this.time_interval = setInterval(() => {
                this.api.send({ time: 1 });
            }, 30000);
        }
    }
}

export const api_base = new APIBase();
