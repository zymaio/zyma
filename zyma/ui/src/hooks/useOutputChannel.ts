import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface OutputLine {
    content: string;
    timestamp: number;
}

export function useOutputChannel(selectedChannel: string) {
    const [lines, setLines] = useState<OutputLine[]>([]);
    const bufferRef = useRef<OutputLine[]>([]);
    const updateTimerRef = useRef<any>(null);

    // 加载初始内容
    useEffect(() => {
        if (!selectedChannel) return;
        setLines([]);
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
                }, 100);
            }
        });

        return () => {
            unlisten.then(f => f());
            if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
            bufferRef.current = [];
        };
    }, [selectedChannel]);

    const handleClear = useCallback(async () => {
        await invoke('output_clear', { channel: selectedChannel });
        setLines([]);
    }, [selectedChannel]);

    const handleCopyAll = useCallback(async () => {
        const fullText = lines.map(l => l.content).join('');
        await navigator.clipboard.writeText(fullText);
    }, [lines]);

    return { lines, handleClear, handleCopyAll };
}
