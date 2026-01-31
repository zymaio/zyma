import React from 'react';
import { authRegistry } from './AuthRegistry';
import { LogIn, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AccountMenuProps {
    visible: boolean;
    onClose: () => void;
    position: { bottom: number, left: number };
}

const AccountMenu: React.FC<AccountMenuProps> = ({ visible, onClose, position }) => {
    const { t } = useTranslation();
    if (!visible) return null;

    const providers = authRegistry.getProviders();

    return (
        <>
            <div 
                style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                onClick={onClose} 
            />
            <div style={{
                position: 'fixed',
                bottom: position.bottom,
                left: position.left,
                width: '240px',
                backgroundColor: 'var(--bg-dropdown)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-main)',
                padding: '8px 0',
                zIndex: 1000,
                color: 'var(--text-primary)',
                fontSize: 'var(--ui-font-size)'
            }}>
                <div style={{ padding: '8px 15px', borderBottom: '1px solid var(--border-color)', opacity: 0.6, fontSize: '0.85em', fontWeight: 'bold' }}>
                    {t('Accounts')}
                </div>
                
                {providers.length === 0 ? (
                    <div style={{ padding: '12px 15px', opacity: 0.5 }}>{t('NoAuthProviders')}</div>
                ) : (
                    providers.map(p => (
                        <div key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <User size={14} style={{ color: p.accountName ? 'var(--status-success)' : 'inherit' }} />
                                    <span>{p.label}</span>
                                </div>
                                {p.accountName && (
                                    <span style={{ fontSize: '11px', opacity: 0.6 }}>
                                        {typeof p.accountName === 'object' ? (p.accountName as any).username : p.accountName}
                                    </span>
                                )}
                            </div>
                            
                            {!p.accountName ? (
                                <div 
                                    onClick={() => { p.onLogin(); onClose(); }}
                                    style={{ padding: '6px 35px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)' }}
                                    className="menu-item-hover"
                                >
                                    <LogIn size={12} /> {t('SignIn')}
                                </div>
                            ) : (
                                <div 
                                    onClick={() => { p.onLogout(); onClose(); }}
                                    style={{ padding: '6px 35px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}
                                    className="menu-item-hover"
                                >
                                    <LogOut size={12} /> {t('SignOut')}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

export default AccountMenu;
