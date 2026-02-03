import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { views } from '../components/ViewSystem/ViewRegistry';
import { statusBar as statusBarRegistry } from '../components/StatusBar/StatusBarRegistry';
import { pathUtils } from '../utils/pathUtils';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { useSessionManagement } from './useSessionManagement';
import { useUIState } from './useUIState';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
    'rs': 'Rust', 'js': 'JavaScript', 'ts': 'TypeScript', 'tsx': 'TypeScript', 
    'jsx': 'JavaScript', 'py': 'Python', 'md': 'Markdown', 'html': 'HTML',
    'css': 'CSS', 'json': 'JSON', 'xml': 'XML', 'svg': 'SVG', 'cpp': 'C++', 'toml': 'TOML'
};

interface WorkbenchLogicProps {
    fm: any;
    tabSystem: any;
    appInit: {
        ready: boolean;
        setSettings?: (s: AppSettings) => void;
        [key: string]: any;
    };
}

export interface WorkbenchLogic extends ReturnType<typeof useUIState> {
    rootPath: string;
    setRootPath: (path: string) => void;
    sidebarTab: string;
    setSidebarTab: (id: string) => void;
    relativePath: string;
    getLanguageMode: () => string;
    forceUpdate: (n: any) => void;
}

export function useWorkbenchLogic({ fm, tabSystem, appInit }: WorkbenchLogicProps): WorkbenchLogic {
    const { t } = useTranslation();
    const ready = appInit?.ready;

    const [rootPath, setRootPath] = useState<string>(".");
    const [sidebarTab, setSidebarTab] = useState<string>('explorer');
    const uiState = useUIState();
    const [, forceUpdate] = useState(0);

    // 1. 核心：监听工作区切换事件 (使用 Ref 确保清理彻底)
    useEffect(() => {
        let unlistenFn: (() => void) | null = null;
        let isMounted = true;
        
        const setup = async () => {
            const un = await listen<string>('workspace_changed', async (event) => {
                if (!isMounted) return;
                const newPath = event.payload;
                console.log("[Logic] Workspace changed to:", newPath);
                
                setRootPath(newPath);
                if (fm.setOpenFiles) fm.setOpenFiles([]);
                if (fm.setActiveFilePath) fm.setActiveFilePath(null);
                if (tabSystem.setActiveTabId) tabSystem.setActiveTabId(null);

                if (appInit.setSettings) {
                    const latest = await invoke<AppSettings>('load_settings');
                    appInit.setSettings(latest);
                }
            });

            if (isMounted) {
                unlistenFn = un;
            } else {
                un();
            }
        };

        setup();
        return () => { 
            isMounted = false;
            if (unlistenFn) unlistenFn(); 
        };
    }, []); 

    // 2. 启动时同步
    useEffect(() => {
        if (ready) {
            invoke<string>('get_cwd').then(cwd => {
                if (cwd && cwd !== '.' && cwd !== './') setRootPath(cwd);
            });
        }
    }, [ready]);

    // 3. 开启 Watcher
    useEffect(() => {
        if (ready && rootPath && rootPath !== '.') {
            invoke('fs_watch', { path: rootPath }).catch(console.warn);
        }
    }, [ready, rootPath]);

    // 使用会话管理
    useSessionManagement({ ready, rootPath, setRootPath, fm, appInit });

    useEffect(() => {
        const unsubViews = views.subscribe(() => forceUpdate(n => n + 1));
        const unsubStatus = statusBarRegistry.subscribe(() => forceUpdate(n => n + 1));
        return () => { unsubViews(); unsubStatus(); };
    }, []);

    const relativePath = useMemo(() => {
        const activeTab = tabSystem.activeTab;
        if (activeTab?.type !== 'file') return t('NoFile');
        const activeFile = fm.openFiles.find((f: any) => f.id === activeTab.id);
        if (!activeFile) return t('NoFile');
        const path = activeFile.path || activeFile.name;
        const normRoot = pathUtils.toForwardSlashes(rootPath);
        return path.startsWith(normRoot) ? path.replace(normRoot, '').replace(/^[\/]/, '') : path;
    }, [tabSystem.activeTab, fm.openFiles, rootPath, t]);

    const getLanguageMode = useCallback(() => {
        const activeTab = tabSystem.activeTab;
        if (activeTab?.type !== 'file') return '';
        const activeFile = fm.openFiles.find((f: any) => f.id === activeTab.id);
        if (!activeFile) return '';
        const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';
        return t(LANGUAGE_EXTENSION_MAP[ext] || 'Plaintext');
    }, [tabSystem.activeTab, fm.openFiles, t]);

    return {
        ...uiState,
        rootPath, setRootPath, sidebarTab, setSidebarTab,
        relativePath, getLanguageMode, forceUpdate
    };
}