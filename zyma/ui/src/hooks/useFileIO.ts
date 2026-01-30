import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';

// Force refresh 1
export function useFileIO(loadRoot?: (path: string) => void, onFileDelete?: (path: string) => void) {
    const { t } = useTranslation();

    const readFile = useCallback((path: string) => invoke<string>('read_file', { path }), []);
    
    const writeFile = useCallback((path: string, content: string) => invoke<void>('write_file', { path, content }), []);

    const handleCreate = useCallback(async (targetPath: string, type: 'file' | 'dir', rootPath: string) => {
        const name = prompt(t('EnterName', { type }));
        if (!name) return;
        const path = `${targetPath}/${name}`;
        try {
            if (type === 'file') await invoke('create_file', { path });
            else await invoke('create_dir', { path });
            if (loadRoot) loadRoot(rootPath);
        } catch (e) { alert(e); }
    }, [t, loadRoot]);

    const handleRename = useCallback(async (oldPath: string, oldName: string, rootPath: string) => {
        const newName = prompt(t('EnterName', { type: 'New' }), oldName);
        if (!newName || newName === oldName) return;
        
        const lastSlashIndex = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'));
        const parentPath = lastSlashIndex > -1 ? oldPath.substring(0, lastSlashIndex) : '.';
        const separator = lastSlashIndex > -1 ? oldPath[lastSlashIndex] : '/';
        const newPath = parentPath === '.' ? newName : `${parentPath}${separator}${newName}`;
        
        try {
            await invoke('rename_item', { at: oldPath, to: newPath });
            if (loadRoot) loadRoot(rootPath);
        } catch (e) { alert(e); }
    }, [t, loadRoot]);

    const handleDelete = useCallback(async (path: string, name: string, rootPath: string) => {
        const confirmed = await ask(t('ConfirmDelete', { name }), { title: t('File'), kind: 'warning' });
        if (confirmed) {
            try {
                await invoke('remove_item', { path });
                if (onFileDelete) onFileDelete(path);
                if (loadRoot) loadRoot(rootPath);
            } catch (e) { alert(e); }
        }
    }, [t, loadRoot, onFileDelete]);

    return {
        readFile,
        writeFile,
        handleCreate,
        handleRename,
        handleDelete
    };
}
