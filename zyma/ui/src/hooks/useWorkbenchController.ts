import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { undo, redo } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { commands } from '../components/CommandSystem/CommandRegistry';
import { useWindowManagement } from './useWindowManagement';
import { useWorkbenchCommands } from './useWorkbenchCommands';
import { useWorkbench } from '../core/WorkbenchContext';

export function useWorkbenchController(props: any) {
    const { fm, tabSystem, logic, appInit, chatComponents, brand } = props;
    const { t, i18n } = useTranslation();
    const context = useWorkbench();
    const { settings, setSettings, isAdmin, platform, appVersion } = context;
    const { handleAppExit, pluginMenus, pluginManager, ready } = appInit;

    const [isClosingApp, setIsClosingApp] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleCloseTab = useCallback((id: string) => {
        const file = fm.openFiles.find((f: any) => f.id === id);
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
            ? fm.openFiles.find((f: any) => f.id === tabSystem.activeTab.id) 
            : null, 
    [tabSystem.activeTab, fm.openFiles]);

    // Initialize workbench commands
    useWorkbenchCommands({ 
        ready, t, i18n, fm, logic, settings, setSettings, 
        pluginMenus, pluginManager, chatComponents, 
        openCustomView: tabSystem.openCustomView, 
        tabSystem 
    });

    const onTitleBarAction = useCallback((action: string, params?: any) => {
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
