import React from 'react';
import { Files, Search, Puzzle } from 'lucide-react';
import { views } from '../components/ViewSystem/ViewRegistry';
import { statusBar } from '../components/StatusBar/StatusBarRegistry';
import { registerFileCommands } from '../commands/file';
import { registerViewCommands } from '../commands/view';
import { registerWorkspaceCommands } from '../commands/workspace';
import { slotRegistry } from './SlotRegistry';
import OutputPanelWrapper from '../components/PluginSystem/OutputPanelWrapper';
import type { CustomViewRequest } from '../hooks/useTabSystem';

export function setupWorkbench(t: (key: string) => string, handlers: {
    handleNewFile: () => void,
    handleSave: (force: boolean) => void,
    handleSaveSettings: (settings: any) => void,
    getSettings: () => any,
    setShowCommandPalette: (show: boolean) => void,
    setShowSearch: (show: boolean) => void,
    setSidebarTab: (id: string) => void,
    toggleSidebar: () => void,
    setRootPath: (path: string) => void,
    fm: any,
    setActiveTabId: (id: string | null) => void,
    components: {
        Sidebar: React.ReactNode,
        SearchPanel: React.ReactNode,
        PluginList: React.ComponentType,
        ChatPanel: (props: { getContext?: any }) => React.ReactNode,
    },
    openCustomView: (request: CustomViewRequest) => void
}) {
    // 1. 注册各模块命令
    registerFileCommands(t, handlers);
    registerViewCommands(t, handlers);
    registerWorkspaceCommands(t, handlers);

    // 2. 注册视图
    views.registerView({ id: 'explorer', title: t('Workspace'), icon: <Files size={24} />, component: handlers.components.Sidebar, order: 1 });
    views.registerView({ id: 'search', title: t('Search'), icon: <Search size={24} />, component: handlers.components.SearchPanel, order: 2 });
    views.registerView({ id: 'plugins', title: t('Extensions'), icon: <Puzzle size={24} />, component: handlers.components.PluginList, order: 4 });

    // 3. 注册底部面板组件
    slotRegistry.register('BOTTOM_PANEL', {
        id: 'output',
        component: () => <OutputPanelWrapper />,
        order: 1
    });

    // 4. 状态栏项
    statusBar.registerItem({ id: 'editor-cursor', text: `${t('Ln')} 1, ${t('Col')} 1`, alignment: 'right', priority: 200 });
}