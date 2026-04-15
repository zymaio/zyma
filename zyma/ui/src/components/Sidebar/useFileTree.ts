import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { FileItemData } from './components/FileTreeItem';

export function useFileTree(rootPath: string) {
    const [rootFiles, setRootFiles] = useState<FileItemData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadRoot = useCallback(async (path: string) => {
        setIsLoading(true);
        try {
            const items = await invoke<FileItemData[]>('read_dir', { path });
            setRootFiles(items);
        } catch (error) {
            console.error('Failed to load directory:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 初始加载
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            setIsLoading(true);
            try {
                const items = await invoke<FileItemData[]>('read_dir', { path: rootPath });
                if (isMounted) setRootFiles(items);
            } catch (error) { 
                if (isMounted) setRootFiles([]); 
            } finally { 
                if (isMounted) setIsLoading(false); 
            }
        };
        load();
        return () => { isMounted = false; };
    }, [rootPath]);

    // 监听文件系统事件
    useEffect(() => {
        let unlisten: (() => void) | null = null;
        const setupListener = async () => {
            unlisten = await listen('fs_event', (event: any) => {
                const payload = event.payload;
                if (payload.kind === 'Create' || payload.kind === 'Remove') {
                    loadRoot(rootPath);
                }
            });
        };
        setupListener();
        return () => { if (unlisten) unlisten(); };
    }, [rootPath, loadRoot]);

    return { rootFiles, isLoading, loadRoot, setRootFiles };
}
