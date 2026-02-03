import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DynamicIcon } from './DynamicIcon';
import { useTranslation } from 'react-i18next';
import { commands } from '../CommandSystem/CommandRegistry';
import { useWorkbench } from '../../core/WorkbenchContext';

export const RecentWorkspacesList: React.FC = () => {
    const { t } = useTranslation();
    const { settings, setSettings } = useWorkbench();
    const recents = settings?.recent_workspaces || [];

    const handleRemoveRecent = async (e: React.MouseEvent, pathToRemove: string) => {
        e.stopPropagation();
        try {
            const newRecents = recents.filter((p: string) => p !== pathToRemove);
            const newSettings = { ...settings, recent_workspaces: newRecents };
            await invoke('save_settings', { settings: newSettings });
            if (setSettings) setSettings(newSettings);
        } catch (e) { console.error("Failed to remove recent workspace:", e); }
    };

    return (
        <div>
            <div className="welcome-section-title">
                <div className="welcome-title-icon"><DynamicIcon icon="Clock" size={18} /></div>
                <span>{t('Recent')}</span>
            </div>

            <div className="welcome-card-list">
                {recents.length > 0 ? (
                    recents.slice(0, 10).map((path) => {
                        const name = path.split(/[\\\/]/).pop() || path;
                        return (
                            <div 
                                key={path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    invoke('fs_set_cwd', { path });
                                }}
                                className="welcome-item file-item-hover"
                            >
                                <DynamicIcon icon="Folder" size={16} style={{ marginRight: '12px', color: 'var(--text-muted)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '12px' }}>{name}</span>
                                    <span style={{ 
                                        fontSize: '11px', color: 'var(--text-muted)', 
                                        fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', 
                                        textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left', opacity: 0.7
                                    }}>
                                        {path}
                                    </span>
                                </div>
                                <div 
                                    className="tab-close-btn"
                                    onClick={(e) => handleRemoveRecent(e, path)}
                                    style={{ 
                                        width: '20px', height: '20px', borderRadius: '4px', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginLeft: '8px', opacity: 0.4
                                    }}
                                >
                                    <DynamicIcon icon="X" size={12} />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.1em' }}>{t('NoRecentWorkspaces')}</div>
                )}
                
                <div 
                    onClick={() => commands.executeCommand('workspace.openFolder')}
                    className="file-item-hover"
                    style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', cursor: 'pointer', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                    {t('OpenFolder')}...
                </div>
            </div>
        </div>
    );
};