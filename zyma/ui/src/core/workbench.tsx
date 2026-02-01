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
import { undo, redo } from '@codemirror/commands';
import { useWorkbenchLogic } from '../hooks/useWorkbenchLogic';
import { useWindowManagement } from '../hooks/useWindowManagement';
import { useWorkbench } from './WorkbenchContext';
import { useWorkbenchCommands } from '../hooks/useWorkbenchCommands';
import { useBottomPanelResize } from '../components/BottomPanel/useBottomPanelResize';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface WorkbenchProps {
    fm: any;
    tabSystem: any;
    sidebarResize: any;
    appInit: any;
    chatComponents: any;
}

const Workbench: React.FC<WorkbenchProps> = (props) => {
    const { fm, tabSystem, sidebarResize, appInit, chatComponents } = props;
    const { t, i18n } = useTranslation();
    
    const context = useWorkbench();
    const { settings, setSettings, isAdmin, platform, appVersion } = context;
    const productName = context.productName || '';
    const { handleAppExit, pluginMenus, pluginManager, ready } = appInit;

    const logic = useWorkbenchLogic({ fm, tabSystem, appInit });
    const { activeTabs, activeTabId, activeTab, setActiveTabId, closeTab, openCustomView } = tabSystem;
    const { sidebarWidth, startResizing } = sidebarResize;

    // 底部面板逻辑
    const bottomPanel = useBottomPanelResize();

    // 监听打开输出面板的内部事件
    React.useEffect(() => {
        const unlistenOutput = listen<string>('open-output-panel', (e) => {
            bottomPanel.setIsVisible(true);
        });

        // 协议扩展：通用 Tab 控制指令
        const unlistenOpenTab = listen<any>('zyma:open-tab', (e) => {
            const { id, title, url } = e.payload;
            openCustomView({
                id, title,
                component: React.createElement('iframe', {
                    src: url,
                    style: { width: '100%', height: '100%', border: 'none', backgroundColor: 'white' }
                })
            });
        });

        const unlistenCloseTab = listen<string>('zyma:close-tab', (e) => {
            closeTab(e.payload);
        });

        return () => { 
            unlistenOutput.then(f => f()); 
            unlistenOpenTab.then(f => f());
            unlistenCloseTab.then(f => f());
        };
    }, [openCustomView, closeTab]);

    // 关键：实时同步回调给插件管理器，解决禁用插件时不关闭窗口的 Bug
    React.useEffect(() => {
        if (pluginManager.current) {
            pluginManager.current.setCallbacks({
                closeTab,
                openCustomView,
                insertText: (text: string) => {
                    const active = fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath);
                    if (active) fm.handleEditorChange(active.content + text);
                },
                getContent: () => fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath)?.content || '',
                getSelection: () => fm.getSelection ? fm.getSelection() : ''
            });
        }
    }, [closeTab, openCustomView, fm.activeFilePath]);

    // 状态：用于处理整个应用的退出确认
    const [isClosingApp, setIsClosingApp] = useState(false);
    const [isExiting, setIsExiting] = useState(false); // 新增退出中状态

    // 使用 Ref 确保 handleCloseTab 永远能拿到最新的 openFiles
    const openFilesRef = React.useRef(fm.openFiles);
    React.useEffect(() => { openFilesRef.current = fm.openFiles; }, [fm.openFiles]);

    const handleCloseTab = (id: string) => {
        const file = openFilesRef.current.find((f: any) => f.id === id);
        if (file?.isDirty) {
            logic.setPendingCloseId(id); 
        } else {
            closeTab(id);
        }
    };

    // 全局退出拦截 - 传入 isExiting 状态
    const { requestExit } = useWindowManagement(logic.rootPath, isExiting, fm.openFiles, handleAppExit, setIsClosingApp);

    const activeFile = useMemo(() => {
        if (activeTab?.type === 'file') {
            return fm.openFiles.find((f: any) => f.id === activeTab.id) || null;
        }
        return null;
    }, [activeTab, fm.openFiles]);

    const isMarkdown = activeFile?.name.toLowerCase().endsWith('.md');

    useWorkbenchCommands({
        ready, t, i18n, fm, logic, settings, setSettings,
        pluginMenus, pluginManager, chatComponents, openCustomView, tabSystem
    });

    if (!ready) return null;

    return (
        <div className="app-root">
            <TitleBar 
                onAction={(action, params) => {
                    switch (action) {
                        case 'new_file': commands.executeCommand('file.new'); break;
                        case 'open_folder': commands.executeCommand('workspace.openFolder'); break;
                        case 'workspace.open_recent':
                            if (params) {
                                // 立即清理 UI 防止切换时的视觉闪烁
                                fm.setOpenFiles([]);
                                fm.setActiveFilePath(null);
                                setActiveTabId(null);
                                invoke('fs_set_cwd', { path: params });
                            }
                            break;
                        case 'save': commands.executeCommand('file.save'); break;
                        case 'save_as': commands.executeCommand('file.saveAs'); break;
                        case 'exit': requestExit(); break;
                        case 'undo': if (fm.editorViewRef.current) undo(fm.editorViewRef.current); break;
                        case 'redo': if (fm.editorViewRef.current) redo(fm.editorViewRef.current); break;
                        case 'toggle_theme': commands.executeCommand('view.toggleTheme'); break;
                        case 'about': logic.setAboutState({ show: true, autoCheck: false }); break;
                    }
                }} 
                themeMode={settings.theme} 
                isAdmin={isAdmin}
                platform={platform}
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
                            {(() => {
                                if (logic.sidebarTab === 'plugins') return <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => logic.forceUpdate(n => n + 1)} />;
                                const view = views.getView(logic.sidebarTab);
                                if (!view) return null;
                                const Content = view.component;
                                return typeof Content === 'function' ? <Content /> : Content;
                            })()}
                        </div>
                        <div style={{ width: '4px', cursor: 'col-resize', zIndex: 10 }} className="resize-handle" onMouseDown={startResizing} />
                    </>
                )}

                <div className="editor-group-container">
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <TabBar 
                            files={activeTabs.map((t: any) => {
                                const file = fm.openFiles.find((f: any) => f.id === t.id);
                                return { path: t.id, name: t.title, type: t.type, isDirty: file?.isDirty || false };
                            })} 
                            activePath={activeTabId} 
                            onSwitch={(id) => { 
                                setActiveTabId(id); 
                                if (activeTabs.find((t: any) => t.id === id)?.type === 'file') fm.setActiveFilePath(id); 
                            }} 
                            onClose={handleCloseTab} 
                        />
                        
                        <Breadcrumbs path={activeTab?.type === 'file' ? activeTabId : null} />
                        
                        <WorkbenchMain 
                            activeTab={activeTab}
                            activeFile={activeFile}
                            isMarkdown={isMarkdown}
                            settings={settings}
                            fm={fm}
                            productName={productName}
                        />
                    </div>

                    <BottomPanel 
                        isVisible={bottomPanel.isVisible}
                        height={bottomPanel.panelHeight}
                        onClose={() => bottomPanel.setIsVisible(false)}
                        startResizing={bottomPanel.startResizing}
                        onDetach={(id) => {
                            bottomPanel.setIsVisible(false);
                            // 复用底座现有的弹出命令
                            invoke('open_detached_output', { channel: "绣智助手日志" });
                        }}
                    />
                </div>
            </div>

            <StatusBar 
                isAdmin={isAdmin} 
                relativePath={logic.relativePath} 
                activeFile={activeFile} 
                getLanguageMode={logic.getLanguageMode} 
                hasUpdate={false} 
                appVersion={appVersion} 
                t={t} 
            />
            
            <WorkbenchModals 
                logic={logic} 
                settings={settings} 
                setSettings={setSettings} 
                platform={platform} 
                appVersion={appVersion} 
                fm={fm} 
                closeTab={closeTab} 
                isClosingApp={isClosingApp} 
                setIsClosingApp={setIsClosingApp} 
                setIsExiting={setIsExiting} 
                handleAppExit={handleAppExit} 
            />
            
            <Toaster 
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-dropdown)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        fontSize: 'var(--ui-font-size)'
                    }
                }}
            />
        </div>
    );
};

export default Workbench;
