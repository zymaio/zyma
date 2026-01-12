import { useState, useEffect, useCallback, useRef } from 'react';
import { Files, Search, Settings, Puzzle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import './i18n';

import Sidebar from './components/Sidebar/Sidebar';
import TabBar from './components/TabBar/TabBar';
import Editor from './components/Editor/Editor';
import Preview from './components/Preview/Preview';
import SearchPanel from './components/SearchPanel/SearchPanel';
import TitleBar from './components/TitleBar/TitleBar';
import SettingsModal from './components/SettingsModal/SettingsModal';
import ConfirmModal from './components/ConfirmModal/ConfirmModal';
import { PluginManager } from './components/PluginSystem/PluginSystem';
import type { AppSettings } from './components/SettingsModal/SettingsModal';
import './App.css';

interface OpenedFile {
    path: string;
    name: string;
    content: string;
    originalContent: string;
}

function App() {
  const { t, i18n } = useTranslation();
  const [ready, setReady] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenedFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState<string>(".");
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'search' | 'plugins'>('explorer');
  const [untitledCount, setUntitledCount] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [platform, setPlatform] = useState<string>("");
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [isClosingApp, setIsClosingApp] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
      theme: 'dark', font_size: 14, tab_size: 4, language: 'zh-CN', context_menu: false, single_instance: true
  });

  const stateRef = useRef({ openFiles, activeFilePath, settings, untitledCount });
  useEffect(() => { stateRef.current = { openFiles, activeFilePath, settings, untitledCount }; }, [openFiles, activeFilePath, settings, untitledCount]);

  const activeFile = openFiles.find(f => (f.path || f.name) === activeFilePath) || null;
  const isMarkdown = activeFile?.name.toLowerCase().endsWith('.md');

  const pluginManager = useRef<PluginManager | null>(null);

  const handleFileSelect = useCallback(async (path: string, name: string) => {
    const cleanPath = path.replace(/^"(.*)"$/, '$1');
    const existing = stateRef.current.openFiles.find(f => f.path === cleanPath);
    if (existing) {
        setActiveFilePath(cleanPath);
        return;
    }
    try {
        const content = await invoke<string>('read_file', { path: cleanPath });
        const newFile: OpenedFile = { path: cleanPath, name: name.replace(/^"(.*)"$/, '$1'), content, originalContent: content };
        setOpenFiles(prev => {
            if (prev.some(f => f.path === cleanPath)) return prev;
            return [...prev, newFile];
        });
        setActiveFilePath(cleanPath);
    } catch (error) { 
        console.error('File open error:', error);
    }
  }, []);

  const processArgs = useCallback((args: string[]) => {
      if (args.length > 1) {
          const fileToOpen = args[args.length - 1];
          if (fileToOpen.includes(":") && !fileToOpen.toLowerCase().endsWith("zyma.exe")) {
              const name = fileToOpen.split(/[\\/]/).pop() || fileToOpen;
              handleFileSelect(fileToOpen, name);
          }
      }
  }, [handleFileSelect]);

  const insertTextAtCursor = useCallback((text: string) => {
      setOpenFiles(prev => prev.map(f => 
        (f.path || f.name) === stateRef.current.activeFilePath ? { ...f, content: f.content + text } : f
      ));
  }, []);

  const getCurrentContent = useCallback(() => {
      const active = stateRef.current.openFiles.find(f => (f.path || f.name) === stateRef.current.activeFilePath);
      return active ? active.content : "";
  }, []);

  // Optimized Initialization
  useEffect(() => {
      const startApp = async () => {
          try {
              // 🚀 PARALLEL STARTUP: Execute all core backend calls at once
              const [saved, adminStatus, plat, args] = await Promise.all([
                  invoke<AppSettings>('load_settings'),
                  invoke<boolean>('is_admin'),
                  invoke<string>('get_platform'),
                  invoke<string[]>('get_cli_args')
              ]);

              // Apply results immediately
              setSettings(saved);
              i18n.changeLanguage(saved.language);
              setIsAdmin(adminStatus);
              setPlatform(plat);

              // Initialize Plugin Manager
              pluginManager.current = new PluginManager({
                  insertText: insertTextAtCursor,
                  getContent: getCurrentContent,
                  notify: (msg) => alert(`[Plugin] ${msg}`)
              });
              
              // Load plugins separately to not block UI ready state
              pluginManager.current.loadAll();

              // Open file from args
              processArgs(args);
              
              // App is ready to show
              setReady(true);
          } catch (e) { 
              console.error('Init error:', e); 
              setReady(true); 
          }
      };
      startApp();

      const unlistenSingleInstance = listen<string[]>("single-instance", (event) => {
          const win = getCurrentWindow();
          win.unminimize().catch(() => {});
          win.setFocus().catch(() => {});
          processArgs(event.payload);
      });

      const win = getCurrentWindow();
      const unlistenClose = win.onCloseRequested(async (event) => {
          event.preventDefault();
          const hasDirty = stateRef.current.openFiles.some(f => f.content !== f.originalContent);
          if (hasDirty) { setIsClosingApp(true); } else { invoke('exit_app'); }
      });

      return () => {
          unlistenSingleInstance.then(f => f());
          unlistenClose.then(f => f());
      };
  }, [processArgs, insertTextAtCursor, getCurrentContent, i18n]);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${settings.theme}`);
  }, [settings.theme]);

  const handleSaveSettings = async (newSettings: AppSettings) => {
      setSettings(newSettings);
      i18n.changeLanguage(newSettings.language);
      try { await invoke('save_settings', { settings: newSettings }); } catch (e) { alert(e); }
  };

  const handleNewFile = useCallback(() => {
      const currentCount = stateRef.current.untitledCount;
      const name = `${t('NewFile')}-${currentCount}`;
      const newFile: OpenedFile = { path: "", name, content: "", originalContent: "" };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFilePath(name);
      setUntitledCount(prev => prev + 1);
  }, [t]);

  const doSave = async (targetFile: OpenedFile | null, forceDialog = false) => {
      if (!targetFile) return false;
      let savePath = targetFile.path;
      if (!savePath || forceDialog) {
          const selected = await save({ defaultPath: savePath || targetFile.name, filters: [{ name: 'Files', extensions: ['*'] }] });
          if (!selected) return false;
          savePath = selected;
      }
      try {
          await invoke('write_file', { path: savePath, content: targetFile.content });
          const newName = savePath.split(/[\\/]/).pop() || targetFile.name;
          setOpenFiles(prev => prev.map(f => 
            (f.path === targetFile.path && f.name === targetFile.name) 
                ? { ...f, path: savePath, name: newName, originalContent: f.content } : f
          ));
          setActiveFilePath(savePath);
          return true;
      } catch (e) { alert('Failed to save: ' + e); return false; }
  };

  const handleSave = (forceDialog = false) => {
      const currentActive = stateRef.current.openFiles.find(f => (f.path || f.name) === stateRef.current.activeFilePath) || null;
      doSave(currentActive, forceDialog);
  };

  const forceCloseFile = (id: string) => {
      setOpenFiles(prev => {
          const newFiles = prev.filter(f => (f.path || f.name) !== id);
          if (stateRef.current.activeFilePath === id) {
              setActiveFilePath(newFiles.length > 0 ? (newFiles[newFiles.length - 1].path || newFiles[newFiles.length - 1].name) : null);
          }
          return newFiles;
      });
      setPendingCloseId(null);
  };

  const handleCloseFile = (id: string) => {
      const file = stateRef.current.openFiles.find(f => (f.path || f.name) === id);
      if (!file) return;
      if (file.content !== file.originalContent) {
          setPendingCloseId(id);
      } else {
          forceCloseFile(id);
      }
  };

  const handleEditorChange = useCallback((val: string) => {
    setOpenFiles(prev => prev.map(f => 
        (f.path || f.name) === stateRef.current.activeFilePath ? { ...f, content: val } : f
    ));
  }, [activeFilePath]);

  const handleAction = (action: string) => {
      switch (action) {
          case 'new_file': handleNewFile(); break;
          case 'open_folder': handleOpenFolder(); break;
          case 'save': handleSave(false); break;
          case 'save_as': handleSave(true); break;
          case 'exit': invoke('exit_app'); break;
          case 'toggle_theme': handleSaveSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' }); break;
          case 'about': alert(`智码 (zyma) v1.0.0`); break;
      }
  };

  const handleOpenFolder = async () => {
      try {
          const selected = await open({ directory: true, multiple: false });
          if (selected && typeof selected === 'string') {
              setRootPath(selected);
              setOpenFiles([]);
              setActiveFilePath(null);
          }
      } catch (e) { console.error(e); }
  };

  const handleAppExit = async (saveAll: boolean) => {
      if (saveAll) {
          const dirtyFiles = stateRef.current.openFiles.filter(f => f.content !== f.originalContent);
          for (const file of dirtyFiles) { await doSave(file); }
      }
      await invoke('exit_app');
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey || e.metaKey) {
            const { settings: s } = stateRef.current;
            switch(e.key.toLowerCase()) {
                case 's': e.preventDefault(); handleSave(e.shiftKey); break; 
                case 'n': e.preventDefault(); handleNewFile(); break;
                case '=':
                case '+': e.preventDefault(); handleSaveSettings({ ...s, font_size: s.font_size + 1 }); break;
                case '-': e.preventDefault(); handleSaveSettings({ ...s, font_size: Math.max(8, s.font_size - 1) }); break;
                case '0': e.preventDefault(); handleSaveSettings({ ...s, font_size: 14 }); break;
            }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewFile]);

  if (!ready) {
      return <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1e1e1e' }}></div>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column' }}>
        <TitleBar onAction={handleAction} themeMode={settings.theme} isAdmin={isAdmin} platform={platform} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div className="activity-bar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
                    <div className={`activity-icon ${sidebarTab === 'explorer' ? 'active' : ''}`} onClick={() => setSidebarTab('explorer')} title={t('Explorer')}><Files size={24} /></div>
                    <div className={`activity-icon ${sidebarTab === 'search' ? 'active' : ''}`} onClick={() => setSidebarTab('search')} title={t('Search')}><Search size={24} /></div>
                    <div className={`activity-icon ${sidebarTab === 'plugins' ? 'active' : ''}`} onClick={() => setSidebarTab('plugins')} title="Plugins"><Puzzle size={24} /></div>
                </div>
                <div style={{ flex: 1 }}></div>
                <div style={{ marginBottom: '15px' }}>
                    <div className={`activity-icon ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(true)} title={t('Settings')}><Settings size={24} /></div>
                </div>
            </div>

            {sidebarTab === 'explorer' && <Sidebar rootPath={rootPath} onFileSelect={handleFileSelect} onFileDelete={handleCloseFile} />}
            {sidebarTab === 'search' && <SearchPanel rootPath={rootPath} onFileSelect={handleFileSelect} />}
            {sidebarTab === 'plugins' && (
                <div style={{ width: '250px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', padding: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Plugins</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>Manage your extensions here (Coming Soon)</div>
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TabBar files={openFiles.map(f => ({ path: f.path || f.name, name: f.name, isDirty: f.content !== f.originalContent }))} activePath={activeFilePath} onSwitch={setActiveFilePath} onClose={handleCloseFile} />
                {activeFile ? (
                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                            <Editor key={activeFilePath} content={activeFile.content} fileName={activeFile.name} themeMode={settings.theme} fontSize={settings.font_size} onChange={handleEditorChange} />
                        </div>
                        {isMarkdown && <div style={{ flex: 1, height: '100%', overflow: 'hidden', borderLeft: '1px solid var(--border-color)' }}><Preview content={activeFile.content} themeMode={settings.theme} /></div>}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="logo-text">智码 (zyma)</div>
                        <div>{t('NoFile')}</div>
                    </div>
                )}
            </div>
        </div>
        <div className="status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {isAdmin && <span style={{ backgroundColor: '#e81123', color: '#fff', padding: '0 4px', borderRadius: '2px', fontSize: '10px', fontWeight: 'bold' }}>{t('Administrator')}</span>}
                {activeFile ? (activeFile.path || activeFile.name) : t('NoFile')}
            </div>
            <div style={{ flex: 1 }}></div>
            <div>{activeFile && activeFile.content !== activeFile.originalContent ? '● ' + t('Unsaved') : ''}</div>
            <div style={{ marginLeft: '15px' }}>{rootPath}</div>
        </div>
        {showSettings && <SettingsModal currentSettings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} platform={platform} />}
        
        {pendingCloseId && (
            <ConfirmModal 
                title={t('File')}
                message={t('SaveBeforeClose', { name: openFiles.find(f => (f.path || f.name) === pendingCloseId)?.name })}
                onSave={async () => {
                    const file = openFiles.find(f => (f.path || f.name) === pendingCloseId);
                    const saved = await doSave(file || null);
                    if (saved) forceCloseFile(pendingCloseId);
                }}
                onDontSave={() => forceCloseFile(pendingCloseId)}
                onCancel={() => setPendingCloseId(null)}
            />
        )}
        {isClosingApp && (
            <ConfirmModal title="zyma" message={t('SaveBeforeClose', { name: t('all files') })} onSave={() => handleAppExit(true)} onDontSave={() => handleAppExit(false)} onCancel={() => setIsClosingApp(false)} />
        )}
    </div>
  );
}

export default App;