import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Settings, Info, Monitor } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, ask } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
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
import { keybindings } from './components/KeybindingSystem/KeybindingManager';
import { PluginManager } from './components/PluginSystem/PluginSystem';
import { commands } from './components/CommandSystem/CommandRegistry';
import { useFileManagement } from './hooks/useFileManagement';
import { useAppInitialization } from './hooks/useAppInitialization';
import type { AppSettings } from './components/SettingsModal/SettingsModal';
import * as LucideIcons from 'lucide-react';
import './App.css';
import './components/ResizeHandle.css';

const DynamicIcon = ({ icon, size = 24 }: { icon: any, size?: number }) => {
    if (typeof icon !== 'string') return icon;
    const Icon = (LucideIcons as any)[icon];
    if (Icon) return <Icon size={size} />;
    return <span style={{ fontSize: '12px' }}>{icon}</span>;
};

import PluginsPanel from './components/PluginSystem/PluginsPanel';
import OutputPanel from './components/PluginSystem/OutputPanel';
import ActivityBar from './components/ActivityBar';
import StatusBar from './components/StatusBar';

function App() {
  const { t, i18n } = useTranslation();
  const fm = useFileManagement(t);
  const {
      ready, settings, setSettings, isAdmin, platform, appVersion, hasUpdate,
      activeChannels, pluginMenus, pluginManager, handleAppExit, isExiting
  } = useAppInitialization(fm, i18n);
  
  const [rootPath, setRootPath] = useState<string>(".");
  const [sidebarTab, setSidebarTab] = useState<string>('explorer');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [aboutState, setAboutState] = useState<{show: boolean, autoCheck: boolean, data: any}>({ show: false, autoCheck: false, data: null });
  const [isClosingApp, setIsClosingApp] = useState(false);
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [showSidebar, setShowSidebar] = useState(true);
  const isResizingRef = useRef(false);

  // 统一的状态引用
  const appStateRef = useRef({ settings, cursorPos });
  useEffect(() => { appStateRef.current = { settings, cursorPos }; }, [settings, cursorPos]);

  const activeFile = useMemo(() => {
    if (!fm.activeFilePath) return null;
    return fm.openFiles.find(f => (f.path || f.name) === fm.activeFilePath) || null;
  }, [fm.openFiles, fm.activeFilePath]);

  const isMarkdown = activeFile?.name.toLowerCase().endsWith('.md');
  
  // 计算相对路径
  const relativePath = useMemo(() => {
    if (!activeFile) return t('NoFile');
    const path = activeFile.path || activeFile.name;
    // 同时也对 rootPath 做一次标准化对比
    const normRoot = rootPath.replace(/\\/g, '/');
    return path.startsWith(normRoot) 
      ? path.replace(normRoot, '').replace(/^[\\\/]/, '') 
      : path;
  }, [activeFile, rootPath, t]);

  // 计算语言模式显示
  const getLanguageMode = () => {
      if (!activeFile) return '';
      const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';
      const map: Record<string, string> = {
          'rs': 'Rust', 'js': 'JavaScript', 'ts': 'TypeScript', 'tsx': 'TypeScript', 
          'jsx': 'JavaScript', 'py': 'Python', 'md': 'Markdown', 'html': 'HTML',
          'css': 'CSS', 'json': 'JSON', 'xml': 'XML', 'svg': 'SVG', 'cpp': 'C++', 'toml': 'TOML'
      };
      const langKey = map[ext] || 'Plaintext';
      return t(langKey);
  };

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubViews = views.subscribe(() => forceUpdate(n => n + 1));
    const unsubStatus = statusBar.subscribe(() => forceUpdate(n => n + 1));
    return () => {
        unsubViews();
        unsubStatus();
    };
  }, []);

  const startResizing = useCallback(() => {
      isResizingRef.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; 
  }, []);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => { if (isResizingRef.current) setSidebarWidth(Math.min(Math.max(100, e.clientX - 48), 600)); };
      const handleMouseUp = () => { isResizingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  useEffect(() => {
      const unlistenClose = getCurrentWindow().onCloseRequested(async (e) => {
          if (isExiting) return;
          e.preventDefault();
          if (fm.stateRef.current.openFiles.some(f => f.content !== f.originalContent)) setIsClosingApp(true);
          else handleAppExit(false);
      });

      return () => { 
          unlistenClose.then(f => f()); 
      };
  }, [isExiting, handleAppExit, fm.stateRef]);

  useEffect(() => {
      if (!ready) return;
      setupWorkbench(t, {
          handleNewFile: fm.handleNewFile,
          handleSave: (force) => fm.doSave(fm.openFiles.find(f => (f.path || f.name) === fm.activeFilePath) || null, force),
          handleSaveSettings: async (ns) => { setSettings(ns); i18n.changeLanguage(ns.language); try { await invoke('save_settings', { settings: ns }); } catch (e) { alert(e); } },
          getSettings: () => appStateRef.current.settings,
          setShowCommandPalette,
          setShowSearch, 
          setSidebarTab: (id) => setSidebarTab(id as any), 
          toggleSidebar: () => setShowSidebar(prev => !prev),
          components: {
              Sidebar: <Sidebar 
                  rootPath={rootPath} 
                  onFileSelect={fm.handleFileSelect} 
                  onFileDelete={fm.closeFile} 
                  activeFilePath={fm.activeFilePath} 
                  pluginMenuItems={pluginMenus} 
              />,
              SearchPanel: <SearchPanel rootPath={rootPath} onFileSelect={fm.handleFileSelect} />,
              PluginList: () => (
                  <PluginsPanel 
                      pluginManager={pluginManager.current} 
                      onUpdate={() => forceUpdate(n => n + 1)} 
                  />
              )
          }
      });
  }, [ready, rootPath, pluginMenus, t, fm, i18n]);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${settings.theme}`);
    document.documentElement.style.setProperty('--ui-font-size', (settings.ui_font_size || 13) + 'px');
  }, [settings.theme, settings.ui_font_size]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => { if (keybindings.handleKeyEvent(e)) e.stopPropagation(); };
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  useEffect(() => {
    const updateTitle = async () => {
        const win = getCurrentWindow();
        const displayPath = rootPath === '.' ? 'Zyma' : rootPath;
        await win.setTitle(`${displayPath} - 智码 (Zyma)`);
    };
    updateTitle();
  }, [rootPath]);

  if (!ready) return <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1e1e1e' }}></div>;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column' }}>
        <TitleBar onAction={(action) => {
            switch (action) {
                case 'new_file': commands.executeCommand('file.new'); break;
                case 'open_folder': open({ directory: true }).then(sel => { if (sel) { setRootPath(sel as string); fm.setOpenFiles([]); fm.setActiveFilePath(null); } }); break;
                case 'save': commands.executeCommand('file.save'); break;
                case 'save_as': commands.executeCommand('file.saveAs'); break;
                case 'exit': handleAppExit(false); break;
                case 'undo': if (fm.editorViewRef.current) undo(fm.editorViewRef.current); break;
                case 'redo': if (fm.editorViewRef.current) redo(fm.editorViewRef.current); break;
                case 'toggle_theme': commands.executeCommand('view.toggleTheme'); break;
                case 'check_update': setAboutState({ show: true, autoCheck: true, data: null }); break;
                case 'about': setAboutState({ show: true, autoCheck: false, data: null }); break;
            }
        }} themeMode={settings.theme} isAdmin={isAdmin} platform={platform} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <ActivityBar 
                sidebarTab={sidebarTab} 
                showSidebar={showSidebar} 
                setSidebarTab={setSidebarTab} 
                setShowSidebar={setShowSidebar} 
                activeChannels={activeChannels} 
                onShowSettings={() => setShowSettings(true)} 
                showSettings={showSettings} 
            />
            {showSidebar && (
                <>
                    <div style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {(() => {
                            // 核心修复：如果是内置的扩展面板，直接渲染稳定组件，不经过动态 ViewRegistry 转发匿名函数
                            if (sidebarTab === 'plugins') {
                                return <PluginsPanel 
                                    pluginManager={pluginManager.current} 
                                    onUpdate={() => forceUpdate(n => n + 1)} 
                                />;
                            }
                            const view = views.getView(sidebarTab);
                            if (!view) return null;
                            const Content = view.component;
                            if (typeof Content === 'function') {
                                const Component = Content as React.ComponentType;
                                return <Component />;
                            }
                            return Content;
                        })()}
                    </div>
                    <div style={{ width: '4px', cursor: 'col-resize', zIndex: 10 }} className="resize-handle" onMouseDown={startResizing} />
                </>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TabBar 
                    files={fm.openFiles.map(f => ({ 
                        path: f.path || f.name, 
                        name: f.name, 
                        isDirty: f.content !== f.originalContent 
                    }))} 
                    activePath={fm.activeFilePath} 
                    onSwitch={(id) => fm.setActiveFilePath(id)} 
                    onClose={(id) => { 
                        const f = fm.openFiles.find(x => (x.path || x.name) === id); 
                        if (f && f.content !== f.originalContent) setPendingCloseId(id); 
                        else fm.closeFile(id); 
                    }} 
                />
                <Breadcrumbs path={fm.activeFilePath} />
                {activeFile ? (
                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }} key={(activeFile.path || activeFile.name).replace(/\\/g, '/').toLowerCase()}>
                            <Editor content={activeFile.content} fileName={activeFile.name} themeMode={settings.theme} fontSize={settings.font_size} onChange={fm.handleEditorChange} onCursorUpdate={(l, c) => setCursorPos({ line: l, col: c })} editorRef={fm.editorViewRef} />
                        </div>
                        <EditorSearch visible={showSearch} onClose={() => setShowSearch(false)} onSearch={(q, o) => { if (!fm.editorViewRef.current) return; const query = new SearchQuery({ search: q, caseSensitive: o.matchCase, wholeWord: o.wholeWord, regexp: o.useRegex }); fm.editorViewRef.current.dispatch({ effects: setSearchQuery.of(query) }); }} onNext={() => fm.editorViewRef.current && findNext(fm.editorViewRef.current)} onPrev={() => fm.editorViewRef.current && findPrevious(fm.editorViewRef.current)} />
                        {isMarkdown && <div style={{ flex: 1, height: '100%', overflow: 'hidden', borderLeft: '1px solid var(--border-color)' }}><Preview content={activeFile.content} themeMode={settings.theme} /></div>}
                    </div>
                ) : (
                    <div className="empty-state"><div className="logo-text">智码 (zyma)</div><div>{t('NoFile')}</div></div>
                )}
            </div>
        </div>

        <StatusBar 
            isAdmin={isAdmin} 
            relativePath={relativePath} 
            activeFile={activeFile} 
            cursorPos={cursorPos} 
            getLanguageMode={getLanguageMode} 
            hasUpdate={hasUpdate} 
            appVersion={appVersion} 
            t={t} 
        />
        {showSettings && <SettingsModal currentSettings={settings} onSave={async (ns) => { setSettings(ns); i18n.changeLanguage(ns.language); await invoke('save_settings', { settings: ns }); }} onClose={() => setShowSettings(false)} platform={platform} />}
        {aboutState.show && <AboutModal onClose={() => setAboutState({ ...aboutState, show: false })} autoCheck={aboutState.autoCheck} version={appVersion} />}
        <CommandPalette visible={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        {pendingCloseId && <ConfirmModal title={t('File')} message={t('SaveBeforeClose', { name: fm.openFiles.find(f => (f.path || f.name) === pendingCloseId)?.name })} onSave={async () => { const f = fm.openFiles.find(x => (x.path || x.name) === pendingCloseId); if (await fm.doSave(f || null)) fm.closeFile(pendingCloseId); setPendingCloseId(null); }} onDontSave={() => { fm.closeFile(pendingCloseId); setPendingCloseId(null); }} onCancel={() => setPendingCloseId(null)} />}
        {isClosingApp && <ConfirmModal title="zyma" message={t('SaveBeforeClose', { name: t('AllFiles') })} onSave={() => handleAppExit(true)} onDontSave={() => handleAppExit(false)} onCancel={() => setIsClosingApp(false)} />}
    </div>
  );
}

export default App;