import { commands } from '../components/CommandSystem/CommandRegistry';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export function registerWorkspaceCommands(t: any, handlers: any) {
    commands.registerCommand({
        id: 'workspace.openFolder',
        title: t('OpenFolder'),
        category: 'Workspace',
        callback: async () => {
            try {
                const sel = await open({ directory: true });
                if (sel) {
                    const newPath = sel as string;
                    console.log("[Workspace] Switching to:", newPath);
                    
                    // 1. 立即清理 UI 状态 (优化体验，防止闪烁)
                    handlers.fm.setOpenFiles([]);
                    handlers.fm.setActiveFilePath(null);
                    handlers.setActiveTabId(null);

                    // 2. Event-Driven: 仅通知后端切换
                    try {
                        await invoke('fs_set_cwd', { path: newPath });
                    } catch (e) {
                        console.error("[Workspace] Failed to set backend CWD:", e);
                    }
                }
            } catch (e) {
                console.error("[Workspace] Dialog Error:", e);
            }
        }
    });
}
