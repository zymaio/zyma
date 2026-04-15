import React from 'react';
import TitleBar from '../components/TitleBar/TitleBar';
import StatusBar from '../components/StatusBar';
import WorkbenchModals from './WorkbenchModals';
import { useKeybindings } from '../hooks/useKeybindings';
import { useBottomPanelResize } from '../components/BottomPanel/useBottomPanelResize';
import type { WorkbenchLogic } from '../hooks/useWorkbenchLogic';
import type { FileManagement } from '../hooks/useFileManagement';
import type { TabItem, CustomViewRequest } from '../hooks/useTabSystem';
import type { AppSettings } from '../components/PluginSystem/types';

// Sub-components
import { WorkbenchLayout } from '../components/ViewSystem/WorkbenchLayout';
import { WorkbenchSidebar } from '../components/ViewSystem/WorkbenchSidebar';
import { WorkbenchEditor } from '../components/ViewSystem/WorkbenchEditor';
import { useWorkbenchController } from '../hooks/useWorkbenchController';

interface WorkbenchAppInit {
    ready: boolean;
    settings: AppSettings;
    setSettings: (s: AppSettings) => void;
    pluginManager: any;
    isAdmin: boolean;
    platform: string;
    appVersion: string;
    productName: string;
    pluginMenus: Array<{ label: string; commandId: string; order?: number; pluginName: string }>;
    handleAppExit: (saveAll: boolean) => Promise<void>;
    [key: string]: unknown;
}

interface WorkbenchProps {
    fm: FileManagement;
    tabSystem: {
        activeTabs: TabItem[];
        activeTabId: string | null;
        activeTab?: TabItem;
        setActiveTabId: (id: string | null) => void;
        closeTab: (id: string) => void;
        openCustomView: (req: CustomViewRequest) => void;
    };
    sidebarResize: {
        sidebarWidth: number;
        startResizing: () => void;
    };
    appInit: WorkbenchAppInit;
    chatComponents: {
        ChatPanel: React.ComponentType<unknown>;
    };
    logic: WorkbenchLogic;
    brand?: { name: string; subName?: string; logo?: React.ReactNode; };
    welcomeExtra?: React.ReactNode;
}

const Workbench: React.FC<WorkbenchProps> = (props) => {
    const { fm, tabSystem, sidebarResize, logic, brand, welcomeExtra } = props;
    const { sidebarWidth, startResizing } = sidebarResize;
    
    // Controller handles logic, commands, and state
    const {
        t, settings, setSettings, isAdmin, platform, appVersion, 
        productName, ready, activeFile, isClosingApp, setIsClosingApp, 
        setIsExiting, handleAppExit, handleCloseTab, onTitleBarAction, pluginManager
    } = useWorkbenchController(props);

    // UI-specific hooks
    const bottomPanel = useBottomPanelResize();
    useKeybindings();

    if (!ready) return null;

    return (
        <WorkbenchLayout>
            <TitleBar 
                onAction={onTitleBarAction} 
                themeMode={settings.theme} 
                isAdmin={isAdmin}
                platform={platform}
                brand={brand}
            />
            
            <div className="main-workbench">
                <WorkbenchSidebar 
                    logic={logic} 
                    sidebarWidth={sidebarWidth} 
                    startResizing={startResizing} 
                    pluginManager={pluginManager} 
                />

                <WorkbenchEditor 
                    activeTabs={tabSystem.activeTabs} 
                    activeTabId={tabSystem.activeTabId} 
                    activeTab={tabSystem.activeTab} 
                    setActiveTabId={tabSystem.setActiveTabId} 
                    handleCloseTab={handleCloseTab} 
                    fm={fm} 
                    activeFile={activeFile} 
                    settings={settings} 
                    productName={productName} 
                    welcomeExtra={welcomeExtra} 
                    bottomPanel={bottomPanel} 
                />
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
                closeTab={tabSystem.closeTab} 
                isClosingApp={isClosingApp} 
                setIsClosingApp={setIsClosingApp} 
                setIsExiting={setIsExiting} 
                handleAppExit={handleAppExit} 
            />
        </WorkbenchLayout>
    );
};

export default Workbench;
