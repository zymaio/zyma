import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { pathUtils } from '../utils/pathUtils';

interface SessionManagementProps {
    ready: boolean;
    rootPath: string;
    setRootPath: (path: string) => void;
    fm: any;
    appInit: any;
}

export function useSessionManagement({
    ready,
    rootPath,
    setRootPath,
    fm,
    appInit
}: SessionManagementProps) {
    // --- 逻辑：恢复上次会话 ---
    const restoreSession = useCallback(async () => {
        const settings = appInit.settings;
        if (settings?.session) {
            const { root_path: savedRoot, open_files, active_file } = settings.session;
            
            // 1. 恢复工作区
            // 如果当前没有设置有效根目录，则从会话恢复
            let targetRoot = rootPath;
            if ((targetRoot === "." || targetRoot === "./") && savedRoot && savedRoot !== ".") {
                targetRoot = savedRoot;
                setRootPath(savedRoot);
            }

            if (!targetRoot || targetRoot === "." || targetRoot === "./") return;

            const normRoot = pathUtils.normalize(targetRoot);
            const normRootWithSlash = normRoot.endsWith('/') ? normRoot : normRoot + '/';

            // 2. 恢复打开的文件 (增强：仅恢复属于当前工作区的文件)
            if (open_files && open_files.length > 0) {
                // 按顺序恢复，避免 Tab 顺序混乱
                for (const path of open_files) {
                    const normPath = pathUtils.normalize(path);
                    // 校验：文件路径必须在根路径之下
                    if (normPath === normRoot || normPath.startsWith(normRootWithSlash)) {
                        const name = pathUtils.getFileName(path);
                        await fm.handleFileSelect(path, name);
                    }
                }
            }

            // 3. 恢复活动文件 (同样需要校验)
            if (active_file) {
                const normActive = pathUtils.normalize(active_file);
                if (normActive === normRoot || normActive.startsWith(normRootWithSlash)) {
                    fm.setActiveFilePath(active_file);
                }
            }
        }
    }, [appInit.settings, fm, rootPath, setRootPath]);

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
