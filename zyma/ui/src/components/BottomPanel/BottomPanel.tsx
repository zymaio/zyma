import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { slotRegistry } from '../../core/SlotRegistry';

interface BottomPanelProps {
    height: number;
    isVisible: boolean;
    onClose: () => void;
    onDetach: (tabId: string) => void;
    startResizing: () => void;
}

const BottomPanel: React.FC<BottomPanelProps> = ({ 
    height, isVisible, onClose, onDetach, startResizing 
}) => {
    const contributions = slotRegistry.getContributedComponents('BOTTOM_PANEL');
    const [activeTab, setActiveTab] = useState<string>(contributions[0]?.id || "");

    if (!isVisible || contributions.length === 0) return null;

    // 如果当前选中的 tab 不在贡献列表中（可能插件被禁用了），重置为第一个
    if (activeTab && !contributions.find(c => c.id === activeTab)) {
        setActiveTab(contributions[0]?.id || "");
    }

    return (
        <div style={{ 
            height: `${height}px`, 
            display: 'flex', 
            flexDirection: 'column',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-main)',
            position: 'relative'
        }}>
            {/* Resize Handle */}
            <div 
                onMouseDown={startResizing}
                style={{ 
                    position: 'absolute', top: '-3px', left: 0, right: 0, height: '6px', 
                    cursor: 'row-resize', zIndex: 100 
                }}
                className="resize-handle"
            />

            {/* Header / Tabs */}
            <div style={{ 
                height: '35px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0 10px',
                backgroundColor: 'var(--bg-tabs)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', gap: '20px', height: '100%', alignItems: 'center' }}>
                    {contributions.map(c => (
                        <div 
                            key={c.id}
                            onClick={() => setActiveTab(c.id)}
                            style={{ 
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                opacity: activeTab === c.id ? 1 : 0.5,
                                color: activeTab === c.id ? 'var(--accent-color)' : 'inherit',
                                borderBottom: activeTab === c.id ? '2px solid var(--accent-color)' : 'none',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {c.id}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span 
                        onClick={() => onDetach(activeTab)} 
                        title="弹出独立窗口" 
                        style={{ cursor: 'pointer', opacity: 0.6 }}
                        className="icon-btn"
                    >
                        <ExternalLink size={14} />
                    </span>
                    <span 
                        onClick={onClose} 
                        style={{ cursor: 'pointer', opacity: 0.6 }}
                        className="icon-btn"
                    >
                        <X size={16} />
                    </span>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {contributions.map(c => {
                    const Content = c.component;
                    return (
                        <div 
                            key={c.id} 
                            style={{ display: activeTab === c.id ? 'block' : 'none', height: '100%' }}
                        >
                            {typeof Content === 'function' ? <Content /> : Content}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomPanel;
