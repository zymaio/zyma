import { useState, useEffect, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import './i18n';
import Sidebar from './components/Sidebar/Sidebar';
import TabBar from './components/TabBar/TabBar';
import Breadcrumbs from './components/Breadcrumbs/Breadcrumbs';
import Editor from './components/Editor/Editor';
import Preview from './components/Preview/Preview';
import SearchPanel from './components/SearchPanel/SearchPanel';
import TitleBar from './components/TitleBar/TitleBar';
import SettingsModal from './components/SettingsModal/SettingsModal';
import ConfirmModal from './components/ConfirmModal/ConfirmModal';
import AboutModal from './components/AboutModal/AboutModal';
import CommandPalette from './components/CommandSystem/CommandPalette';
import EditorSearch from './components/EditorSearch/EditorSearch';
import { setupWorkbench } from './core/workbench';
import { SearchQuery, setSearchQuery, findNext, findPrevious } from '@codemirror/search';
import { undo, redo } from '@codemirror/commands';
import { views } from './components/ViewSystem/ViewRegistry';
import { statusBar } from './components/StatusBar/StatusBarRegistry';
import { commands } from './components/CommandSystem/CommandRegistry';
import { useFileManagement } from './hooks/useFileManagement';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useKeybindings } from './hooks/useKeybindings';
import { useWindowManagement } from './hooks/useWindowManagement';
import { useTabSystem } from './hooks/useTabSystem';
import { useSidebarResize } from './hooks/useSidebarResize';
import type { AppSettings } from './components/SettingsModal/SettingsModal';
import PluginsPanel from './components/PluginSystem/PluginsPanel';
import ChatPanel from './components/Chat/ChatPanel';
import ActivityBar from './components/ActivityBar';
import StatusBar from './components/StatusBar';
import { pathUtils } from './utils/pathUtils';
import './App.css';
import './components/ResizeHandle.css';

function App() {
  const { t, i18n } = useTranslation();
  const fm = useFileManagement(t);
  
  // 1. 使用拆分后的 Tab 系统 Hook
  const { activeTabs, activeTabId, activeTab, setActiveTabId, openCustomView, closeTab } = useTabSystem(fm);
  
  // 2. 使用拆分后的缩放 Hook
  const { sidebarWidth, startResizing } = useSidebarResize(250);

  const {
      ready, settings, setSettings, isAdmin, platform, appVersion,
      pluginMenus, pluginManager, handleAppExit, openCustomView: initOpenCustomView
  } = useAppInitialization(fm, i18n, openCustomView);

  const chatComponents = useMemo(() => ({ 
      ChatPanel: (props: any) => <ChatPanel {...props} settings={settings} getContext={async () => {
          const editor = fm.editorViewRef.current;
          let selection = null;
          let fileContent = null;
          if (editor) {
              const sel = editor.state.selection.main;
              if (!sel.empty) selection = editor.state.doc.sliceString(sel.from, sel.to);
              fileContent = editor.state.doc.toString();
          }
          return { filePath: fm.activeFilePath, selection, fileContent };
      }} />
  }), [fm.activeFilePath, settings]);

  useEffect(() => {
      if (ready && pluginManager.current) {
          pluginManager.current.setComponents({ ChatPanel: chatComponents.ChatPanel });
      }
  }, [ready, chatComponents]);
  
  const [rootPath, setRootPath] = useState<string>(".");
  const [sidebarTab, setSidebarTab] = useState<string>('explorer');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [aboutState, setAboutState] = useState({ show: false, autoCheck: false, data: null as any });
  const [isClosingApp, setIsClosingApp] = useState(false);
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showSidebar, setShowSidebar] = useState(true);
  const [, forceUpdate] = useState(0);

  useKeybindings();
  useWindowManagement(rootPath, false, fm, handleAppExit, setIsClosingApp);

  const appStateRef = useRef({ settings, cursorPos });
  useEffect(() => { appStateRef.current = { settings, cursorPos }; }, [settings, cursorPos]);

  const activeFile = useMemo(() => {
      if (activeTab?.type === 'file') {
          return fm.openFiles.find(f => (f.path || f.name) === activeTab.id) || null;
      }
      return null;
  }, [activeTab, fm.openFiles]);

  const isMarkdown = activeFile?.name.toLowerCase().endsWith('.md');
  
  const relativePath = useMemo(() => {
    if (!activeFile) return t('NoFile');
    const path = activeFile.path || activeFile.name;
    const normRoot = pathUtils.toForwardSlashes(rootPath);
    return path.startsWith(normRoot) ? path.replace(normRoot, '').replace(/^[\/]/, '') : path;
  }, [activeFile, rootPath, t]);

  const getLanguageMode = () => {
      if (!activeFile) return '';
      const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';
      const map: Record<string, string> = {
          'rs': 'Rust', 'js': 'JavaScript', 'ts': 'TypeScript', 'tsx': 'TypeScript', 
          'jsx': 'JavaScript', 'py': 'Python', 'md': 'Markdown', 'html': 'HTML',
          'css': 'CSS', 'json': 'JSON', 'xml': 'XML', 'svg': 'SVG', 'cpp': 'C++', 'toml': 'TOML'
      };
      return t(map[ext] || 'Plaintext');
  };

  useEffect(() => {
    const unsubViews = views.subscribe(() => forceUpdate(n => n + 1));
    const unsubStatus = statusBar.subscribe(() => forceUpdate(n => n + 1));
    return () => { unsubViews(); unsubStatus(); };
  }, []);

  useEffect(() => {
      if (!ready) return;
      commands.registerCommand({
          id: 'workspace.openFolder',
          title: t('OpenFolder'),
          callback: async () => {
              const sel = await open({ directory: true });
              if (sel) {
                  const newPath = sel as string;
                  setRootPath(newPath);
                  fm.setOpenFiles([]);
                  fm.setActiveFilePath(null);
                  setActiveTabId(null);
                  await invoke('fs_set_cwd', { path: newPath });
              }
          }
      });
      setupWorkbench(t, {
          handleNewFile: fm.handleNewFile,
          handleSave: (force: boolean) => fm.doSave(fm.openFiles.find(f => (f.path || f.name) === fm.activeFilePath) || null, force),
          handleSaveSettings: async (ns: AppSettings) => { setSettings(ns); i18n.changeLanguage(ns.language); try { await invoke('save_settings', { settings: ns }); } catch (e) { alert(e); } },
          getSettings: () => appStateRef.current.settings,
          setShowCommandPalette,
          setShowSearch, 
          setSidebarTab: (id: string) => setSidebarTab(id as any), 
          toggleSidebar: () => setShowSidebar(prev => !prev),
          components: {
              Sidebar: <Sidebar rootPath={rootPath} onFileSelect={fm.handleFileSelect} onFileDelete={fm.closeFile} activeFilePath={fm.activeFilePath} pluginMenuItems={pluginMenus} />,
              SearchPanel: <SearchPanel rootPath={rootPath} onFileSelect={fm.handleFileSelect} />,
              PluginList: () => <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => forceUpdate(n => n + 1)} />,
              ChatPanel: chatComponents.ChatPanel
          },
          openCustomView
      });
  }, [ready, rootPath, pluginMenus, t, fm, i18n, settings, openCustomView, chatComponents, setActiveTabId]);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${settings.theme}`);
    document.documentElement.style.setProperty('--ui-font-size', (settings.ui_font_size || 13) + 'px');
  }, [settings.theme, settings.ui_font_size]);

  if (!ready) return <div className="loading-screen" style={{ width: '100vw', height: '100vh', backgroundColor: 'var(--bg-primary)' }}></div>;

  return (
    <div className={`app-root theme-${settings.theme}`} style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <TitleBar onAction={(action) => {
            switch (action) {
                case 'new_file': commands.executeCommand('file.new'); break;
                case 'open_folder': commands.executeCommand('workspace.openFolder'); break;
                case 'save': commands.executeCommand('file.save'); break;
                case 'exit': handleAppExit(false); break;
                case 'undo': if (fm.editorViewRef.current) undo(fm.editorViewRef.current); break;
                case 'redo': if (fm.editorViewRef.current) redo(fm.editorViewRef.current); break;
                case 'toggle_theme': commands.executeCommand('view.toggleTheme'); break;
                case 'about': setAboutState({ show: true, autoCheck: false, data: null }); break;
            }
        }} themeMode={settings.theme} isAdmin={isAdmin} platform={platform} />
        
        <div className="main-workbench" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <ActivityBar sidebarTab={sidebarTab} showSidebar={showSidebar} setSidebarTab={setSidebarTab} setShowSidebar={setShowSidebar} onShowSettings={() => setShowSettings(true)} showSettings={showSettings} />
            
            {showSidebar && (
                <>
                    <div className="sidebar-container" style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)' }}>
                        {(() => {
                            if (sidebarTab === 'plugins') return <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => forceUpdate(n => n + 1)} />;
                            const view = views.getView(sidebarTab);
                            if (!view) return null;
                            const Content = view.component;
                            if (typeof Content === 'function') { const Component = Content as React.ComponentType<any>; return <Component />; }
                            return Content as React.ReactNode;
                        })()}
                    </div>
                    <div style={{ width: '4px', cursor: 'col-resize', zIndex: 10 }} className="resize-handle" onMouseDown={startResizing} />
                </>
            )}

            <div className="editor-group-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-editor)' }}>
                <TabBar 
                    files={activeTabs.map(t => {
                        const file = fm.openFiles.find(f => (f.path || f.name) === t.id);
                        return { 
                            path: t.id, 
                            name: t.title, 
                            type: t.type,
                            isDirty: file ? file.content !== file.originalContent : false 
                        };
                    })} 
                    activePath={activeTabId} 
                    onSwitch={(id) => { 
                        setActiveTabId(id); 
                        if (activeTabs.find(t => t.id === id)?.type === 'file') fm.setActiveFilePath(id); 
                    }} 
                    onClose={closeTab} 
                />
                
                <Breadcrumbs path={activeTab?.type === 'file' ? activeTabId : null} />
                
                <div className="main-content-area" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    {activeTab?.type === 'file' && activeFile ? (
                        <div className="editor-instance-wrapper" style={{ flex: 1, height: '100%', overflow: 'hidden' }} key={activeFile.path || activeFile.name}>
                            <Editor content={activeFile.content} fileName={activeFile.name} themeMode={settings.theme} fontSize={settings.font_size} onChange={fm.handleEditorChange} onCursorUpdate={(l, c) => setCursorPos({ line: l, col: c })} editorRef={fm.editorViewRef} />
                            {isMarkdown && <div className="markdown-preview-pane" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}><Preview content={activeFile.content} themeMode={settings.theme} /></div>}
                        </div>
                    ) : activeTab?.type === 'view' ? (
                        <div className="custom-view-wrapper" style={{ flex: 1, height: '100%', backgroundColor: 'var(--bg-primary)' }}>{activeTab.component}</div>
                    ) : (
                        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                            <div className="logo-text" style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>智码 (zyma)</div>
                            <div>{t('NoFile')}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <StatusBar isAdmin={isAdmin} relativePath={relativePath} activeFile={activeFile} cursorPos={cursorPos} getLanguageMode={getLanguageMode} hasUpdate={false} appVersion={appVersion} t={t} />
        {showSettings && <SettingsModal currentSettings={settings} onSave={async (ns) => { setSettings(ns); i18n.changeLanguage(ns.language); await invoke('save_settings', { settings: ns }); }} onClose={() => setShowSettings(false)} platform={platform} />}
        {pendingCloseId && <ConfirmModal title={t('File')} message={t('SaveBeforeClose', { name: fm.openFiles.find(f => (f.path || f.name) === pendingCloseId)?.name })} onSave={async () => { const f = fm.openFiles.find(x => (x.path || x.name) === pendingCloseId); if (await fm.doSave(f || null)) fm.closeFile(pendingCloseId); setPendingCloseId(null); }} onDontSave={() => { fm.closeFile(pendingCloseId); setPendingCloseId(null); }} onCancel={() => setPendingCloseId(null)} />}
    </div>
  );
}

export default App;
