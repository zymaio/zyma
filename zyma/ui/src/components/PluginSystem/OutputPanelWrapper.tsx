import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import OutputPanel from './OutputPanel';

const OutputPanelWrapper: React.FC = () => {
    const [channels, setChannels] = useState<string[]>([]);

    const refreshChannels = async () => {
        try {
            const res = await invoke<string[]>('output_list_channels');
            setChannels(res || []);
        } catch (e) {}
    };

    useEffect(() => {
        refreshChannels();
        
        // 监听新信道创建事件
        const unlisten = listen<string>("output_channel_created", (e) => {
            setChannels(prev => prev.includes(e.payload) ? prev : [...prev, e.payload]);
        });

        return () => { unlisten.then(f => f()); };
    }, []);

    return <OutputPanel channels={channels} hideHeader={false} />;
};

export default OutputPanelWrapper;
