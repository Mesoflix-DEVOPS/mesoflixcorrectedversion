import React, { useState, useEffect } from 'react';
import { FaYoutube, FaTrash, FaPlus, FaCheckCircle, FaTimesCircle, FaDesktop, FaSyncAlt, FaShieldAlt } from 'react-icons/fa';
import { copy_trading_service } from '../../services/api/copy-trading-service';

const TokenManager: React.FC = () => {
    const [token, setToken] = useState('');
    const [savedTokens, setSavedTokens] = useState<string[]>([]);
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isCopyTrading, setIsCopyTrading] = useState(false);
    const [systemStatus, setSystemStatus] = useState<'connected' | 'disconnected' | 'idle'>('idle');

    // Inject global CSS once on mount
    useEffect(() => {
        const styleId = 'copytrading-global-styles';
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = `
                @keyframes pulse-green {
                    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @media (max-width: 768px) {
                    input, textarea, select { font-size: 16px !important; }
                    button { touch-action: manipulation; }
                }
            `;
            document.head.appendChild(styleEl);
        }
    }, []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        try {
            const tokens_str = localStorage.getItem('deriv_copy_tokens');
            if (tokens_str) {
                setSavedTokens(JSON.parse(tokens_str));
            }
            const enabled = localStorage.getItem('is_copy_trading_enabled') === 'true';
            setIsCopyTrading(enabled);
            setSystemStatus(enabled ? 'connected' : 'idle');
        } catch (error) {
            console.error('Error loading copytrading settings:', error);
        }
    }, []);

    const saveToken = () => {
        const t = token.trim();
        if (!t) return;
        if (savedTokens.includes(t)) {
            setToast({ type: 'err', text: 'Token already added' });
            return;
        }

        const newTokens = [...savedTokens, t];
        localStorage.setItem('deriv_copy_tokens', JSON.stringify(newTokens));
        setSavedTokens(newTokens);
        setToken('');
        setToast({ type: 'ok', text: 'Subscriber synced successfully' });

        if (isCopyTrading) {
            copy_trading_service.addSubscriber(t);
        }
    };

    const removeToken = (tokenToRemove: string) => {
        const newTokens = savedTokens.filter(t => t !== tokenToRemove);
        localStorage.setItem('deriv_copy_tokens', JSON.stringify(newTokens));
        setSavedTokens(newTokens);
        copy_trading_service.removeSubscriber(tokenToRemove);
        setToast({ type: 'ok', text: 'Subscriber removed' });
    };

    const toggleCopyTrading = () => {
        const newState = !isCopyTrading;
        if (newState && savedTokens.length === 0) {
            setToast({ type: 'err', text: 'Add at least one subscriber account' });
            return;
        }

        setIsCopyTrading(newState);
        copy_trading_service.setEnabled(newState);
        setSystemStatus(newState ? 'connected' : 'idle');
        setToast({
            type: 'ok',
            text: newState ? 'Real-time execution sync started' : 'Sync suspended'
        });
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0e1117', // Darker, premium background
            color: '#e6edf3',
            overflowY: 'auto',
            padding: isMobile ? '15px' : '40px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Top Bar / Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0, color: '#fff' }}>
                        System Execution Sync
                    </h1>
                    <p style={{ margin: '5px 0 0 0', color: '#8b949e', fontSize: '14px' }}>
                        Real-time trade replication for Mesoflix Systems
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: '#161b22',
                        borderRadius: '20px',
                        border: '1px solid #30363d',
                        fontSize: '13px'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: systemStatus === 'connected' ? '#238636' : '#8b949e',
                            boxShadow: systemStatus === 'connected' ? '0 0 8px #238636' : 'none'
                        }} />
                        {systemStatus === 'connected' ? 'System Active' : 'System Standby'}
                    </div>
                </div>
            </div>

            {/* Main Action Card */}
            <div style={{
                background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)',
                borderRadius: '16px',
                padding: isMobile ? '20px' : '32px',
                border: '1px solid #30363d',
                marginBottom: '30px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                        <h2 style={{ fontSize: '20px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaSyncAlt style={{ color: '#58a6ff' }} /> Master Controller
                        </h2>
                        <p style={{ color: '#8b949e', fontSize: '14px', lineHeight: '1.5' }}>
                            When enabled, every trade executed by this terminal will be instantly replicated across all synced subscriber accounts using our low-latency bridge.
                        </p>
                    </div>
                    
                    <button
                        onClick={toggleCopyTrading}
                        style={{
                            backgroundColor: isCopyTrading ? '#da3633' : '#238636',
                            color: 'white',
                            border: 'none',
                            padding: '16px 32px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: isCopyTrading ? '0 4px 14px rgba(218, 54, 51, 0.4)' : '0 4px 14px rgba(35, 134, 54, 0.4)',
                            animation: isCopyTrading ? 'pulse-green 2s infinite' : 'none'
                        }}
                    >
                        {isCopyTrading ? <FaTimesCircle /> : <FaCheckCircle />}
                        {isCopyTrading ? 'Stop All Sync' : 'Start System Sync'}
                    </button>
                </div>

                <div style={{ height: '1px', backgroundColor: '#30363d', margin: '24px 0' }} />

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
                        <input
                            type="password"
                            placeholder="Enter Subscriber API Token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px 20px',
                                backgroundColor: '#0d1117',
                                border: '1px solid #30363d',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <button
                        onClick={saveToken}
                        disabled={!token}
                        style={{
                            padding: '16px 24px',
                            backgroundColor: '#21262d',
                            color: '#c9d1d9',
                            border: '1px solid #30363d',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: token ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <FaPlus /> Add Subscriber
                    </button>
                    <a 
                        href="https://youtube.com" 
                        target="_blank" 
                        rel="noreferrer"
                        style={{
                            padding: '16px 24px',
                            backgroundColor: 'transparent',
                            color: '#58a6ff',
                            border: '1px solid #30363d',
                            borderRadius: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            textDecoration: 'none'
                        }}
                    >
                        <FaYoutube style={{ color: '#ff0000' }} /> Tutorial
                    </a>
                </div>
            </div>

            {/* Subscribers List */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {savedTokens.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '60px 20px',
                        textAlign: 'center',
                        backgroundColor: '#161b22',
                        borderRadius: '16px',
                        border: '2px dashed #30363d',
                        color: '#8b949e'
                    }}>
                        <FaDesktop style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.5 }} />
                        <h3 style={{ margin: '0 0 10px 0', color: '#c9d1d9' }}>No Active Subscribers</h3>
                        <p style={{ margin: 0, fontSize: '14px' }}>Add subscriber tokens above to build your trading network</p>
                    </div>
                ) : (
                    savedTokens.map((t, i) => (
                        <div key={i} style={{
                            backgroundColor: '#161b22',
                            padding: '24px',
                            borderRadius: '16px',
                            border: '1px solid #30363d',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '40px', height: '40px',
                                        backgroundColor: '#0d1117',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#58a6ff'
                                    }}>
                                        <FaShieldAlt />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Subscriber Node</div>
                                        <div style={{ fontSize: '12px', color: '#8b949e' }}>Channel ID: #{i+1}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeToken(t)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f85149',
                                        cursor: 'pointer',
                                        padding: '8px'
                                    }}
                                >
                                    <FaTrash />
                                </button>
                            </div>
                            <div style={{
                                backgroundColor: '#0d1117',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                color: '#8b949e',
                                wordBreak: 'break-all',
                                border: '1px solid #30363d'
                            }}>
                                {t.slice(0, 10)}••••••••••••••••{t.slice(-6)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Status */}
            <div style={{ marginTop: 'auto', paddingTop: '40px', textAlign: 'center', color: '#8b949e', fontSize: '12px' }}>
                &copy; 2026 MesoflixLabs • Professional Execution Bridge v2.0.0
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    padding: '16px 24px',
                    backgroundColor: toast.type === 'ok' ? '#238636' : '#da3633',
                    color: '#fff',
                    borderRadius: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 9999,
                    animation: 'slideInRight 0.3s ease-out'
                }}>
                    {toast.type === 'ok' ? <FaCheckCircle /> : <FaTimesCircle />}
                    {toast.text}
                </div>
            )}
        </div>
    );
};

export default TokenManager;


export default TokenManager;