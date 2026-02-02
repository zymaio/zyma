import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DynamicIcon } from './DynamicIcon';
import { listen } from '@tauri-apps/api/event';

interface GalleryItem {
    id: string;
    name: string;
    icon?: string;
    badge?: string;
    description?: string;
    // 通用属性列表，用于显示环境信息等
    properties?: { label: string, value: string }[];
    actionCommand: string;
    actionParams?: any;
}

interface GalleryContentProps {
    title?: string;
    items: GalleryItem[];
}

export const GalleryContent: React.FC<GalleryContentProps> = ({ title, items }) => {
    // 跟踪每个项目的激活状态 (通用逻辑：通过 active_id 判断)
    const [activeId, setActiveId] = useState<string | null>(null);

    const refreshStatus = async () => {
        try {
            // 这里调用一个通用的探测指令，或者由插件自己处理
            // 为保持底座纯净，我们假设插件会通过事件通知状态
            const active = await invoke<any>('shovx_get_active_platform');
            setActiveId(active?.id || null);
        } catch (e) {}
    };

    useEffect(() => {
        refreshStatus();
        const unlisten = listen('workspace_changed', refreshStatus);
        return () => { unlisten.then(f => f()); };
    }, []);

    const handleAction = async (item: GalleryItem) => {
        try {
            // 如果点击的是已激活项，则传 null 表示取消
            const payload = activeId === item.id ? null : item.actionParams || item;
            await invoke(item.actionCommand, { platform: payload });
            refreshStatus();
        } catch (e) { alert(e); }
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
                {items?.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                        <div 
                            key={item.id}
                            onClick={() => handleAction(item)}
                            className="gallery-card file-item-hover"
                            style={{
                                border: isActive ? '1px solid var(--status-success)' : '1px solid var(--border-color)',
                                opacity: isActive ? 1 : 0.9,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div className="gallery-card-icon">
                                    <DynamicIcon icon={item.icon || 'Layout'} size={24} style={{ color: isActive ? 'var(--status-success)' : 'var(--accent-color)' }} />
                                </div>
                                {(isActive || item.badge) && (
                                    <div style={{ 
                                        padding: '2px 8px', 
                                        backgroundColor: isActive ? 'var(--status-success)' : 'var(--bg-hover)', 
                                        borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', 
                                        color: isActive ? 'white' : 'var(--text-muted)', textTransform: 'uppercase' 
                                    }}>
                                        {isActive ? 'ACTIVE' : item.badge}
                                    </div>
                                )}
                            </div>
                            
                            <h3 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '0 0 12px 0' }}>{item.name}</h3>
                            
                            {/* 核心：通用的属性列表展示 */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                {item.properties?.map((prop, idx) => (
                                    <div key={idx} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                        <span style={{ fontWeight: 'bold', marginRight: '8px', whiteSpace: 'nowrap' }}>{prop.label}:</span>
                                        <span style={{ 
                                            fontFamily: 'monospace', opacity: 0.9, 
                                            overflow: 'hidden', textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left'
                                        }}>
                                            {prop.value}
                                        </span>
                                    </div>
                                ))}
                                {!item.properties && item.description && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', lineHeight: '1.5', margin: 0, opacity: 0.8 }}>
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                color: isActive ? 'var(--text-muted)' : 'var(--accent-color)', 
                                fontWeight: 'bold', 
                                fontSize: '12px',
                                marginTop: 'auto'
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
