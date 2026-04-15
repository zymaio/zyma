import React from 'react';
import { Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DynamicIcon } from './Common/DynamicIcon';
import { authRegistry } from './PluginSystem/AuthRegistry';
import AccountMenu from './PluginSystem/AccountMenu';
import { slotRegistry } from '../core/SlotRegistry';
import type { NativeSidebarItem } from '../hooks/useActivityBarData';

interface ActivityBarBottomViewsProps {
    sidebarTab: string;
    showSidebar: boolean;
    onTabClick: (id: string) => void;
    nativeSidebarItems: NativeSidebarItem[];
    onShowSettings: () => void;
    showSettings: boolean;
}

const ActivityBarBottomViews: React.FC<ActivityBarBottomViewsProps> = ({
    nativeSidebarItems, onShowSettings, showSettings
}) => {
    const { t } = useTranslation();
    const [showAccountMenu, setShowAccountMenu] = React.useState(false);
    const authProviders = authRegistry.getProviders();

    const handleNativeClick = (item: NativeSidebarItem) => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.command === 'zyma:toggle-bottom-panel') {
            import('@tauri-apps/api/event').then(({ emit }) => emit('open-output-panel', item.params?.channel));
        } else {
            import('@tauri-apps/api/core').then(({ invoke }) => invoke(item.command, { params: item.params || {} }).catch(console.error));
        }
    };

    const handleAccountClick = () => {
        if (authProviders.length === 1 && !authProviders[0].accountName) {
            authProviders[0].onLogin();
            return;
        }
        setShowAccountMenu(!showAccountMenu);
    };

    return (
        <>
            {slotRegistry.getContributedComponents('ACTIVITY_BAR_BOTTOM').map(c => {
                const Content = c.component;
                return <div key={c.id} className="activity-icon">
                    {typeof Content === 'function' ? <Content /> : Content}
                </div>;
            })}

            {nativeSidebarItems.filter(item => item.params && item.params.position === 'bottom').map(item => (
                <div
                    key={item.id}
                    className="activity-icon"
                    onClick={handleNativeClick(item)}
                    title={item.title}
                    style={{ color: item.color || 'inherit' }}
                >
                    <DynamicIcon icon={item.icon} />
                </div>
            ))}

            {authProviders.length > 0 && (
                <div style={{ position: 'relative' }}>
                    <div
                        className={`activity-icon ${showAccountMenu ? 'active' : ''}`}
                        onClick={handleAccountClick}
                        title={t('Accounts')}
                        style={{ color: authProviders.some(p => p.accountName) ? 'var(--status-success)' : 'inherit' }}
                    >
                        <User size={24} />
                        {authProviders.some(p => p.accountName) && <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-success)', border: '2px solid var(--bg-activity)' }} />}
                    </div>
                    <AccountMenu visible={showAccountMenu} onClose={() => setShowAccountMenu(false)} position={{ bottom: 50, left: 50 }} />
                </div>
            )}

            <div className={`activity-icon ${showSettings ? 'active' : ''}`} onClick={onShowSettings} title={t('Settings')}>
                <Settings size={24} />
            </div>
        </>
    );
};

export default ActivityBarBottomViews;
