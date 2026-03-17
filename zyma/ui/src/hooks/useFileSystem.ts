import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { UseFileStateReturn } from './useFileState';

export function useFileSystem(fileState: UseFileStateReturn) {
    const { t } = useTranslation();
    const { setOpenFiles } = fileState;

    const handleCreate = useCallback(async (targetPath: string, type: 'file' | 'dir', reload?: (path: string) => void, rootPath?: string, name?: string) => {
        const finalName = name || prompt(t('EnterName', { type }));
        if (!finalName) return;
        const path = `${targetPath}/${finalName}`;
        try {
            if (type === 'file') await invoke('create_file', { path });
            else await invoke('create_dir', { path });
            if (reload && rootPath) reload(rootPath);
        } catch (e) { toast.error(String(e)); }
    }, [t]);

    const handleRename = useCallback(async (oldPath: string, oldName: string, reload?: (path: string) => void, rootPath?: string, newName?: string) => {
        const finalNewName = newName || prompt(t('EnterName', { type: 'New' }), oldName);
        if (!finalNewName || finalNewName === oldName) return;
        const lastSlashIndex = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'));
        const parentPath = lastSlashIndex > -1 ? oldPath.substring(0, lastSlashIndex) : '.';
        const separator = lastSlashIndex > -1 ? oldPath[lastSlashIndex] : '/';
        const finalPath = parentPath === '.' ? finalNewName : `${parentPath}${separator}${finalNewName}`;
        try {
            await invoke('rename_item', { at: oldPath, to: finalPath });
            if (reload && rootPath) reload(rootPath);
        } catch (e) { toast.error(String(e)); }
    }, [t]);

    const handleDelete = useCallback(async (path: string, name: string, reload?: (path: string) => void, rootPath?: string) => {
        const confirmed = await ask(t('ConfirmDelete', { name }), { title: t('File'), kind: 'warning' });
        if (confirmed) {
            try {
                await invoke('remove_item', { path });
                setOpenFiles(prev => prev.filter(f => f.id !== path));
                if (reload && rootPath) reload(rootPath);
            } catch (e) { toast.error(String(e)); }
        }
    }, [t, setOpenFiles]);

    return { handleCreate, handleRename, handleDelete };
}
