import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';

/**
 * 封装底层文件 IO 操作
 */
export function useFileIO() {
    const readFile = useCallback(async (path: string) => {
        return await invoke<string>('read_file', { path });
    }, []);

    const writeFile = useCallback(async (path: string, content: string) => {
        return await invoke<void>('write_file', { path, content });
    }, []);

    const deleteFile = useCallback(async (path: string) => {
        return await invoke<void>('remove_item', { path });
    }, []);

    const renameFile = useCallback(async (oldPath: string, newPath: string) => {
        return await invoke<void>('rename_item', { oldPath, newPath });
    }, []);

    return { readFile, writeFile, deleteFile, renameFile };
}
