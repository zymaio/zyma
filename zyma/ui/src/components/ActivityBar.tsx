import React, { useState, useEffect, useReducer } from 'react';
import { Settings, Monitor, User, Puzzle } from 'lucide-react';
import { views } from './ViewSystem/ViewRegistry';
import { authRegistry } from './PluginSystem/AuthRegistry';
import AccountMenu from './PluginSystem/AccountMenu';
import * as LucideIcons from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const DynamicIcon = ({ icon, size = 24 }: { icon: any, size?: number }) => {
    if (!icon) return <Puzzle size={size} />;
    if (React.isValidElement(icon)) return icon;
    
    if (typeof icon === 'string') {
        const IconComponent = (LucideIcons as any)[icon];
        if (IconComponent) return <IconComponent size={size} />;
        
        // 关键修复：文字图标加大
        return (
            <div style={{ 
                width: size, 
                height: size, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '14px', // 增大字体
                fontWeight: 800, // 超粗体
                fontFamily: 'system-ui, sans-serif',
                lineHeight: 1,
                userSelect: 'none',
                letterSpacing: '-0.5px'
            }}>
                {icon.substring(0, 2).toUpperCase()}
            </div>
        );
    }
    return <Puzzle size={size} />;
};

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
    const [hasOutput, setHasOutput] = useState(false);
    const [authProviders, setAuthProviders] = useState(authRegistry.getProviders());
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const [activeViews, setActiveViews] = useState(views.getViews());

    useEffect(() => {
        const sync = () => {
            setActiveViews([...views.getViews()]);
            setAuthProviders([...authRegistry.getProviders()]);
            forceUpdate();
        };
        const unsubViews = views.subscribe(sync);
        const unsubAuth = authRegistry.subscribe(sync);
        sync();
        return () => { unsubViews(); unsubAuth(); };
    }, []);

    useEffect(() => {
        const checkOutput = async () => {
            try {
                const res = await invoke<string[]>('output_list_channels');
                if (res && res.length > 0) setHasOutput(true);
            } catch(e) {}
        };
        checkOutput();
        const unlisten = listen<string>("output_channel_created", () => {
            setHasOutput(true);
            forceUpdate();
        });
        return () => { unlisten.then(f => f()); };
    }, []);

    const BUILTIN_BOTTOM_IDS = ['output', 'debug', 'terminal', 'accounts', 'settings', 'explorer', 'search', 'plugins'];
    const topViews = activeViews.filter(v => !BUILTIN_BOTTOM_IDS.includes(v.id));

    return (
        <div className="activity-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%', paddingTop: '10px' }}>
                {activeViews.filter(v => ['explorer', 'search', 'plugins'].includes(v.id)).map(view => (
                    <div key={view.id} className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`} onClick={() => { setSidebarTab(view.id); setShowSidebar(true); }} title={view.title}>
                        <DynamicIcon icon={view.icon} />
                    </div>
                ))}
                {topViews.length > 0 && <div style={{ width: '20px', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />}
                {topViews.map(view => (
                    <div key={view.id} className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`} onClick={() => { setSidebarTab(view.id); setShowSidebar(true); }} title={view.title}>
                        <DynamicIcon icon={view.icon} />
                    </div>
                ))}
            </div>
            <div style={{ flex: 1 }}></div>
            <div style={{ paddingBottom: '15px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                {authProviders.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <div className={`activity-icon ${showAccountMenu ? 'active' : ''}`} onClick={() => setShowAccountMenu(!showAccountMenu)} title={t('Accounts')}>
                            <User size={24} />
                            {authProviders.some(p => p.accountName) && <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', border: '2px solid var(--bg-activity-bar)' }} />}
                        </div>
                        <AccountMenu visible={showAccountMenu} onClose={() => setShowAccountMenu(false)} position={{ bottom: 50, left: 50 }} />
                    </div>
                )}
                {hasOutput && (
                    <div className="activity-icon" onClick={() => invoke('open_detached_output', { channel: "绣智助手日志" })} title={t('Output')} style={{ color: 'var(--accent-color)' }}>
                        <Monitor size={24} />
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