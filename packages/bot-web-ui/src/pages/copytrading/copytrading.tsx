import React, { useState, useEffect } from 'react';
import { FaYoutube, FaTrash, FaPlus, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { copy_trading_service } from '../../services/api/copy-trading-service';

const TokenManager: React.FC = () => {
    const [token, setToken] = useState('');
    const [savedTokens, setSavedTokens] = useState<string[]>([]);
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isCopyTrading, setIsCopyTrading] = useState(false);

    // Inject global CSS once on mount
    useEffect(() => {
        const styleId = 'copytrading-global-styles';
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @media (max-width: 768px) {
                    input, textarea, select { font-size: 16px !important; }
                    button { touch-action: manipulation; }
                    body { -webkit-overflow-scrolling: touch; overflow-x: hidden; }
                }
            `;
            document.head.appendChild(styleEl);
        }
    }, []);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-dismiss toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Load saved tokens and status on component mount
    useEffect(() => {
        try {
            const tokens_str = localStorage.getItem('deriv_copy_tokens');
            if (tokens_str) {
                setSavedTokens(JSON.parse(tokens_str));
            } else {
                // Migration: Check for old single token
                const old = localStorage.getItem('deriv_copier_token') || localStorage.getItem('deriv_copy_user_token');
                if (old) {
                    setSavedTokens([old]);
                    localStorage.setItem('deriv_copy_tokens', JSON.stringify([old]));
                }
            }

            const enabled = localStorage.getItem('is_copy_trading_enabled') === 'true';
            setIsCopyTrading(enabled);
        } catch (error) {
            console.error('Error loading saved tokens:', error);
        }
    }, []);

    const saveToken = () => {
        const t = token.trim();
        if (!t) { setToast({ type: 'err', text: 'Token is empty' }); return; }
        if (t.length < 10) { setToast({ type: 'err', text: 'Token is too short' }); return; }
        if (savedTokens.includes(t)) { setToast({ type: 'err', text: 'Token already exists' }); return; }

        try {
            const newTokens = [...savedTokens, t];
            localStorage.setItem('deriv_copy_tokens', JSON.stringify(newTokens));
            setSavedTokens(newTokens);
            setToken('');
            setToast({ type: 'ok', text: 'Token added successfully' });

            if (isCopyTrading) {
                copy_trading_service.addSubscriber(t);
            }
        } catch (error) {
            console.error('Error saving token:', error);
            setToast({ type: 'err', text: 'Failed to save token' });
        }
    };

    const removeToken = (tokenToRemove: string) => {
        try {
            const newTokens = savedTokens.filter(t => t !== tokenToRemove);
            localStorage.setItem('deriv_copy_tokens', JSON.stringify(newTokens));
            setSavedTokens(newTokens);

            copy_trading_service.removeSubscriber(tokenToRemove);

            setToast({ type: 'ok', text: 'Token removed successfully' });
            if (newTokens.length === 0 && isCopyTrading) {
                toggleCopyTrading();
            }
        } catch (error) {
            console.error('Error removing token:', error);
            setToast({ type: 'err', text: 'Failed to remove token' });
        }
    };

    const toggleCopyTrading = () => {
        const newState = !isCopyTrading;
        if (newState && savedTokens.length === 0) {
            setToast({ type: 'err', text: 'Please add at least one token first' });
            return;
        }

        setIsCopyTrading(newState);
        copy_trading_service.setEnabled(newState);
        setToast({
            type: 'ok',
            text: newState ? 'Copy trading started' : 'Copy trading stopped'
        });
    };

    return (
        <div style={{
            position: 'fixed',
            width: '100%',
            height: isMobile ? '70vh' : '75vh',
            display: 'flex',
            flexDirection: 'column' as const,
            padding: isMobile ? '10px' : '20px',
            boxSizing: 'border-box' as const,
            overflowX: 'hidden' as const,
            overflowY: 'auto' as const,
            backgroundColor: '#f4f7f6', // Slightly lighter grey/blue
            WebkitOverflowScrolling: 'touch' as const
        }}>
            {/* Header Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexDirection: isMobile ? 'column' : 'row' as const,
                gap: '15px'
            }}>
                <h2 style={{
                    fontWeight: '800',
                    fontSize: isMobile ? '22px' : '28px',
                    margin: 0,
                    color: '#1a237e',
                    textAlign: isMobile ? 'center' : 'left' as const
                }}>
                    Copytrading Hub
                </h2>

                {savedTokens.length > 0 && (
                    <button
                        style={{
                            backgroundColor: isCopyTrading ? '#ef5350' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '30px',
                            fontWeight: '700',
                            fontSize: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: isMobile ? '100%' : 'auto',
                            justifyContent: 'center'
                        }}
                        onClick={toggleCopyTrading}
                    >
                        {isCopyTrading ? <FaTimesCircle /> : <FaCheckCircle />}
                        {isCopyTrading ? 'Stop Copying' : 'Start Copying'}
                    </button>
                )}
            </div>

            {/* Status Banner */}
            {savedTokens.length > 0 && (
                <div style={{
                    padding: '15px 20px',
                    borderRadius: '12px',
                    backgroundColor: isCopyTrading ? '#e8f5e9' : '#fff3e0',
                    borderLeft: `6px solid ${isCopyTrading ? '#4caf50' : '#ffb74d'}`,
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    fontSize: '15px',
                    color: isCopyTrading ? '#2e7d32' : '#e65100',
                    fontWeight: '600'
                }}>
                    <div style={{
                        width: '12px', height: '12px',
                        backgroundColor: isCopyTrading ? '#4caf50' : '#ffb74d',
                        borderRadius: '50%',
                        boxShadow: isCopyTrading ? '0 0 8px #4caf50' : 'none'
                    }} />
                    <span>
                        {isCopyTrading
                            ? `Active: Copying trades to ${savedTokens.length} account${savedTokens.length > 1 ? 's' : ''}`
                            : 'Inactive: Not copying trades. Click start to begin.'}
                    </span>
                </div>
            )}

            {/* Add Token Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: isMobile ? '20px' : '25px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                marginBottom: '25px'
            }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>Add Subscriber Token</h3>
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row' as const,
                    gap: '12px'
                }}>
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minWidth: '100px',
                        border: '1px solid #eee'
                    }}>
                        <FaYoutube style={{ color: '#FF0000', fontSize: '20px' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>Tutorial</span>
                    </div>
                    <input
                        type="password"
                        placeholder="Enter Deriv API Token"
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '14px 18px',
                            border: '2px solid #edf2f7',
                            borderRadius: '10px',
                            fontSize: '16px',
                            outline: 'none',
                            backgroundColor: '#fafafa',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#4a90e2'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#edf2f7'; }}
                    />
                    <button
                        onClick={saveToken}
                        disabled={!token}
                        style={{
                            backgroundColor: '#4a90e2',
                            color: 'white',
                            border: 'none',
                            padding: '14px 25px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            cursor: token ? 'pointer' : 'not-allowed',
                            opacity: token ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center'
                        }}
                    >
                        <FaPlus /> Add Token
                    </button>
                </div>
            </div>

            {/* Tokens List */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {savedTokens.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '40px',
                        textAlign: 'center',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '2px dashed #cbd5e0',
                        color: '#718096'
                    }}>
                        <p style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>No subscriber tokens added yet</p>
                        <p style={{ fontSize: '14px', marginTop: '10px' }}>Add tokens above to start copytrading</p>
                    </div>
                ) : (
                    savedTokens.map((t, index) => (
                        <div key={index} style={{
                            backgroundColor: 'white',
                            padding: '20px',
                            borderRadius: '16px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            border: '1px solid #edf2f7',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{
                                    backgroundColor: '#ebf4ff',
                                    color: '#2b6cb0',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '700'
                                }}>
                                    Subscriber #{index + 1}
                                </div>
                                <button
                                    onClick={() => removeToken(t)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#e53e3e',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Remove Subscriber"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                            <div style={{
                                fontFamily: 'monospace',
                                color: '#4a5568',
                                fontSize: '14px',
                                backgroundColor: '#f7fafc',
                                padding: '10px',
                                borderRadius: '8px',
                                wordBreak: 'break-all'
                            }}>
                                {t.slice(0, 8)}••••••••••••••••{t.slice(-4)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Instructions */}
            <div style={{
                marginTop: '30px',
                padding: '25px',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                color: '#4a5568'
            }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#2d3748', borderBottom: '2px solid #ebf8ff', paddingBottom: '10px' }}>
                    How it works
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                    <li><strong>Real-time Replication:</strong> Every trade placed by your bot is instantly copied to all active subscriber accounts.</li>
                    <li><strong>Multi-Account Support:</strong> You can add as many subscriber tokens as you need.</li>
                    <li><strong>Demo & Real:</strong> Works seamlessly across both virtual and real money accounts.</li>
                    <li><strong>Safety First:</strong> You can stop all copytrading at any time using the master toggle above.</li>
                </ul>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    backgroundColor: toast.type === 'ok' ? '#2f855a' : '#c53030',
                    color: 'white',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    animation: 'slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                }}>
                    {toast.type === 'ok' ? <FaCheckCircle /> : <FaTimesCircle />}
                    <span>{toast.text}</span>
                </div>
            )}
        </div>
    );
};

export default TokenManager;