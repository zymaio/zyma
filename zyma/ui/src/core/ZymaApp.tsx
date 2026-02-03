import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Workbench from './Workbench';
import { WorkbenchProvider } from './WorkbenchContext';
import { useFileManagement } from '../hooks/useFileManagement';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { useTabSystem } from '../hooks/useTabSystem';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { useWorkbenchLogic } from '../hooks/useWorkbenchLogic';
import ChatPanel from '../components/Chat/ChatPanel';
import '../i18n'; // 确保 i18n 初始化

// 核心：由底座入口统一加载所有样式
import '../index.css';
import '../App.css';
import '../components/TitleBar/TitleBar.css';
import '../components/Common/WelcomeScreen.css';

export interface ZymaAppProps {
    brand?: {
        name: string;
        subName?: string;
        logo?: React.ReactNode;
    };
    welcomeExtra?: React.ReactNode;
}

export const ZymaApp: React.FC<ZymaAppProps> = ({ brand, welcomeExtra }) => {
    const { i18n } = useTranslation();
    
    // 1. 初始化基础驱动器
    const fm = useFileManagement(); 
    const tabSystem = useTabSystem(fm);
    const sidebarResize = useSidebarResize();
    const appInit = useAppInitialization(fm, i18n, tabSystem.openCustomView);

    // 2. 初始化核心逻辑 (包含工作区切换监听)
    const logic = useWorkbenchLogic({ fm, tabSystem, appInit });

    // 3. 同步主题与语言
    useEffect(() => {
        if (appInit.ready) {
            // 同步主题
            const theme = appInit.settings.theme || 'dark';
            const root = window.document.documentElement;
            root.classList.remove('theme-dark', 'theme-light', 'theme-abyss');
            root.classList.add(`theme-${theme}`);
            root.style.setProperty('--ui-font-size', `${appInit.settings.ui_font_size || 13}px`);
            
            // 同步语言
            if (i18n && typeof i18n.changeLanguage === 'function' && i18n.language !== appInit.settings.language) {
                i18n.changeLanguage(appInit.settings.language);
            }
        }
    }, [appInit.ready, appInit.settings.theme, appInit.settings.ui_font_size, appInit.settings.language, i18n]);

    // 4. 定义默认组件 (注入给插件系统使用)
    const chatComponents = useMemo(() => ({ 
        ChatPanel: (props: any) => (
            <ChatPanel 
                {...props} 
                settings={appInit.settings} 
                getContext={async () => {
                    const editor = fm.editorViewRef.current;
                    let selection = null;
                    let fileContent = null;
                    if (editor) {
                        const sel = editor.state.selection.main;
                        if (!sel.empty) selection = editor.state.doc.sliceString(sel.from, sel.to);
                        fileContent = editor.state.doc.toString();
                    }
                    return { filePath: fm.activeFilePath, selection, fileContent };
                }} 
            />
        )
    }), [fm.activeFilePath, fm.editorViewRef, appInit.settings]);

    // 5. 联动插件系统
    useEffect(() => {
        if (appInit.ready && appInit.pluginManager.current) {
            appInit.pluginManager.current.setComponents({ ChatPanel: chatComponents.ChatPanel });
        }
    }, [appInit.ready, chatComponents]);

    // 6. 构造全局上下文 (关键：连接 logic 状态)
    const { settings, setSettings, platform, appVersion, isAdmin, productName: initProductName, handleAppExit, pluginMenus, pluginManager } = appInit;
    const { rootPath, setRootPath } = logic;
    const { activeTabId, setActiveTabId } = tabSystem;

    const contextValue = useMemo(() => ({
        settings, setSettings, platform, appVersion, isAdmin,
        productName: brand?.name || initProductName,
        rootPath, setRootPath, activeTabId, setActiveTabId, fm, handleAppExit
    }), [settings, setSettings, platform, appVersion, isAdmin, brand?.name, initProductName, rootPath, setRootPath, activeTabId, setActiveTabId, fm, handleAppExit]);

    if (!appInit.ready) return null;

    return (
        <WorkbenchProvider value={contextValue as any}>
            <Workbench 
                fm={fm}
                tabSystem={tabSystem}
                sidebarResize={sidebarResize}
                chatComponents={chatComponents}
                appInit={appInit}
                logic={logic}
                brand={brand}
                welcomeExtra={welcomeExtra}
            />
        </WorkbenchProvider>
    );
};