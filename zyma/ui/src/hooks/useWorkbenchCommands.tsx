import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TFunction } from 'i18next';
import type { i18n as I18nType } from 'i18next';
import Sidebar from '../components/Sidebar/Sidebar';
import SearchPanel from '../components/SearchPanel/SearchPanel';
import PluginsPanel from '../components/PluginSystem/PluginsPanel';
import { setupWorkbench } from '../core/workbenchInit';
import type { WorkbenchLogic } from './useWorkbenchLogic';
import type { FileManagement } from './useFileManagement';
import type { TabSystem, CustomViewRequest } from './useTabSystem';
import type { PluginManager } from '../components/PluginSystem/PluginManager';
import type { AppSettings, WorkbenchComponents } from '../components/PluginSystem/types';

interface UseWorkbenchCommandsProps {
    ready: boolean;
    t: TFunction;
    i18n: I18nType;
    fm: FileManagement;
    logic: WorkbenchLogic;
    settings: AppSettings;
    setSettings: (s: AppSettings) => void;
    pluginMenus: Array<{ label: string; commandId: string; order?: number; pluginName: string }>;
    pluginManager: React.MutableRefObject<PluginManager | null>;
    chatComponents: { ChatPanel: React.ComponentType<unknown> };
    openCustomView: (request: CustomViewRequest) => void;
    tabSystem: TabSystem;
}

export function useWorkbenchCommands(props: UseWorkbenchCommandsProps) {
    const { ready, t, i18n, fm, logic, settings, setSettings, pluginMenus, pluginManager, chatComponents, openCustomView, tabSystem } = props;

    // 使用 Ref 保持对最新 Handler 的引用，避免频繁重写 Command 注册
    const handlersRef = useRef<{
        handleNewFile: () => void;
        handleSave: (force: boolean) => void;
        handleSaveSettings: (ns: AppSettings) => Promise<void>;
        getSettings: () => AppSettings;
        setShowCommandPalette: (show: boolean) => void;
        setShowSearch: (show: boolean) => void;
        setSidebarTab: (id: string) => void;
        toggleSidebar: () => void;
        setRootPath: (p: string) => void;
        fm: FileManagement;
        setActiveTabId: (id: string | null) => void;
        components: WorkbenchComponents;
        openCustomView: (request: CustomViewRequest) => void;
    } | null>(null);
    handlersRef.current = {
        handleNewFile: fm.handleNewFile,
        handleSave: (force: boolean) => fm.doSave(null, force),
        handleSaveSettings: async (ns: AppSettings) => {
            setSettings(ns);
            i18n.changeLanguage(ns.language);
            try { await invoke('save_settings', { settings: ns }); } catch (e) { console.error(e); }
        },
        getSettings: () => settings,
        setShowCommandPalette: logic.setShowCommandPalette,
        setShowSearch: logic.setShowSearch,
        setSidebarTab: (id: string) => logic.setSidebarTab(id as 'explorer' | 'search' | 'plugins'),
        toggleSidebar: () => logic.setShowSidebar((prev: boolean) => !prev),
        setRootPath: (p: string) => logic.setRootPath(p),
        fm,
        setActiveTabId: (id: string | null) => tabSystem.setActiveTabId(id),
        components: {
            Sidebar: <Sidebar pluginMenuItems={pluginMenus} />,
            SearchPanel: <SearchPanel />,
            PluginList: () => <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => logic.forceUpdate((n: number) => n + 1)} />,
            ChatPanel: chatComponents.ChatPanel
        },
        openCustomView
    };

    // 响应语言变化重新注册指令
    const isRegistered = useRef(false);
    const lastLanguage = useRef(i18n.language);
    useEffect(() => {
        if (!ready) return;
        if (isRegistered.current && lastLanguage.current === i18n.language) return;

        setupWorkbench(t, {
            handleNewFile: () => handlersRef.current!.handleNewFile(),
            handleSave: (f: boolean) => handlersRef.current!.handleSave(f),
            handleSaveSettings: (s: AppSettings) => handlersRef.current!.handleSaveSettings(s),
            getSettings: () => handlersRef.current!.getSettings(),
            setShowCommandPalette: (s: boolean) => handlersRef.current!.setShowCommandPalette(s),
            setShowSearch: (s: boolean) => handlersRef.current!.setShowSearch(s),
            setSidebarTab: (id: string) => handlersRef.current!.setSidebarTab(id),
            toggleSidebar: () => handlersRef.current!.toggleSidebar(),
            setRootPath: (p: string) => handlersRef.current!.setRootPath(p),
            fm: handlersRef.current!.fm,
            setActiveTabId: (id: string | null) => handlersRef.current!.setActiveTabId(id),
            components: handlersRef.current!.components,
            openCustomView: (r: CustomViewRequest) => handlersRef.current!.openCustomView(r)
        });

        isRegistered.current = true;
        lastLanguage.current = i18n.language;
    }, [ready, t, i18n.language]);
}