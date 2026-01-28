import React, { useState, useMemo, useEffect } from 'react';
import { Search, Puzzle, Trash2, Ban, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { DynamicIcon } from '../Common/DynamicIcon';

interface PluginsPanelProps {
    pluginManager: any;
    onUpdate: () => void;
}

const PluginsPanel: React.FC<PluginsPanelProps> = ({ pluginManager, onUpdate }) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [plugins, setPlugins] = useState<any[]>([]);

    useEffect(() => {
        if (!pluginManager) return;
        const updateList = () => setPlugins(pluginManager.getLoadedPlugins());
        updateList();
        return pluginManager.subscribe(updateList);
    }, [pluginManager]);

    const filteredPlugins = useMemo(() => {
        if (!searchQuery) return plugins;
        const q = searchQuery.toLowerCase();
        return plugins.filter((p: any) => 
            p.name.toLowerCase().includes(q) || 
            (p.description && p.description.toLowerCase().includes(q))
        );
    }, [plugins, searchQuery]);

    const handleToggle = async (e: React.MouseEvent, p: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (p.enabled) {
            await pluginManager.disablePlugin(p.name);
        } else {
            await pluginManager.enablePlugin(p.name);
        }
        onUpdate();
    };

    const handleDelete = async (e: React.MouseEvent, p: any) => {
        e.preventDefault();
        e.stopPropagation();
        const confirmed = await ask(`${t('ConfirmDeletePlugin')} 
[${p.name}]`, { title: 'Zyma Extension', kind: 'warning' });
        if (confirmed) {
            try {
                await pluginManager.unloadPlugin(p.name);
                if (p.path) {
                    await invoke('remove_item', { path: p.path });
                    await pluginManager.loadAll();
                    onUpdate();
                }
            } catch (err) {}
        }
    };

    return (
        <div className="plugins-panel" style={{ 
            display: 'flex', flexDirection: 'column', height: '100%', 
            backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-primary)' 
        }}>
            {/* Header Area */}
            <div style={{ padding: '15px 10px 10px 10px' }}>
                <div style={{ 
                    fontSize: 'calc(var(--ui-font-size) - 1px)', 
                    fontWeight: '900', textTransform: 'uppercase', 
                    marginBottom: '12px', color: 'var(--text-muted)',
                    letterSpacing: '0.5px'
                }}>
                    {t('Extensions')}
                </div>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder={t('SearchExtensions')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                            padding: '8px 8px 8px 32px', fontSize: 'var(--ui-font-size)',
                            outline: 'none', borderRadius: '4px'
                        }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-color)' }} />
                </div>
            </div>

            {/* List Area */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
                <div style={{ 
                    padding: '10px', fontSize: 'calc(var(--ui-font-size) - 2px)', 
                    fontWeight: 'bold', color: 'var(--text-secondary)'
                }}>
                    {t('Installed')} ({filteredPlugins.length})
                </div>

                {filteredPlugins.map((p: any) => (
                    <div key={p.id} style={{ 
                        display: 'flex', padding: '12px', gap: '12px', 
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: p.enabled ? 'transparent' : 'rgba(0,0,0,0.1)'
                    }} className="file-item-hover">
                        {/* Plugin Icon */}
                        <div style={{ 
                            width: '44px', height: '44px', 
                            backgroundColor: p.enabled ? 'var(--accent-color)' : 'var(--active-bg)', 
                            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            flexShrink: 0, color: p.enabled ? 'var(--accent-foreground)' : 'var(--text-muted)'
                        }}>
                            <DynamicIcon icon={p.icon} size={26} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: 'var(--ui-font-size)', color: p.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {p.name}
                                </div>
                                <div style={{ fontSize: 'calc(var(--ui-font-size) - 3px)', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                                    v{p.version}
                                </div>
                            </div>
                            
                            <div style={{ 
                                fontSize: 'calc(var(--ui-font-size) - 2px)', 
                                color: 'var(--text-secondary)', lineHeight: '1.4',
                                marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                            }}>
                                {p.description || 'No description.'}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 'calc(var(--ui-font-size) - 3px)', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                    {p.author || 'Zyma'}
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button 
                                        onClick={(e) => handleToggle(e, p)} 
                                        style={{ 
                                            background: p.enabled ? 'var(--active-bg)' : 'var(--accent-color)', 
                                            border: 'none', 
                                            color: p.enabled ? 'var(--text-primary)' : 'var(--accent-foreground)', 
                                            cursor: 'pointer', padding: '2px 8px', borderRadius: '3px',
                                            fontSize: 'calc(var(--ui-font-size) - 2px)', fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', gap: '4px'
                                        }}
                                    >
                                        {p.enabled ? <><Ban size={12} /> {t('Disable')}</> : <><Play size={12} /> {t('Enable')}</>}
                                    </button>
                                    {!p.isBuiltin && (
                                        <button 
                                            onClick={(e) => handleDelete(e, p)} 
                                            style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: 0 }}
                                            title={t('Uninstall')}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PluginsPanel;
