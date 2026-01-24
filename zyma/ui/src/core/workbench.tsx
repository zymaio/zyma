import React from 'react';
import { Files, Search, Puzzle } from 'lucide-react';
import { commands } from '../components/CommandSystem/CommandRegistry';
import { views } from '../components/ViewSystem/ViewRegistry';
import { statusBar } from '../components/StatusBar/StatusBarRegistry';

export function setupWorkbench(t: (key: string) => string, handlers: {
    handleNewFile: () => void,
    handleSave: (force: boolean) => void,
    handleSaveSettings: (settings: any) => void,
    getSettings: () => any,
    setShowCommandPalette: (show: boolean) => void,
    setShowSearch: (show: boolean) => void,
    setSidebarTab: (id: string) => void,
    toggleSidebar: () => void,
    components: {
        Sidebar: React.ReactNode,
        SearchPanel: React.ReactNode,
        PluginList: React.ComponentType,
    }
}) {
    // 1. 注册核心命令
    commands.registerCommand({ id: 'file.new', title: t('NewFile'), category: 'File', callback: handlers.handleNewFile });
    commands.registerCommand({ id: 'file.save', title: t('Save'), category: 'File', callback: () => handlers.handleSave(false) });
    commands.registerCommand({ id: 'view.toggleTheme', title: t('ToggleTheme'), category: 'View', callback: () => {
        const current = handlers.getSettings();
        handlers.handleSaveSettings({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' });
    }});

    // 2. 注册核心视图 (确保不再有 Coming Soon)
    views.registerView({
        id: 'explorer',
        title: t('Explorer'),
        icon: <Files size={24} />,
        component: handlers.components.Sidebar,
        order: 1
    });

    views.registerView({
        id: 'search',
        title: t('Search'),
        icon: <Search size={24} />,
        component: handlers.components.SearchPanel,
        order: 2
    });

    // 这里的组件会通过 App.tsx 传递进来的真实 PluginList 组件渲染
    views.registerView({
        id: 'plugins',
        title: t('Extensions'),
        icon: <Puzzle size={24} />,
        component: <handlers.components.PluginList />,
        order: 3
    });

    // 3. 注册初始状态栏项
    statusBar.registerItem({ id: 'editor-cursor', text: `${t('Ln')} 1, ${t('Col')} 1`, alignment: 'right', priority: 200 });
}
