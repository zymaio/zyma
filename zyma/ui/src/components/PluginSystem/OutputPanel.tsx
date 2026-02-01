import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Monitor, Trash2, X, Copy, Check, ZoomIn, ZoomOut, ArrowDown } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';

interface OutputLine {
    content: string;
    timestamp: number;
}

interface OutputPanelProps {
    channels: string[];
    onClose?: () => void;
    hideHeader?: boolean;
    forcedChannel?: string;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ channels, onClose, hideHeader, forcedChannel }) => {
    const { t } = useTranslation();
    const [selectedChannel, setSelectedChannel] = useState(forcedChannel || channels[0] || "");
    const [lines, setLines] = useState<OutputLine[]>([]);

    // 响应外部强制切换频道
    useEffect(() => {
        if (forcedChannel && forcedChannel !== selectedChannel) {
            setSelectedChannel(forcedChannel);
        }
    }, [forcedChannel]);
    const [isCopied, setIsCopied] = useState(false);
    const [localFontSize, setLocalFontSize] = useState(13);
    const [atBottom, setAtBottom] = useState(true);
    
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const bufferRef = useRef<OutputLine[]>([]);
    const updateTimerRef = useRef<any>(null);

    // 加载初始内容
    useEffect(() => {
        if (!selectedChannel) return;
        invoke<OutputLine[]>('output_get_content', { channel: selectedChannel })
            .then(setLines);
    }, [selectedChannel]);

    // 监听实时更新（带节流）
    useEffect(() => {
        if (!selectedChannel) return;

        const unlisten = listen<OutputLine>(`output_${selectedChannel}`, (event) => {
            bufferRef.current.push(event.payload);
            
            if (!updateTimerRef.current) {
                updateTimerRef.current = setTimeout(() => {
                    setLines(prev => [...prev, ...bufferRef.current].slice(-2000));
                    bufferRef.current = [];
                    updateTimerRef.current = null;
                }, 100); // 100ms 批量更新一次
            }
        });

        return () => { 
            unlisten.then(f => f()); 
            if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
            bufferRef.current = [];
        };
    }, [selectedChannel]);

    // 自动滚动到底部
    useEffect(() => {
        if (atBottom && lines.length > 0) {
            virtuosoRef.current?.scrollToIndex({ index: lines.length - 1, behavior: 'auto' });
        }
    }, [lines, atBottom]);

    const handleClear = async () => {
        await invoke('output_clear', { channel: selectedChannel });
        setLines([]);
    };

    const handleCopyAll = () => {
        const fullText = lines.map(l => l.content).join('');
        navigator.clipboard.writeText(fullText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const renderLine = useCallback((index: number, line: OutputLine) => {
        const text = line.content;
        let color = 'var(--text-primary)';
        let fontWeight = 'normal';

        const lowerText = text.toLowerCase();
        if (lowerText.includes('[error]') || lowerText.includes('[fatal]') || lowerText.includes('failed')) {
            color = 'var(--status-error)'; 
            fontWeight = 'bold';
        } else if (lowerText.includes('[warning]') || lowerText.includes('warn')) {
            color = 'var(--status-warning)'; 
        } else if (lowerText.includes('[success]') || lowerText.includes('[done]') || lowerText.includes('成功')) {
            color = 'var(--status-success)'; 
        } else if (lowerText.includes('[info]') || lowerText.includes('[system]') || lowerText.includes('[restore]')) {
            color = 'var(--status-info)'; 
        }

        return (
            <div style={{ 
                padding: '1px 12px',
                color: color, 
                fontWeight: fontWeight as any,
                opacity: color === 'var(--text-primary)' ? 0.8 : 1,
                fontSize: `${localFontSize}px`,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all'
            }}>
                {text}
            </div>
        );
    }, [localFontSize]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-editor)' }}>
            {!hideHeader && (
                <div style={{ 
                    padding: '8px 15px', borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-tabs)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--ui-font-size)', fontWeight: 'bold' }}>
                        <Monitor size={14} style={{ color: 'var(--text-secondary)' }} /> 
                        <select 
                            value={selectedChannel} 
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            style={{ 
                                background: 'transparent', color: 'var(--text-primary)', 
                                border: 'none', outline: 'none', cursor: 'pointer',
                                fontSize: 'inherit', fontWeight: 'inherit'
                            }}
                        >
                            {channels.map(c => <option key={c} value={c} style={{ backgroundColor: 'var(--bg-dropdown)', color: 'var(--text-primary)' }}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid var(--border-color)', paddingRight: '15px' }}>
                            <span onClick={() => setLocalFontSize(prev => Math.max(10, prev - 1))} title="缩小" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} className="icon-btn">
                                <ZoomOut size={14} />
                            </span>
                            <span style={{ fontSize: '11px', minWidth: '25px', textAlign: 'center', opacity: 0.7 }}>{localFontSize}px</span>
                            <span onClick={() => setLocalFontSize(prev => Math.min(30, prev + 1))} title="放大" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} className="icon-btn">
                                <ZoomIn size={14} />
                            </span>
                        </div>
                        {isCopied ? (
                            <span title={t('CopySuccess')} style={{ display: 'flex', alignItems: 'center' }}><Check size={14} style={{ color: 'var(--status-success)' }} /></span>
                        ) : (
                            <span title={t('CopyOutput')} onClick={handleCopyAll} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} className="icon-btn">
                                <Copy size={14} />
                            </span>
                        )}
                        <span title={t('ClearOutput')} onClick={handleClear} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} className="icon-btn">
                            <Trash2 size={14} />
                        </span>
                        {onClose && (
                            <span title={t('Close')} onClick={onClose} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} className="icon-btn">
                                <X size={16} />
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            <div style={{ flex: 1, position: 'relative' }}>
                <Virtuoso
                    ref={virtuosoRef}
                    data={lines}
                    atBottomStateChange={setAtBottom}
                    initialTopMostItemIndex={lines.length > 0 ? lines.length - 1 : 0}
                    itemContent={renderLine}
                    followOutput="auto"
                    style={{ height: '100%' }}
                />
                
                {!atBottom && lines.length > 0 && (
                    <div 
                        onClick={() => {
                            setAtBottom(true);
                            virtuosoRef.current?.scrollToIndex({ index: lines.length - 1, behavior: 'smooth' });
                        }}
                        style={{
                            position: 'absolute', bottom: '20px', right: '30px',
                            backgroundColor: 'var(--accent-color)', color: 'white',
                            borderRadius: '20px', padding: '5px 12px', fontSize: '11px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 10
                        }}
                    >
                        <ArrowDown size={12} /> {t('ScrollToBottom')}
                    </div>
                )}

                {lines.length === 0 && (
                    <div style={{ 
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        opacity: 0.3, textAlign: 'center', fontSize: 'var(--ui-font-size)' 
                    }}>
                        {t('NoOutput')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutputPanel;