import React, { useState, useEffect, useReducer } from 'react';
import { Settings, Monitor, User, MessageSquare } from 'lucide-react';
import { views } from './ViewSystem/ViewRegistry';
import { authRegistry } from './PluginSystem/AuthRegistry';
import AccountMenu from './PluginSystem/AccountMenu';
import { DynamicIcon } from './Common/DynamicIcon'; // 使用新提取的组件
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { commands } from './CommandSystem/CommandRegistry';

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
    const [isAIChatEnabled, setIsAIChatEnabled] = useState(false);

    useEffect(() => {
        const sync = () => {
            setActiveViews([...views.getViews()]);
            setAuthProviders([...authRegistry.getProviders()]);
            // 检查 AI 命令是否已注册，决定是否显示图标
            setIsAIChatEnabled(commands.getCommands().some(c => c.id === 'ai.chat.open'));
            forceUpdate();
        };
        const unsubViews = views.subscribe(sync);
        const unsubAuth = authRegistry.subscribe(sync);
        const unsubCmds = commands.subscribe(sync); // 监听命令变化
        sync();
        return () => { unsubViews(); unsubAuth(); unsubCmds(); };
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

    const handleTabClick = (id: string) => {
        if (sidebarTab === id && showSidebar) {
            setShowSidebar(false);
        } else {
            setSidebarTab(id);
            setShowSidebar(true);
        }
    };

    const BUILTIN_BOTTOM_IDS = ['output', 'debug', 'terminal', 'accounts', 'settings', 'explorer', 'search', 'plugins'];
    const topViews = activeViews.filter(v => !BUILTIN_BOTTOM_IDS.includes(v.id));

    return (
        <div className="activity-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%', paddingTop: '10px' }}>
                
                {/* 核心内置图标 */}
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

                {/* AI 助手入口 - 只有在插件启用（命令存在）时才显示 */}
                {isAIChatEnabled && (
                    <div 
                        className="activity-icon" 
                        onClick={() => {
                            // AI 图标不属于侧边栏页签，点击它不会影响侧边栏状态，直接打开 Tab
                            commands.executeCommand('ai.chat.open');
                        }} 
                        title="AI Assistant"
                        style={{ color: 'var(--accent-color)' }}
                    >
                        <MessageSquare size={24} />
                    </div>
                )}
                
                {topViews.length > 0 && <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--border-color)', margin: '5px 0' }} />}

                {/* 插件扩展图标 */}
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
            </div>

            <div style={{ flex: 1 }}></div>
            
            <div style={{ paddingBottom: '15px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                
                {authProviders.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <div className={`activity-icon ${showAccountMenu ? 'active' : ''}`} onClick={() => setShowAccountMenu(!showAccountMenu)} title={t('Accounts')}>
                            <User size={24} />
                            {authProviders.some(p => p.accountName) && <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-success)', border: '2px solid var(--bg-activity)' }} />}
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
