import React, { useEffect } from 'react';
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
}

export function useWorkbenchCommands({
    ready,
    t,
    i18n,
    fm,
    logic,
    settings,
    setSettings,
    pluginMenus,
    pluginManager,
    chatComponents,
    openCustomView
}: UseWorkbenchCommandsProps) {
    useEffect(() => {
        if (!ready) return;

        setupWorkbench(t, {
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
            components: {
                Sidebar: <Sidebar rootPath={logic.rootPath} onFileSelect={fm.handleFileSelect} onFileDelete={fm.closeFile} activeFilePath={fm.activeFilePath} pluginMenuItems={pluginMenus} />,
                SearchPanel: <SearchPanel rootPath={logic.rootPath} onFileSelect={fm.handleFileSelect} />,
                PluginList: () => <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => logic.forceUpdate((n: number) => n + 1)} />,
                ChatPanel: chatComponents.ChatPanel
            },
            openCustomView
        });
    }, [
        ready, 
        logic.rootPath, 
        pluginMenus, 
        fm, 
        chatComponents, 
        logic.forceUpdate, 
        t, 
        settings, 
        setSettings, 
        i18n, 
        logic.setShowCommandPalette, 
        logic.setShowSearch, 
        logic.setSidebarTab, 
        logic.setShowSidebar, 
        pluginManager, 
        openCustomView
    ]);
}