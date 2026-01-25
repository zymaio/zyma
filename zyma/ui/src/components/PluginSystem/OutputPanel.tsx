import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Trash2, X, ExternalLink, Copy, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';

interface OutputLine {
    content: string;
    timestamp: u64;
}

interface OutputPanelProps {
    channels: string[];
    onClose?: () => void;
    hideHeader?: boolean;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ channels, onClose, hideHeader }) => {
    const { t } = useTranslation();
    const [selectedChannel, setSelectedChannel] = useState(channels[0] || "");
    const [lines, setLines] = useState<OutputLine[]>([]);
    const [isCopied, setIsCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedChannel) return;

        // 1. 获取历史内容
        invoke<OutputLine[]>('output_get_content', { channel: selectedChannel })
            .then(setLines);

        // 2. 监听实时内容
        const unlisten = listen<OutputLine>(`output-${selectedChannel}`, (event) => {
            setLines(prev => [...prev.slice(-999), event.payload]); 
        });

        return () => { 
            unlisten.then(f => f()); 
            // 卸载时（如果是独立窗口）保存状态
            if (hideHeader) {
                invoke('save_window_state').catch(() => {});
            }
        };
    }, [selectedChannel, hideHeader]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    const handleClear = async () => {
        await invoke('output_clear', { channel: selectedChannel });
        setLines([]);
    };

    const handleCopyAll = () => {
        const fullText = lines.map(l => l.content).join('\n');
        navigator.clipboard.writeText(fullText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handlePopOut = async () => {
        await invoke('open_detached_output', { channel: selectedChannel });
        if (onClose) onClose(); 
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-sidebar)' }}>
            {!hideHeader && (
                <div style={{ 
                    padding: '10px 15px', borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                        <Monitor size={14} /> 
                        <select 
                            value={selectedChannel} 
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            style={{ background: 'none', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer' }}
                        >
                            {channels.map(c => <option key={c} value={c} style={{ backgroundColor: 'var(--bg-dropdown)' }}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {isCopied ? (
                            <Check size={14} style={{ color: '#4caf50' }} title={t('CopySuccess')} />
                        ) : (
                            <Copy size={14} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={handleCopyAll} title={t('CopyOutput')} />
                        )}
                        <Trash2 size={14} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={handleClear} title={t('ClearOutput')} />
                        {onClose && <X size={16} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={onClose} title={t('Close')} />}
                    </div>
                </div>
            )}
            <div 
                ref={scrollRef}
                style={{ 
                    flex: 1, overflowY: 'auto', padding: '12px', 
                    fontFamily: 'var(--ui-font-family, inherit)', 
                    fontSize: 'var(--ui-font-size)',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    userSelect: 'text',
                    WebkitUserSelect: 'text'
                }}
            >
                {lines.map((line, i) => {
                    const text = line.content;
                    let color = 'var(--text-primary)';
                    let fontWeight = 'normal';

                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('[error]') || lowerText.includes('[fatal]') || lowerText.includes('failed')) {
                        color = '#f44336'; 
                        fontWeight = 'bold';
                    } else if (lowerText.includes('[warning]') || lowerText.includes('warn')) {
                        color = '#ff9800'; 
                    } else if (lowerText.includes('[success]') || lowerText.includes('[done]') || lowerText.includes('成功')) {
                        color = '#4caf50'; 
                    } else if (lowerText.includes('[info]') || lowerText.includes('[system]') || lowerText.includes('[restore]')) {
                        color = '#2196f3'; 
                    }

                    return (
                        <div key={i} style={{ 
                            marginBottom: '4px', 
                            color: color, 
                            fontWeight: fontWeight,
                            opacity: color === 'var(--text-primary)' ? 0.8 : 1 
                        }}>
                            {text}
                        </div>
                    );
                })}
                {lines.length === 0 && <div style={{ opacity: 0.3, textAlign: 'center', marginTop: '20px', fontSize: 'var(--ui-font-size)' }}>{t('NoOutput')}</div>}
            </div>
        </div>
    );
};

export default OutputPanel;