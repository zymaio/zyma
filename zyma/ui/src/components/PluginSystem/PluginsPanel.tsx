import React, { useState, useMemo, useEffect } from 'react';
import { Search, Puzzle, Trash2, Ban, Play, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { commands } from '../CommandSystem/CommandRegistry';
import { ask } from '@tauri-apps/plugin-dialog';
import * as LucideIcons from 'lucide-react';

const DynamicIcon = ({ icon, size = 24 }: { icon: string, size?: number }) => {
    const Icon = (LucideIcons as any)[icon];
    if (Icon) return <Icon size={size} color="#fff" />;
    return <Puzzle size={size} color="#fff" />;
};

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
            
            const confirmed = await ask(
                `${t('ConfirmDeletePlugin')} \n[${p.name}]`, 
                { title: 'Zyma Extension', kind: 'warning', okLabel: t('Delete'), cancelLabel: t('Cancel') }
            );
            
            if (confirmed) {
                try {
                    // 1. 先从内存卸载（清理 UI 和事件）
                    await pluginManager.unloadPlugin(p.name);
                    
                    // 2. 物理删除（使用绝对路径）
                    if (p.path) {
                        await invoke('remove_item', { path: p.path });
                        // 3. 重新加载磁盘清单，确保 UI 刷新
                        await pluginManager.loadAll();
                        onUpdate();
                    } else {
                        alert("Error: Plugin path unknown.");
                    }
                } catch (err) {
                    console.error("Delete error:", err);
                    alert("Delete failed: " + err);
                }
            }
        };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
            <div style={{ padding: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.7 }}>
                    {t('Extensions')}
                </div>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder={t('SearchExtensions')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-color)',
                            color: '#fff',
                            padding: '4px 8px 4px 28px',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '7px', opacity: 0.5 }} />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6 }}>
                    {t('Installed')} ({filteredPlugins.length})
                </div>

                {filteredPlugins.map((p: any) => (
                    <div key={p.id} style={{ 
                        display: 'flex', padding: '12px 10px', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        opacity: p.enabled ? 1 : 0.5, transition: 'all 0.2s'
                    }} className="file-item-hover">
                                                <div style={{ 
                                                    width: '42px', height: '42px', 
                                                    backgroundColor: p.enabled ? 'var(--accent-color)' : '#444', 
                                                    borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                                                }}>
                                                    {/* 支持 manifest 定义的图标 */}
                                                    {p.icon ? (
                                                        <DynamicIcon icon={p.icon} size={24} />
                                                    ) : (
                                                        <Puzzle size={24} color="#fff" />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: p.enabled ? 'var(--accent-color)' : '#aaa' }}>{p.name}</div>
                                                            {p.isBuiltin && (
                                                                <span style={{ fontSize: '9px', backgroundColor: 'rgba(122, 162, 247, 0.2)', color: 'var(--accent-color)', padding: '1px 4px', borderRadius: '2px', border: '1px solid rgba(122, 162, 247, 0.3)' }}>
                                                                    Built-in
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '11px', opacity: 0.5 }}>v{p.version}</div>
                                                    </div>                            <div style={{ fontSize: '12px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0' }}>
                                {p.description || 'No description provided.'}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                <div style={{ fontSize: '11px', opacity: 0.5 }}>{p.author || 'Zyma'}</div>
                                                                    <div style={{ display: 'flex', gap: '14px' }}>
                                                                        <button onClick={(e) => handleToggle(e, p)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
                                                                            {p.enabled ? <Ban size={15} /> : <Play size={15} />}
                                                                        </button>
                                                                        {!p.isBuiltin && (
                                                                            <button onClick={(e) => handleDelete(e, p)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
                                                                                <Trash2 size={15} />
                                                                            </button>
                                                                        )}
                                                                    </div>                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '10px', borderTop: '1px solid var(--border-color)' }}>
                <button 
                    onMouseDown={() => commands.executeCommand('dev.createTemplate')}
                    style={{ 
                        width: '100%', padding: '10px', backgroundColor: 'var(--accent-color)', border: 'none', color: '#fff', 
                        borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <PlusCircle size={16} />
                    {t('NewFile')}
                </button>
            </div>
        </div>
    );
};

export default PluginsPanel;