import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TabBar from '../components/TabBar/TabBar';
import Breadcrumbs from '../components/Breadcrumbs/Breadcrumbs';
import Editor from '../components/Editor/Editor';
import Preview from '../components/Preview/Preview';
import TitleBar from '../components/TitleBar/TitleBar';
import PluginsPanel from '../components/PluginSystem/PluginsPanel';
import ActivityBar from '../components/ActivityBar';
import StatusBar from '../components/StatusBar';
import WorkbenchModals from './WorkbenchModals';
import { views } from '../components/ViewSystem/ViewRegistry';
import { commands } from '../components/CommandSystem/CommandRegistry';
import { undo, redo } from '@codemirror/commands';
import { useWorkbenchLogic } from '../hooks/useWorkbenchLogic';
import { useWindowManagement } from '../hooks/useWindowManagement';
import { useWorkbench } from './WorkbenchContext';
import { useWorkbenchCommands } from '../hooks/useWorkbenchCommands';
import { Toaster } from 'react-hot-toast';

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
    
    const { settings, setSettings, isAdmin, platform, appVersion } = useWorkbench();
    const { handleAppExit, pluginMenus, pluginManager, ready } = appInit;

    const logic = useWorkbenchLogic({ fm, tabSystem, appInit });
    const { activeTabs, activeTabId, activeTab, setActiveTabId, closeTab, openCustomView } = tabSystem;
    const { sidebarWidth, startResizing } = sidebarResize;

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
        pluginMenus, pluginManager, chatComponents, openCustomView
    });

    if (!ready) return null;

    return (
        <div className="app-root">
            <TitleBar 
                onAction={(action) => {
                    switch (action) {
                        case 'new_file': commands.executeCommand('file.new'); break;
                        case 'open_folder': commands.executeCommand('workspace.openFolder'); break;
                        case 'save': commands.executeCommand('file.save'); break;
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
                    
                    <div className="main-content-area" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                        {activeTab?.type === 'file' && activeFile ? (
                            <div className="editor-instance-wrapper" style={{ flex: 1, height: '100%', overflow: 'hidden' }} key={activeFile.id}>
                                <Editor content={activeFile.content} fileName={activeFile.name} themeMode={settings.theme} fontSize={settings.font_size} onChange={fm.handleEditorChange} editorRef={fm.editorViewRef} />
                                {isMarkdown && <div className="markdown-preview-pane" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--bg-editor)' }}><Preview content={activeFile.content} themeMode={settings.theme} /></div>}
                            </div>
                        ) : activeTab?.type === 'view' ? (
                            <div className="custom-view-wrapper" style={{ 
                                flex: 1, 
                                height: '100%', 
                                backgroundColor: 'var(--bg-editor)',
                                color: 'var(--text-primary)'
                            }}>{activeTab.component}</div>
                        ) : (
                            <div className="empty-state">
                                <div className="logo-text">智码 (zyma)</div>
                                <div>{t('NoFile')}</div>
                            </div>
                        )}
                    </div>
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
