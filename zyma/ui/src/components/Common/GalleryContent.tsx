import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DynamicIcon } from './DynamicIcon';
import { listen } from '@tauri-apps/api/event';

export const GalleryContent: React.FC<{ title?: string, items: any[] }> = ({ title, items }) => {
    const [activePlatformId, setActivePlatformId] = useState<string | null>(null);

    const refreshActivePlatform = async () => {
        try {
            const active = await invoke<any>('shovx_get_active_platform');
            setActivePlatformId(active?.id || null);
        } catch (e) {
            console.warn("Failed to get active platform:", e);
        }
    };

    useEffect(() => {
        refreshActivePlatform();
        
        // 监听工作区变化，自动刷新激活状态
        const unlisten = listen('workspace_changed', () => {
            refreshActivePlatform();
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const handleAction = async (p: any) => {
        try {
            if (activePlatformId === p.id) {
                // 如果已激活，执行取消绑定逻辑 (需要后端支持或模拟)
                // 这里我们假设传一个空的或者特定的指令来移除
                await invoke('shovx_bind_platform', { platform: null });
            } else {
                await invoke('shovx_bind_platform', { platform: p });
            }
            await refreshActivePlatform();
        } catch (e) {
            alert("操作失败: " + e);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {title && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div className="welcome-title-icon" style={{ color: 'var(--accent-color)' }}>
                        <DynamicIcon icon="Plus" size={18} />
                    </div>
                    <h2 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0 }}>{title}</h2>
                </div>
            )}
            <div className="gallery-grid">
                {items?.map((p: any) => {
                    const isActive = activePlatformId === p.id;
                    return (
                        <div 
                            key={p.id}
                            onClick={() => handleAction(p)}
                            className="gallery-card file-item-hover"
                            style={{
                                border: isActive ? '1px solid var(--status-success)' : '1px solid var(--border-color)',
                                opacity: isActive ? 1 : 0.9
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="gallery-card-icon">
                                    <DynamicIcon icon={p.icon || 'Layout'} size={24} style={{ color: isActive ? 'var(--status-success)' : 'var(--accent-color)' }} />
                                </div>
                                {isActive ? (
                                    <div style={{ padding: '2px 8px', backgroundColor: 'var(--status-success)', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase' }}>
                                        ACTIVE
                                    </div>
                                ) : (
                                    p.provider && (
                                        <div style={{ padding: '2px 8px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px', fontSize: '0.7em', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {p.provider}
                                        </div>
                                    )
                                )}
                            </div>
                            <h3 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '0 0 4px 0' }}>{p.name}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', lineHeight: '1.5', margin: '0 0 16px 0', opacity: 0.8 }}>{p.description}</p>
                            
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                color: isActive ? 'var(--text-muted)' : 'var(--accent-color)', 
                                fontWeight: 'bold', 
                                fontSize: '12px' 
                            }}>
                                {isActive ? (
                                    <>
                                        <DynamicIcon icon="Check" size={14} style={{ marginRight: '4px' }} />
                                        <span>点击取消激活</span>
                                    </>
                                ) : (
                                    <>
                                        <span>立即激活</span>
                                        <DynamicIcon icon="ArrowRight" size={14} style={{ marginLeft: '4px' }} />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
