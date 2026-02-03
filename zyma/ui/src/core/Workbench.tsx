import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TabBar from '../components/TabBar/TabBar';
import Breadcrumbs from '../components/Breadcrumbs/Breadcrumbs';
import TitleBar from '../components/TitleBar/TitleBar';
import PluginsPanel from '../components/PluginSystem/PluginsPanel';
import ActivityBar from '../components/ActivityBar';
import StatusBar from '../components/StatusBar';
import BottomPanel from '../components/BottomPanel/BottomPanel';
import WorkbenchModals from './WorkbenchModals';
import WorkbenchMain from './WorkbenchMain';
import { views } from '../components/ViewSystem/ViewRegistry';
import { commands } from '../components/CommandSystem/CommandRegistry';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { undo, redo } from '@codemirror/commands';
import { useWindowManagement } from '../hooks/useWindowManagement';
import { useWorkbench } from './WorkbenchContext';
import { useWorkbenchCommands } from '../hooks/useWorkbenchCommands';
import { useBottomPanelResize } from '../components/BottomPanel/useBottomPanelResize';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import type { WorkbenchLogic } from '../hooks/useWorkbenchLogic';
import type { FileManagement } from '../hooks/useFileManagement';

interface WorkbenchProps {
    fm: FileManagement;
    tabSystem: {
        activeTabs: any[];
        activeTabId: string | null;
        activeTab: any;
        setActiveTabId: (id: string | null) => void;
        closeTab: (id: string) => void;
        openCustomView: (req: any) => void;
    };
    sidebarResize: {
        sidebarWidth: number;
        startResizing: () => void;
    };
    appInit: any;
    chatComponents: any;
    logic: WorkbenchLogic; // 明确类型
    brand?: { name: string; subName?: string; logo?: React.ReactNode; };
    welcomeExtra?: React.ReactNode;
}

const Workbench: React.FC<WorkbenchProps> = (props) => {
    const { fm, tabSystem, sidebarResize, appInit, chatComponents, logic, brand, welcomeExtra } = props;
    const { t, i18n } = useTranslation();
    
    const context = useWorkbench();
    const { settings, setSettings, isAdmin, platform, appVersion } = context;
    const productName = brand?.name || context.productName || '';
    const { handleAppExit, pluginMenus, pluginManager, ready } = appInit;

    // 直接解构外部传入的逻辑控制器，保持单例状态
    const { activeTabs, activeTabId, activeTab, setActiveTabId, closeTab, openCustomView } = tabSystem;
    const { sidebarWidth, startResizing } = sidebarResize;
    const bottomPanel = useBottomPanelResize();

    const [isClosingApp, setIsClosingApp] = useState(false);
    const [isExiting, setIsExiting] = useState(false); 

    const handleCloseTab = (id: string) => {
        const file = fm.openFiles.find((f: any) => f.id === id);
        if (file?.isDirty) logic.setPendingCloseId(id); else closeTab(id);
    };

    const { requestExit } = useWindowManagement(logic.rootPath, isExiting, fm.openFiles, handleAppExit, setIsClosingApp);

    const activeFile = useMemo(() => activeTab?.type === 'file' ? fm.openFiles.find((f: any) => f.id === activeTab.id) : null, [activeTab, fm.openFiles]);

    useWorkbenchCommands({ ready, t, i18n, fm, logic, settings, setSettings, pluginMenus, pluginManager, chatComponents, openCustomView, tabSystem });

    if (!ready) return null;

    return (
        <div className="app-root">
            <TitleBar 
                onAction={(action, params) => {
                    switch (action) {
                        case 'exit': requestExit(); break;
                        case 'toggle_theme': commands.executeCommand('view.toggleTheme'); break;
                        case 'open_folder': commands.executeCommand('workspace.openFolder'); break;
                        case 'workspace.open_recent': if (params) { fm.setOpenFiles([]); invoke('fs_set_cwd', { path: params }); } break;
                        case 'save': commands.executeCommand('file.save'); break;
                        case 'save_as': commands.executeCommand('file.saveAs'); break;
                        case 'new_file': commands.executeCommand('file.new'); break;
                        case 'about': logic.setAboutState({ show: true, autoCheck: false }); break;
                        case 'check_update': logic.setAboutState({ show: true, autoCheck: true }); break;
                        case 'undo': undo(fm.editorViewRef.current!); break;
                        case 'redo': redo(fm.editorViewRef.current!); break;
                    }
                }} 
                themeMode={settings.theme} 
                isAdmin={isAdmin}
                platform={platform}
                brand={brand}
            />
            
            <div className="main-workbench">
                <ActivityBar 
                    sidebarTab={logic.sidebarTab} 
                    showSidebar={logic.showSidebar} 
                    setSidebarTab={logic.setSidebarTab} 
                    setShowSidebar={logic.setShowSidebar} 
                    onShowSettings={() => logic.setShowSettings(true)} 
                    showSettings={logic.showSettings} 
                />
                
                {logic.showSidebar && (
                    <>
                        <div className="sidebar-container" style={{ width: `${sidebarWidth}px` }}>
                            <ErrorBoundary>
                                {(() => {
                                    if (logic.sidebarTab === 'plugins') return <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => logic.forceUpdate((n: number) => n + 1)} />;
                                    const view = views.getView(logic.sidebarTab);
                                    if (!view) return null;
                                    const Content = view.component;
                                    return typeof Content === 'function' ? <Content /> : Content;
                                })()}
                            </ErrorBoundary>
                        </div>
                        <div style={{ width: '4px', cursor: 'col-resize', zIndex: 10 }} className="resize-handle" onMouseDown={startResizing} />
                    </>
                )}

                <div className="editor-group-container">
                    <TabBar 
                        files={activeTabs.map((t: any) => ({ path: t.id, name: t.title, type: t.type, isDirty: fm.openFiles.find((f: any) => f.id === t.id)?.isDirty || false }))} 
                        activePath={activeTabId} 
                        onSwitch={(id) => { setActiveTabId(id); if (activeTabs.find((t: any) => t.id === id)?.type === 'file') fm.setActiveFilePath(id); }} 
                        onClose={handleCloseTab} 
                    />
                    <Breadcrumbs path={activeTab?.type === 'file' ? activeTabId : null} />
                    <WorkbenchMain 
                        activeTab={activeTab} activeFile={activeFile} settings={settings} fm={fm} 
                        productName={productName} welcomeExtra={welcomeExtra} 
                    />
                    <BottomPanel isVisible={bottomPanel.isVisible} height={bottomPanel.panelHeight} onClose={() => bottomPanel.setIsVisible(false)} startResizing={bottomPanel.startResizing} onDetach={() => invoke('open_detached_output', { channel: "绣智助手日志" })} />
                </div>
            </div>

            <StatusBar isAdmin={isAdmin} relativePath={logic.relativePath} activeFile={activeFile} getLanguageMode={logic.getLanguageMode} hasUpdate={false} appVersion={appVersion} t={t} />
            <WorkbenchModals logic={logic} settings={settings} setSettings={setSettings} platform={platform} appVersion={appVersion} fm={fm} closeTab={closeTab} isClosingApp={isClosingApp} setIsClosingApp={setIsClosingApp} setIsExiting={setIsExiting} handleAppExit={handleAppExit} />
            <Toaster position="bottom-right" />
        </div>
    );
};

export default Workbench;