import React, { useState, useEffect, useReducer } from 'react';
import { Settings, User, MessageSquare } from 'lucide-react';
import { views } from './ViewSystem/ViewRegistry';
import { authRegistry } from './PluginSystem/AuthRegistry';
import AccountMenu from './PluginSystem/AccountMenu';
import { DynamicIcon } from './Common/DynamicIcon';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
import { commands } from './CommandSystem/CommandRegistry';
import { slotRegistry } from '../core/SlotRegistry';

interface ActivityBarProps {
    sidebarTab: string;
    showSidebar: boolean;
    setSidebarTab: (id: string) => void;
    setShowSidebar: (show: boolean) => void;
    onShowSettings: () => void;
    showSettings: boolean;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ 
    sidebarTab, showSidebar, setSidebarTab, setShowSidebar, 
    onShowSettings, showSettings 
}) => {
    const { t } = useTranslation();
    const [authProviders, setAuthProviders] = useState(authRegistry.getProviders());
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const [activeViews, setActiveViews] = useState(views.getViews());
    const [isAIChatEnabled, setIsAIChatEnabled] = useState(false);
    const [nativeSidebarItems, setNativeSidebarItems] = useState<any[]>([]);

    useEffect(() => {
        const sync = async () => {
            setActiveViews([...views.getViews()]);
            setAuthProviders([...authRegistry.getProviders()]);
            setIsAIChatEnabled(commands.getCommands().some(c => c.id === 'ai.chat.open'));
            
            try {
                const native = await invoke<any>('get_native_extensions');
                setNativeSidebarItems(native.sidebar_items || []);
            } catch(e) {}
            
            forceUpdate();
        };

        let unlistenSidebar: any = null;
        listen('zyma:sidebar-updated', (e: any) => {
            setNativeSidebarItems(e.payload || []);
        }).then(u => unlistenSidebar = u);

        const unsubViews = views.subscribe(sync);
        const unsubAuth = authRegistry.subscribe(sync);
        const unsubCmds = commands.subscribe(sync);
        const unsubSlots = slotRegistry.subscribe(sync);
        sync();
        return () => { 
            unsubViews(); 
            unsubAuth(); 
            unsubCmds(); 
            unsubSlots(); 
            if (unlistenSidebar) unlistenSidebar();
        };
    }, []);

    const handleTabClick = (id: string) => {
        if (sidebarTab === id && showSidebar) {
            setShowSidebar(false);
        } else {
            setSidebarTab(id);
            setShowSidebar(true);
        }
    };

    const handleAccountClick = () => {
        if (authProviders.length === 1 && !authProviders[0].accountName) {
            authProviders[0].onLogin();
            return;
        }
        setShowAccountMenu(!showAccountMenu);
    };

    const renderSlot = (location: any) => {
        return slotRegistry.getContributedComponents(location).map(c => {
            const Content = c.component;
            return <div key={c.id} className="activity-icon">
                {typeof Content === 'function' ? <Content /> : Content}
            </div>;
        });
    };

    const BUILTIN_BOTTOM_IDS = ['output', 'debug', 'terminal', 'accounts', 'settings', 'explorer', 'search', 'plugins'];
    const topViews = activeViews.filter(v => !BUILTIN_BOTTOM_IDS.includes(v.id));

    return (
        <div className="activity-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%', paddingTop: '10px' }}>
                
                {activeViews.filter(v => ['explorer', 'search', 'plugins'].includes(v.id)).map(view => (
                    <div 
                        key={view.id} 
                        className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`} 
                        onClick={() => handleTabClick(view.id)} 
                        title={view.title}
                    >
                        <DynamicIcon icon={view.icon} />
                    </div>
                ))}

                {renderSlot('ACTIVITY_BAR_TOP')}

                {isAIChatEnabled && (
                    <div 
                        className="activity-icon" 
                        onClick={() => {
                            commands.executeCommand('ai.chat.open');
                        }} 
                        title="AI Assistant"
                        style={{ color: 'var(--accent-color)' }}
                    >
                        <MessageSquare size={24} />
                    </div>
                )}
                
                {topViews.length > 0 && <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--border-color)', margin: '5px 0' }} />}

                {topViews.map(view => (
                    <div 
                        key={view.id} 
                        className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`} 
                        onClick={() => handleTabClick(view.id)} 
                        title={view.title}
                    >
                        <DynamicIcon icon={view.icon} />
                    </div>
                ))}

                {/* 渲染原生顶部图标 (如开发环境面板) */}
                {nativeSidebarItems.filter(item => !item.params || item.params.position !== 'bottom').map(item => (
                    <div 
                        key={item.id} 
                        className="activity-icon" 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.command === 'zyma:toggle-bottom-panel') {
                                emit('open-output-panel', item.params?.channel);
                            } else {
                                // 关键修复：包裹 params 字段
                                invoke(item.command, { params: item.params || {} }).catch(console.error);
                            }
                        }} 
                        title={item.title}
                        style={{ color: item.color || 'inherit' }}
                    >
                        <DynamicIcon icon={item.icon} />
                    </div>
                ))}
            </div>

            <div style={{ flex: 1 }}></div>
            
            <div style={{ paddingBottom: '15px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                
                {renderSlot('ACTIVITY_BAR_BOTTOM')}

                {/* 渲染原生底部图标 (如日志) */}
                {nativeSidebarItems.filter(item => item.params && item.params.position === 'bottom').map(item => (
                    <div 
                        key={item.id} 
                        className="activity-icon" 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.command === 'zyma:toggle-bottom-panel') {
                                emit('open-output-panel', item.params?.channel);
                            } else {
                                invoke(item.command, { params: item.params || {} }).catch(console.error);
                            }
                        }} 
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
            </div>
        </div>
    );
};

export default ActivityBar;
