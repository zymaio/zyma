import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar/Sidebar';
import TabBar from '../components/TabBar/TabBar';
import Breadcrumbs from '../components/Breadcrumbs/Breadcrumbs';
import Editor from '../components/Editor/Editor';
import Preview from '../components/Preview/Preview';
import SearchPanel from '../components/SearchPanel/SearchPanel';
import TitleBar from '../components/TitleBar/TitleBar';
import SettingsModal from '../components/SettingsModal/SettingsModal';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import AboutModal from '../components/AboutModal/AboutModal';
import CommandPalette from '../components/CommandSystem/CommandPalette';
import PluginsPanel from '../components/PluginSystem/PluginsPanel';
import ActivityBar from '../components/ActivityBar';
import StatusBar from '../components/StatusBar';
import { views } from '../components/ViewSystem/ViewRegistry';
import { commands } from '../components/CommandSystem/CommandRegistry';
import { undo, redo } from '@codemirror/commands';
import { setupWorkbench } from './workbenchInit';
import { useWorkbenchLogic } from '../hooks/useWorkbenchLogic';
import { useWindowManagement } from '../hooks/useWindowManagement';
import { useWorkbench } from './WorkbenchContext';
import { invoke } from '@tauri-apps/api/core';

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
    useWindowManagement(logic.rootPath, isExiting, fm.openFiles, handleAppExit, setIsClosingApp);

    const activeFile = useMemo(() => {
        if (activeTab?.type === 'file') {
            return fm.openFiles.find((f: any) => f.id === activeTab.id) || null;
        }
        return null;
    }, [activeTab, fm.openFiles]);

    const isMarkdown = activeFile?.name.toLowerCase().endsWith('.md');

    useEffect(() => {
        if (!ready) return;
        setupWorkbench(t, {
            handleNewFile: fm.handleNewFile,
            handleSave: (force: boolean) => fm.doSave(null, force),
            handleSaveSettings: async (ns: any) => { 
                setSettings(ns); 
                i18n.changeLanguage(ns.language);
                try { await invoke('save_settings', { settings: ns }); } catch (e) {} 
            },
            getSettings: () => settings,
            setShowCommandPalette: logic.setShowCommandPalette,
            setShowSearch: logic.setShowSearch, 
            setSidebarTab: (id: string) => logic.setSidebarTab(id as any), 
            toggleSidebar: () => logic.setShowSidebar(prev => !prev),
            components: {
                Sidebar: <Sidebar rootPath={logic.rootPath} onFileSelect={fm.handleFileSelect} onFileDelete={fm.closeFile} activeFilePath={fm.activeFilePath} pluginMenuItems={pluginMenus} />,
                SearchPanel: <SearchPanel rootPath={logic.rootPath} onFileSelect={fm.handleFileSelect} />,
                PluginList: () => <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => logic.forceUpdate(n => n + 1)} />,
                ChatPanel: chatComponents.ChatPanel
            },
            openCustomView
        });
    }, [ready, logic.rootPath, pluginMenus, fm, chatComponents, logic.forceUpdate, t, settings, setSettings, i18n, logic.setShowCommandPalette, logic.setShowSearch, logic.setSidebarTab, logic.setShowSidebar, pluginManager, openCustomView]);

    if (!ready) return null;

    return (
        <div className="app-root">
            <TitleBar 
                onAction={(action) => {
                    switch (action) {
                        case 'new_file': commands.executeCommand('file.new'); break;
                        case 'open_folder': commands.executeCommand('workspace.openFolder'); break;
                        case 'save': commands.executeCommand('file.save'); break;
                        case 'exit': 
                            // 关键修复：UI 关闭按钮也要检查脏数据
                            if (fm.openFiles.some((f: any) => f.isDirty)) {
                                setIsClosingApp(true);
                            } else {
                                handleAppExit(false);
                            }
                            break;
                        case 'undo': if (fm.editorViewRef.current) undo(fm.editorViewRef.current); break;
                        case 'redo': if (fm.editorViewRef.current) redo(fm.editorViewRef.current); break;
                        case 'toggle_theme': commands.executeCommand('view.toggleTheme'); break;
                        case 'about': logic.setAboutState({ show: true, autoCheck: false }); break;
                    }
                }} 
                themeMode={settings.theme} 
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

            <StatusBar relativePath={logic.relativePath} activeFile={activeFile} getLanguageMode={logic.getLanguageMode} hasUpdate={false} t={t} />
            
            {logic.showSettings && <SettingsModal currentSettings={settings} onSave={async (ns) => { setSettings(ns); try { await invoke('save_settings', { settings: ns }); } catch(e){} }} onClose={() => logic.setShowSettings(false)} platform={platform} />}
            {logic.aboutState.show && <AboutModal version={appVersion} autoCheck={logic.aboutState.autoCheck} onClose={() => logic.setAboutState({ ...logic.aboutState, show: false })} />}
            <CommandPalette visible={logic.showCommandPalette} onClose={() => logic.setShowCommandPalette(false)} />
            
            {/* 1. 单文件关闭确认 */}
            {logic.pendingCloseId && (
                <ConfirmModal 
                    title={t('File')} 
                    message={t('SaveBeforeClose', { name: fm.openFiles.find((f: any) => f.id === logic.pendingCloseId)?.name })} 
                    onSave={async () => { 
                        const id = logic.pendingCloseId!;
                        const f = fm.openFiles.find((x: any) => x.id === id); 
                        if (await fm.doSave(f || null)) closeTab(id); 
                        logic.setPendingCloseId(null); 
                    }} 
                    onDontSave={() => { closeTab(logic.pendingCloseId!); logic.setPendingCloseId(null); }} 
                    onCancel={() => logic.setPendingCloseId(null)} 
                />
            )}

            {/* 2. 整个应用退出确认 (新) */}
            {isClosingApp && (
                <ConfirmModal 
                    title={t('ExitApp')} 
                    message={t('UnsavedChangesExit')} 
                    onSave={async () => { 
                        const dirtyFiles = fm.openFiles.filter((f: any) => f.isDirty);
                        for (const f of dirtyFiles) await fm.doSave(f);
                        setIsExiting(true); // 标记退出，绕过拦截
                        setTimeout(() => handleAppExit(false), 50); // 给 State 更新一点时间
                    }} 
                    onDontSave={() => {
                        setIsExiting(true); 
                        setTimeout(() => handleAppExit(false), 50);
                    }} 
                    onCancel={() => setIsClosingApp(false)} 
                />
            )}
        </div>
    );
};

export default Workbench;