import { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { i18n as I18nType } from 'i18next';
import { undo, redo } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { commands } from '../components/CommandSystem/CommandRegistry';
import { useWindowManagement } from './useWindowManagement';
import { useWorkbenchCommands } from './useWorkbenchCommands';
import { useWorkbench } from '../core/WorkbenchContext';
import type { FileManagement, FileData } from './useFileManagement';
import type { TabItem, CustomViewRequest, TabSystem } from './useTabSystem';
import type { WorkbenchLogic } from './useWorkbenchLogic';
import type { PluginManager } from '../components/PluginSystem/PluginManager';
import type { AppSettings } from '../components/PluginSystem/types';

interface AppInitReturn {
    ready: boolean;
    settings: AppSettings;
    setSettings?: (s: AppSettings) => void;
    isAdmin: boolean;
    platform: string;
    appVersion: string;
    productName: string;
    pluginMenus: Array<{ label: string; commandId: string; order?: number; pluginName: string }>;
    pluginManager: React.MutableRefObject<PluginManager | null>;
    handleAppExit: (saveAll: boolean) => Promise<void>;
}

export interface WorkbenchControllerProps {
    fm: FileManagement;
    tabSystem: TabSystem;
    logic: WorkbenchLogic;
    appInit: AppInitReturn;
    chatComponents: { ChatPanel: React.ComponentType<unknown> };
    brand?: {
        name?: string;
    };
}

export function useWorkbenchController(props: WorkbenchControllerProps) {
    const { fm, tabSystem, logic, appInit, chatComponents, brand } = props;
    const { t, i18n } = useTranslation();
    const context = useWorkbench();
    const { settings, setSettings, isAdmin, platform, appVersion } = context;
    const { handleAppExit, pluginMenus, pluginManager, ready } = appInit;

    const [isClosingApp, setIsClosingApp] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleCloseTab = useCallback((id: string) => {
        const file = fm.openFiles.find((f: FileData) => f.id === id);
        if (file?.isDirty) {
            logic.setPendingCloseId(id);
        } else {
            tabSystem.closeTab(id);
        }
    }, [fm.openFiles, logic, tabSystem]);

    const { requestExit } = useWindowManagement(
        logic.rootPath, 
        isExiting, 
        fm.openFiles, 
        handleAppExit, 
        setIsClosingApp
    );

    const activeFile = useMemo(() =>
        tabSystem.activeTab?.type === 'file'
            ? fm.openFiles.find((f: FileData) => f.id === tabSystem.activeTab.id)
            : null,
    [tabSystem.activeTab, fm.openFiles]);

    // Initialize workbench commands
    useWorkbenchCommands({ 
        ready, t, i18n, fm, logic, settings, setSettings, 
        pluginMenus, pluginManager, chatComponents, 
        openCustomView: tabSystem.openCustomView, 
        tabSystem 
    });

    const onTitleBarAction = useCallback((action: string, params?: string) => {
        switch (action) {
            case 'exit': requestExit(); break;
            case 'toggle_theme': commands.executeCommand('view.toggleTheme'); break;
            case 'open_folder': commands.executeCommand('workspace.openFolder'); break;
            case 'workspace.open_recent': 
                if (params) { 
                    fm.setOpenFiles([]); 
                    invoke('fs_set_cwd', { path: params }); 
                } 
                break;
            case 'save': commands.executeCommand('file.save'); break;
            case 'save_as': commands.executeCommand('file.saveAs'); break;
            case 'new_file': commands.executeCommand('file.new'); break;
            case 'about': logic.setAboutState({ show: true, autoCheck: false }); break;
            case 'check_update': logic.setAboutState({ show: true, autoCheck: true }); break;
            case 'undo': if (fm.editorViewRef.current) undo(fm.editorViewRef.current); break;
            case 'redo': if (fm.editorViewRef.current) redo(fm.editorViewRef.current); break;
        }
    }, [requestExit, fm, logic]);

    const productName = brand?.name || context.productName || '';

    return {
        t,
        settings,
        setSettings,
        isAdmin,
        platform,
        appVersion,
        productName,
        ready,
        activeFile,
        isClosingApp,
        setIsClosingApp,
        setIsExiting,
        handleAppExit,
        handleCloseTab,
        onTitleBarAction,
        pluginManager
    };
}
