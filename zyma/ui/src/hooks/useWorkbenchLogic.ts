import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { views } from '../components/ViewSystem/ViewRegistry';
import { statusBar as statusBarRegistry } from '../components/StatusBar/StatusBarRegistry';
import { pathUtils } from '../utils/pathUtils';
import { invoke } from '@tauri-apps/api/core';

import { registerWorkspaceCommands } from '../commands/workspace';
import { useSessionManagement } from './useSessionManagement';

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
    'rs': 'Rust', 'js': 'JavaScript', 'ts': 'TypeScript', 'tsx': 'TypeScript', 
    'jsx': 'JavaScript', 'py': 'Python', 'md': 'Markdown', 'html': 'HTML',
    'css': 'CSS', 'json': 'JSON', 'xml': 'XML', 'svg': 'SVG', 'cpp': 'C++', 'toml': 'TOML'
};

interface WorkbenchLogicProps {
    fm: any;
    tabSystem: any;
    appInit: any;
}

export function useWorkbenchLogic({ fm, tabSystem, appInit }: WorkbenchLogicProps) {
    const { t } = useTranslation();
    const { setActiveTabId } = tabSystem;
    const { ready } = appInit;

    const [rootPath, setRootPath] = useState<string>(".");
    const [sidebarTab, setSidebarTab] = useState<string>('explorer');

    // 使用拆分后的会话管理 Hook
    useSessionManagement({
        ready,
        rootPath,
        setRootPath,
        fm,
        tabSystem,
        appInit
    });

    const [showSettings, setShowSettings] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [aboutState, setAboutState] = useState({ show: false, autoCheck: false });
    const [showSidebar, setShowSidebar] = useState(true);
    const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
    const [, forceUpdate] = useState(0);

    // 订阅 Registry 变化
    useEffect(() => {
        const unsubViews = views.subscribe(() => forceUpdate(n => n + 1));
        const unsubStatus = statusBarRegistry.subscribe(() => forceUpdate(n => n + 1));
        return () => { unsubViews(); unsubStatus(); };
    }, []);

    // 注册核心命令 (Workspace 相关)
    useEffect(() => {
        if (!ready) return;
        
        registerWorkspaceCommands(t, {
            setRootPath,
            fm,
            setActiveTabId
        });
    }, [ready, t, fm, setActiveTabId]);

    // 开启后端文件监听
    useEffect(() => {
        if (!ready || !rootPath || rootPath === '.') return;

        const startWatching = async () => {
            try {
                await invoke('fs_watch', { path: rootPath });
                console.log("[Watcher] Started watching:", rootPath);
            } catch (e) {
                console.warn("[Watcher] Failed to start:", e);
            }
        };

        startWatching();
    }, [ready, rootPath]);

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
        rootPath, setRootPath,
        sidebarTab, setSidebarTab,
        showSettings, setShowSettings,
        showCommandPalette, setShowCommandPalette,
        showSearch, setShowSearch,
        aboutState, setAboutState,
        showSidebar, setShowSidebar,
        pendingCloseId, setPendingCloseId,
        relativePath, getLanguageMode,
        forceUpdate
    };
}