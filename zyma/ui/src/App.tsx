import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { useFileManagement } from './hooks/useFileManagement';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useKeybindings } from './hooks/useKeybindings';
import { useWindowManagement } from './hooks/useWindowManagement';
import { useTabSystem } from './hooks/useTabSystem';
import { useSidebarResize } from './hooks/useSidebarResize';
import ChatPanel from './components/Chat/ChatPanel';
import Workbench from './core/Workbench';
import { WorkbenchProvider } from './core/WorkbenchContext';
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
      pluginMenus, pluginManager, handleAppExit
  } = useAppInitialization(fm, i18n, openCustomView);

  const chatComponents = useMemo(() => ({ 
      ChatPanel: (props: any) => <ChatPanel {...props} settings={settings} getContext={async () => {
          fm.syncCurrentContent(); // 关键点：抓取前同步内容
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
  }), [fm.activeFilePath, settings, fm.syncCurrentContent]);

  useEffect(() => {
      if (ready && pluginManager.current) {
          pluginManager.current.setComponents({ ChatPanel: chatComponents.ChatPanel });
      }
  }, [ready, chatComponents]);

  useKeybindings();

  useEffect(() => {
    if (!ready) return;
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-abyss');
    document.body.classList.add(`theme-${settings.theme}`);
    document.documentElement.style.setProperty('--ui-font-size', (settings.ui_font_size || 13) + 'px');
  }, [ready, settings.theme, settings.ui_font_size]);

  if (!ready) return <div className="loading-screen" style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1b26' }}></div>;

  return (
    <WorkbenchProvider value={{ settings, setSettings, platform, appVersion, isAdmin }}>
        <Workbench 
            fm={fm}
            tabSystem={{ activeTabs, activeTabId, activeTab, setActiveTabId, openCustomView, closeTab }}
            sidebarResize={{ sidebarWidth, startResizing }}
            appInit={{ ready, settings, setSettings, isAdmin, platform, appVersion, pluginMenus, pluginManager, handleAppExit }}
            chatComponents={chatComponents}
        />
    </WorkbenchProvider>
  );
}

export default App;