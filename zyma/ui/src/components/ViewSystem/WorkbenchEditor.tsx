import React from 'react';
import TabBar from '../TabBar/TabBar';
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs';
import WorkbenchMain from '../../core/WorkbenchMain';
import BottomPanel from '../BottomPanel/BottomPanel';
import { invoke } from '@tauri-apps/api/core';

interface WorkbenchEditorProps {
    activeTabs: any[];
    activeTabId: string | null;
    activeTab: any;
    setActiveTabId: (id: string | null) => void;
    handleCloseTab: (id: string) => void;
    fm: any;
    activeFile: any;
    settings: any;
    productName: string;
    welcomeExtra?: React.ReactNode;
    bottomPanel: any;
}

export const WorkbenchEditor: React.FC<WorkbenchEditorProps> = ({
    activeTabs, activeTabId, activeTab, setActiveTabId, handleCloseTab, fm,
    activeFile, settings, productName, welcomeExtra, bottomPanel
}) => {
    return (
        <div className="editor-group-container">
            <TabBar 
                files={activeTabs.map((t: any) => ({ 
                    path: t.id, 
                    name: t.title, 
                    type: t.type, 
                    isDirty: fm.openFiles.find((f: any) => f.id === t.id)?.isDirty || false 
                }))} 
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
                settings={settings} 
                fm={fm} 
                productName={productName} 
                welcomeExtra={welcomeExtra} 
            />
            <BottomPanel 
                isVisible={bottomPanel.isVisible} 
                height={bottomPanel.panelHeight} 
                onClose={() => bottomPanel.setIsVisible(false)} 
                startResizing={bottomPanel.startResizing} 
                onDetach={() => invoke('open_detached_output', { channel: "绣智助手日志" })} 
            />
        </div>
    );
};
