import React, { useState, useEffect } from 'react';
import { Settings, Monitor } from 'lucide-react';
import { views } from './ViewSystem/ViewRegistry';
import * as LucideIcons from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const DynamicIcon = ({ icon, size = 24 }: { icon: any, size?: number }) => {
    if (typeof icon !== 'string') return icon;
    const Icon = (LucideIcons as any)[icon];
    if (Icon) return <Icon size={size} />;
    return <span style={{ fontSize: '12px' }}>{icon}</span>;
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

    useEffect(() => {
        // 1. 启动即刻同步：检查当前后端是否已有活跃频道
        invoke<string[]>('output_list_channels').then(res => {
            if (res && res.length > 0) {
                setHasOutput(true);
            }
        });

        // 2. 动态监听：一旦插件产生新频道，立刻显示图标
        const unlisten = listen<string>("output_channel_created", () => {
            setHasOutput(true);
        });

        return () => { unlisten.then(f => f()); };
    }, []);

    return (
        <div className="activity-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
                {views.getViews().map(view => (
                    <div 
                        key={view.id} 
                        className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`} 
                        onClick={() => { 
                            if (sidebarTab === view.id && showSidebar) {
                                setShowSidebar(false); 
                            } else { 
                                setSidebarTab(view.id); 
                                setShowSidebar(true); 
                            } 
                        }} 
                        title={view.title}
                    >
                        <DynamicIcon icon={view.icon} />
                    </div>
                ))}
            </div>
            <div style={{ flex: 1 }}></div>
            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                {/* 核心逻辑：初始隐藏，一旦有输出则永久显示 */}
                {hasOutput && (
                    <div 
                        className="activity-icon" 
                        onClick={() => invoke('open_detached_output', { channel: "绣智助手日志" })} 
                        title={t('Output')}
                        style={{ color: 'var(--accent-color)' }}
                    >
                        <Monitor size={24} />
                    </div>
                )}
                <div className={`activity-icon ${showSettings ? 'active' : ''}`} onClick={onShowSettings} title={t('Settings')}><Settings size={24} /></div>
            </div>
        </div>
    );
};

export default ActivityBar;