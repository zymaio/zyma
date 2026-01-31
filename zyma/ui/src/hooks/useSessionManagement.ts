import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { pathUtils } from '../utils/pathUtils';

interface SessionManagementProps {
    ready: boolean;
    rootPath: string;
    setRootPath: (path: string) => void;
    fm: any;
    tabSystem: any;
    appInit: any;
}

export function useSessionManagement({
    ready,
    rootPath,
    setRootPath,
    fm,
    tabSystem,
    appInit
}: SessionManagementProps) {
    const { setActiveTabId } = tabSystem;

    // --- 逻辑：恢复上次会话 ---
    const restoreSession = useCallback(async () => {
        const settings = appInit.settings;
        if (settings?.session) {
            const { root_path, open_files, active_file } = settings.session;
            
            // 1. 恢复工作区
            if (root_path && root_path !== '.') {
                setRootPath(root_path);
            }

            // 2. 恢复打开的文件
            if (open_files && open_files.length > 0) {
                // 按顺序恢复，避免 Tab 顺序混乱
                for (const path of open_files) {
                    const name = pathUtils.getFileName(path);
                    await fm.handleFileSelect(path, name);
                }
            }

            // 3. 恢复活动文件
            if (active_file) {
                fm.setActiveFilePath(active_file);
            }
        }
    }, [appInit.settings, fm, setRootPath]);

    // --- 生命周期：初始化恢复 ---
    useEffect(() => {
        if (ready) {
            restoreSession();
        }
    }, [ready]); // 仅在准备就绪时执行一次

    // --- 生命周期：自动保存 (Debounced) ---
    useEffect(() => {
        if (!ready) return;

        const timer = setTimeout(async () => {
            try {
                const currentSettings = await invoke<any>('load_settings');
                const openFilePaths = fm.openFiles.map((f: any) => f.path).filter(Boolean);
                
                await invoke('save_settings', {
                    settings: {
                        ...currentSettings,
                        session: {
                            root_path: rootPath,
                            open_files: openFilePaths,
                            active_file: fm.activeFilePath
                        }
                    }
                });
            } catch (e) {
                console.warn("[Session] Auto-save failed:", e);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [rootPath, fm.openFiles.length, fm.activeFilePath, ready]);

    return {
        restoreSession
    };
}
