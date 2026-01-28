import { commands } from '../components/CommandSystem/CommandRegistry';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export function registerWorkspaceCommands(t: any, handlers: any) {
    commands.registerCommand({
        id: 'workspace.openFolder',
        title: t('OpenFolder'),
        category: 'Workspace',
        callback: async () => {
            const sel = await open({ directory: true });
            if (sel) {
                const newPath = sel as string;
                handlers.setRootPath(newPath);
                handlers.fm.setOpenFiles([]);
                handlers.fm.setActiveFilePath(null);
                handlers.setActiveTabId(null);
                await invoke('fs_set_cwd', { path: newPath });
            }
        }
    });
}
