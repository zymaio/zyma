import React from 'react';
import { Settings, Monitor } from 'lucide-react';
import { views } from './ViewSystem/ViewRegistry';
import * as LucideIcons from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

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
    activeChannels: string[];
    onShowSettings: () => void;
    showSettings: boolean;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ 
    sidebarTab, showSidebar, setSidebarTab, setShowSidebar, 
    activeChannels, onShowSettings, showSettings 
}) => {
    const { t } = useTranslation();

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
            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {activeChannels.length > 0 && (
                    <div 
                        className={`activity-icon`} 
                        onClick={() => invoke('open_detached_output', { channel: activeChannels[0] })} 
                        title={t('Output')}
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
