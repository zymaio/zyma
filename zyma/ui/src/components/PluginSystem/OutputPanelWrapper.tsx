import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import OutputPanel from './OutputPanel';

const OutputPanelWrapper: React.FC = () => {
    const [channels, setChannels] = useState<string[]>([]);
    const [activeChannel, setActiveChannel] = useState<string | undefined>(undefined);

    const refreshChannels = async () => {
        try {
            const res = await invoke<string[]>('output_list_channels');
            setChannels(res || []);
        } catch (e) {}
    };

    useEffect(() => {
        refreshChannels();
        
        // 监听新信道创建事件
        const unlistenCreated = listen<string>("output_channel_created", (e) => {
            setChannels(prev => prev.includes(e.payload) ? prev : [...prev, e.payload]);
        });

        // 监听强制打开并切换信道事件
        const unlistenOpen = listen<string>("open-output-panel", (e) => {
            if (e.payload) {
                setActiveChannel(e.payload);
            }
        });

        return () => { 
            unlistenCreated.then(f => f()); 
            unlistenOpen.then(f => f());
        };
    }, []);

    return <OutputPanel channels={channels} forcedChannel={activeChannel} hideHeader={false} />;
};

export default OutputPanelWrapper;
