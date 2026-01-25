import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Trash2, X, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

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
    const [selectedChannel, setSelectedChannel] = useState(channels[0] || "");
    const [lines, setLines] = useState<OutputLine[]>([]);
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

        return () => { unlisten.then(f => f()); };
    }, [selectedChannel]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    const handleClear = async () => {
        await invoke('output_clear', { channel: selectedChannel });
        setLines([]);
    };

    const handlePopOut = async () => {
        await invoke('open_detached_output', { channel: selectedChannel });
        if (onClose) onClose(); // 弹出后关闭当前在主界面的面板
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
                                        <Trash2 size={14} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={handleClear} title="清空日志" />
                                        {onClose && <X size={16} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={onClose} title="关闭面板" />}
                                    </div>                </div>
            )}
            <div 
                ref={scrollRef}
                style={{ 
                    flex: 1, overflowY: 'auto', padding: '12px', 
                    fontFamily: 'var(--ui-font-family, inherit)', 
                    fontSize: 'var(--ui-font-size)',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all' 
                }}
            >
                {lines.map((line, i) => {
                    const text = line.content;
                    let color = 'var(--text-primary)';
                    let fontWeight = 'normal';

                    // 简单的染色引擎逻辑
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('[error]') || lowerText.includes('[fatal]') || lowerText.includes('failed')) {
                        color = '#f44336'; // 红色
                        fontWeight = 'bold';
                    } else if (lowerText.includes('[warning]') || lowerText.includes('warn')) {
                        color = '#ff9800'; // 橙色
                    } else if (lowerText.includes('[success]') || lowerText.includes('[done]') || lowerText.includes('成功')) {
                        color = '#4caf50'; // 绿色
                    } else if (lowerText.includes('[info]') || lowerText.includes('[system]') || lowerText.includes('[restore]')) {
                        color = '#2196f3'; // 蓝色
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
                {lines.length === 0 && <div style={{ opacity: 0.3, textAlign: 'center', marginTop: '20px', fontSize: 'var(--ui-font-size)' }}>无输出内容</div>}
            </div>
        </div>
    );
};

export default OutputPanel;
