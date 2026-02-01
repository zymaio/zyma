import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TFunction } from 'i18next';
import Sidebar from '../components/Sidebar/Sidebar';
import SearchPanel from '../components/SearchPanel/SearchPanel';
import PluginsPanel from '../components/PluginSystem/PluginsPanel';
import { setupWorkbench } from '../core/workbenchInit';

interface UseWorkbenchCommandsProps {
    ready: boolean;
    t: TFunction;
    i18n: any;
    fm: any;
    logic: any;
    settings: any;
    setSettings: any;
    pluginMenus: any;
    pluginManager: any;
    chatComponents: any;
    openCustomView: any;
    tabSystem: any;
}

export function useWorkbenchCommands(props: UseWorkbenchCommandsProps) {
    const { ready, t, i18n, fm, logic, settings, setSettings, pluginMenus, pluginManager, chatComponents, openCustomView, tabSystem } = props;
    
    // 使用 Ref 保持对最新 Handler 的引用，避免频繁重写 Command 注册
    const handlersRef = useRef<any>(null);
    handlersRef.current = {
        handleNewFile: fm.handleNewFile,
        handleSave: (force: boolean) => fm.doSave(null, force),
        handleSaveSettings: async (ns: any) => { 
            setSettings(ns); 
            i18n.changeLanguage(ns.language);
            try { await invoke('save_settings', { settings: ns }); } catch (e) { console.error(e); }
        },
        getSettings: () => settings,
        setShowCommandPalette: logic.setShowCommandPalette,
        setShowSearch: logic.setShowSearch, 
        setSidebarTab: (id: string) => logic.setSidebarTab(id as any), 
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

    // 仅在就绪时注册一次指令
    const isRegistered = useRef(false);
    useEffect(() => {
        if (!ready || isRegistered.current) return;

        setupWorkbench(t, {
            handleNewFile: () => handlersRef.current.handleNewFile(),
            handleSave: (f: boolean) => handlersRef.current.handleSave(f),
            handleSaveSettings: (s: any) => handlersRef.current.handleSaveSettings(s),
            getSettings: () => handlersRef.current.getSettings(),
            setShowCommandPalette: (s: boolean) => handlersRef.current.setShowCommandPalette(s),
            setShowSearch: (s: boolean) => handlersRef.current.setShowSearch(s),
            setSidebarTab: (id: string) => handlersRef.current.setSidebarTab(id),
            toggleSidebar: () => handlersRef.current.toggleSidebar(),
            setRootPath: (p: string) => handlersRef.current.setRootPath(p),
            fm: handlersRef.current.fm,
            setActiveTabId: (id: string | null) => handlersRef.current.setActiveTabId(id),
            components: handlersRef.current.components,
            openCustomView: (r: any) => handlersRef.current.openCustomView(r)
        });

        isRegistered.current = true;
    }, [ready, t]);
}