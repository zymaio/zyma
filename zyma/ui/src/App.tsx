import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Settings, Info } from 'lucide-react';
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

function App() {
  const { t, i18n } = useTranslation();
  const [ready, setReady] = useState(false);
  const fm = useFileManagement(t); // 使用 fm (File Manager) 命名空间
  
  const [rootPath, setRootPath] = useState<string>(".");
  const [sidebarTab, setSidebarTab] = useState<string>('explorer');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [aboutState, setAboutState] = useState<{show: boolean, autoCheck: boolean, data: any}>({ show: false, autoCheck: false, data: null });
  const [isAdmin, setIsAdmin] = useState(false);
  const [platform, setPlatform] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [isClosingApp, setIsClosingApp] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [hasUpdate, setHasUpdate] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [showSidebar, setShowSidebar] = useState(true);
  const [pluginMenus, setPluginMenus] = useState<any[]>([]); // 记录插件菜单状态
  const isResizingRef = useRef(false);
  const isExitingRef = useRef(false);
  const initialArgsProcessed = useRef(false);
  const processedPaths = useRef(new Set<string>());

  const [settings, setSettings] = useState<AppSettings>({
      theme: 'dark', font_size: 14, ui_font_size: 13, tab_size: 4, language: 'zh-CN', context_menu: false, single_instance: true, auto_update: true,
      window_width: 800, window_height: 600, window_x: 0, window_y: 0, is_maximized: false
  });

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

  const pluginManager = useRef<PluginManager | null>(null);
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

  const handleAppExit = async (saveAll: boolean) => {
      if (saveAll) {
          const dirtyFiles = fm.openFiles.filter(f => f.content !== f.originalContent);
          for (const file of dirtyFiles) await fm.doSave(file);
      }
      isExitingRef.current = true;
      try { await invoke('save_window_state'); } catch (e) {}
      await getCurrentWindow().destroy(); 
  };

  useEffect(() => {
      let unlistenSingleInstance: (() => void) | null = null;

      const startApp = async () => {
          try {
              if (getCurrentWindow().label !== 'main') { setReady(true); return; }
              const [saved, adminStatus, plat, args, version, cwd] = await Promise.all([
                  invoke<AppSettings>('load_settings'), invoke<boolean>('is_admin'),
                  invoke<string>('get_platform'), invoke<string[]>('get_cli_args'), 
                  invoke<string>('get_app_version'), invoke<string>('get_cwd')
              ]);
              
              if (rootPath === '.') setRootPath(cwd);
              const finalRootPath = rootPath === '.' ? cwd : rootPath;

              setSettings(saved); setAppVersion(version); i18n.changeLanguage(saved.language); 
              setIsAdmin(adminStatus); setPlatform(plat);

              // 1. 自动更新右键菜单路径（如果已开启）
              if (saved.context_menu && (plat === 'windows' || plat === 'win32')) {
                  invoke("manage_context_menu", { enable: true, label: t('ContextMenuLabel') }).catch(() => {});
              }

              // 2. 自动检查更新
              if (saved.auto_update) {
                  import('@tauri-apps/plugin-updater').then(({ check }) => {
                      check().then(update => {
                          if (update) setHasUpdate(true);
                      }).catch(() => {});
                  });
              }
              
              console.log("[Zyma] Starting initialization flow...");
              // 添加强力弹窗，确认代码已执行
              // alert("Zyma Frontend Initialization Started!");

              // 1. 先实例化插件管理器
              if (!pluginManager.current) {
                  console.log("[Zyma] Initializing Plugin Engine...");
                  pluginManager.current = new PluginManager({
                      insertText: (text) => {
                          const active = fm.openFiles.find(f => (f.path || f.name) === fm.activeFilePath);
                          if (active) fm.handleEditorChange(active.content + text);
                      }, 
                      getContent: () => fm.openFiles.find(f => (f.path || f.name) === fm.activeFilePath)?.content || "", 
                      notify: (m) => alert(`[Plugin] ${m}`),
                      onMenuUpdate: () => {
                          setPluginMenus(pluginManager.current?.getFileMenuItems() || []);
                          forceUpdate(n => n + 1);
                      },
                      showDiff: async (path, content, title) => {
                          const confirmed = await ask(`是否应用 [${title || 'AI'}] 对文件 ${path} 的建议修改？`, { title: 'Zyma Diff', kind: 'info' });
                          if (confirmed) {
                              try {
                                  await invoke('write_file', { path, content });
                                  fm.handleEditorChange(content);
                              } catch (e) { alert("Error: " + e); }
                          }
                      }
                  });
                  pluginManager.current.loadAll();
              }

              // 2. 再配置工作区视图
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
                          rootPath={finalRootPath} 
                          onFileSelect={fm.handleFileSelect} 
                          onFileDelete={fm.closeFile} 
                          activeFilePath={fm.activeFilePath} 
                          pluginMenuItems={pluginMenus} 
                      />,
                      SearchPanel: <SearchPanel rootPath={finalRootPath} onFileSelect={fm.handleFileSelect} />,
                      PluginList: () => (
                          <PluginsPanel 
                              pluginManager={pluginManager.current} 
                              onUpdate={() => forceUpdate(n => n + 1)} 
                          />
                      )
                  }
              });

              const openFileFromArgs = (argList: string[]) => {
                  if (argList.length > 1) {
                      const possibleFile = argList[argList.length - 1];
                      if (possibleFile && !possibleFile.toLowerCase().endsWith('zyma.exe') && 
                         (possibleFile.includes(":") || possibleFile.startsWith("/"))) {
                          
                          const norm = possibleFile.replace(/\\/g, '/').toLowerCase();
                          // 即使是重复路径，我们也执行一次激活切换，但如果是新路径则正常打开
                          fm.handleFileSelect(possibleFile, possibleFile.split(/[\\/]/).pop() || possibleFile);
                          processedPaths.current.add(norm);
                      }
                  }
              };

              // 重点：只有在第一次启动时处理原始命令行参数
              if (!initialArgsProcessed.current) {
                  openFileFromArgs(args);
                  initialArgsProcessed.current = true;
              }

              // 设置单实例监听
              const cleanup = await listen<string[]>("single-instance", (event) => {
                  openFileFromArgs(event.payload);
                  getCurrentWindow().setFocus();
              });
              unlistenSingleInstance = () => cleanup();

              setReady(true);
          } catch (e) { console.error("Init Error:", e); setReady(true); }
      };

      startApp();
      const unlistenClose = getCurrentWindow().onCloseRequested(async (e) => {
          if (isExitingRef.current) return;
          e.preventDefault();
          if (fm.stateRef.current.openFiles.some(f => f.content !== f.originalContent)) setIsClosingApp(true);
          else handleAppExit(false);
      });

      return () => { 
          if (unlistenSingleInstance) unlistenSingleInstance();
          unlistenClose.then(f => f()); 
      };
  }, [fm.handleFileSelect, i18n, t, rootPath]);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${settings.theme}`);
    document.documentElement.style.setProperty('--ui-font-size', (settings.ui_font_size || 13) + 'px');
  }, [settings.theme, settings.ui_font_size]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => { if (keybindings.handleKeyEvent(e)) e.stopPropagation(); };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
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
            <div className="activity-bar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
                    {views.getViews().map(view => (
                        <div 
                            key={view.id} 
                            className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`} 
                            onClick={() => { 
                                if (sidebarTab === view.id && showSidebar) {
                                    setShowSidebar(false); 
                                } else { 
                                    setSidebarTab(view.id); 
                                    setShowSidebar(true); 
                                } 
                            }} 
                            title={view.title}
                        >
                            <DynamicIcon icon={view.icon} />
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1 }}></div>
                <div style={{ marginBottom: '15px' }}><div className={`activity-icon ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(true)} title={t('Settings')}><Settings size={24} /></div></div>
            </div>
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
        <div className="status-bar">
            {/* 左侧区域：主要显示当前文件和插件注入项 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isAdmin && <span style={{ backgroundColor: '#e81123', color: '#fff', padding: '0 4px', borderRadius: '2px', fontSize: 'calc(var(--ui-font-size) - 3px)', fontWeight: 'bold' }}>{t('Administrator')}</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.9 }} title={activeFile?.path || ''}>
                    {relativePath}
                </div>
                {statusBar.getItems('left').map(item => <div key={item.id} title={item.tooltip} onClick={item.onClick} style={{ cursor: item.onClick ? 'pointer' : 'default', padding: '0 5px' }}>{item.text}</div>)}
            </div>

            <div style={{ flex: 1 }}></div>

            {/* 右侧区域：按 IDE 习惯从右往左排列关键信息 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* 1. 光标位置 */}
                <div title={t('Line') + '/' + t('Column')}>
                    {`${t('Ln')} ${cursorPos.line}, ${t('Col')} ${cursorPos.col}`}
                </div>

                {/* 2. 制表符 */}
                <div style={{ opacity: 0.8 }}>{t('Spaces')}: 4</div>

                {/* 3. 编码 */}
                <div style={{ opacity: 0.8 }}>{t('UTF8')}</div>

                {/* 4. 语言模式 */}
                <div style={{ fontWeight: '500' }}>{getLanguageMode()}</div>

                {/* 5. 未保存标记 */}
                <div style={{ minWidth: '60px', textAlign: 'right' }}>
                    {activeFile && activeFile.content !== activeFile.originalContent ? '● ' + t('Unsaved') : ''}
                </div>

                {/* 6. 插件右侧项 */}
                {statusBar.getItems('right').map(item => (
                    item.id !== 'editor-cursor' && (
                        <div key={item.id} title={item.tooltip} onClick={item.onClick} style={{ cursor: item.onClick ? 'pointer' : 'default', padding: '0 5px', display: 'flex', alignItems: 'center' }}>
                            {item.text}
                        </div>
                    )
                ))}

                {/* 7. 版本号 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: 0.8, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '10px', position: 'relative' }} onClick={() => commands.executeCommand('about')}>
                    {hasUpdate && <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: '#52c41a', borderRadius: '50%', border: '1px solid var(--bg-statusbar)' }} title={t('UpdateAvailable')} />}
                    <Info size={14} />
                    <span>{appVersion}</span>
                </div>
            </div>
        </div>
        {showSettings && <SettingsModal currentSettings={settings} onSave={async (ns) => { setSettings(ns); i18n.changeLanguage(ns.language); await invoke('save_settings', { settings: ns }); }} onClose={() => setShowSettings(false)} platform={platform} />}
        {aboutState.show && <AboutModal onClose={() => setAboutState({ ...aboutState, show: false })} autoCheck={aboutState.autoCheck} version={appVersion} />}
        <CommandPalette visible={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        {pendingCloseId && <ConfirmModal title={t('File')} message={t('SaveBeforeClose', { name: fm.openFiles.find(f => (f.path || f.name) === pendingCloseId)?.name })} onSave={async () => { const f = fm.openFiles.find(x => (x.path || x.name) === pendingCloseId); if (await fm.doSave(f || null)) fm.closeFile(pendingCloseId); setPendingCloseId(null); }} onDontSave={() => { fm.closeFile(pendingCloseId); setPendingCloseId(null); }} onCancel={() => setPendingCloseId(null)} />}
        {isClosingApp && <ConfirmModal title="zyma" message={t('SaveBeforeClose', { name: t('AllFiles') })} onSave={() => handleAppExit(true)} onDontSave={() => handleAppExit(false)} onCancel={() => setIsClosingApp(false)} />}
    </div>
  );
}

export default App;