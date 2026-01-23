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
    }
}) {
    // 1. 注册核心命令
    commands.registerCommand({
        id: 'file.new',
        title: t('NewFile'),
        category: 'File',
        callback: handlers.handleNewFile
    });

    commands.registerCommand({
        id: 'file.save',
        title: t('Save'),
        category: 'File',
        callback: () => handlers.handleSave(false)
    });

    commands.registerCommand({
        id: 'file.saveAs',
        title: t('SaveAs'),
        category: 'File',
        callback: () => handlers.handleSave(true)
    });

    commands.registerCommand({
        id: 'view.toggleTheme',
        title: t('ToggleTheme'),
        category: 'View',
        callback: () => {
            const current = handlers.getSettings();
            handlers.handleSaveSettings({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' });
        }
    });

    commands.registerCommand({
        id: 'editor.zoomIn',
        title: 'Zoom In',
        category: 'Editor',
        callback: () => {
            const current = handlers.getSettings();
            handlers.handleSaveSettings({ ...current, font_size: current.font_size + 1 });
        }
    });

    commands.registerCommand({
        id: 'editor.zoomOut',
        title: 'Zoom Out',
        category: 'Editor',
        callback: () => {
            const current = handlers.getSettings();
            handlers.handleSaveSettings({ ...current, font_size: Math.max(8, current.font_size - 1) });
        }
    });

    commands.registerCommand({
        id: 'editor.zoomReset',
        title: 'Reset Zoom',
        category: 'Editor',
        callback: () => {
            const current = handlers.getSettings();
            handlers.handleSaveSettings({ ...current, font_size: 14 });
        }
    });

    commands.registerCommand({
        id: 'workbench.action.showCommands',
        title: t('ShowCommands'),
        category: 'Workbench',
        callback: () => handlers.setShowCommandPalette(true)
    });

    commands.registerCommand({
        id: 'actions.find',
        title: t('Find'),
        category: 'Editor',
        callback: () => handlers.setShowSearch(true)
    });

    commands.registerCommand({
        id: 'workbench.action.showAllSymbols',
        title: t('Search'),
        category: 'Workbench',
        callback: () => handlers.setSidebarTab('search')
    });

    commands.registerCommand({
        id: 'workbench.action.toggleSidebarVisibility',
        title: t('ToggleSidebar'),
        category: 'View',
        callback: () => handlers.toggleSidebar()
    });

    // 2. 注册侧边栏视图
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

    views.registerView({
        id: 'plugins',
        title: t('Plugins'),
        icon: <Puzzle size={24} />,
        component: (
          <div style={{ width: '100%', backgroundColor: 'var(--bg-sidebar)', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>{t('Plugins')}</div>
              <div style={{ fontSize: '12px', opacity: 0.6 }}>Manage your extensions here (Coming Soon)</div>
          </div>
        ),
        order: 3
    });

        // 3. 注册初始状态栏项

        statusBar.registerItem({

            id: 'editor-cursor',

            text: `${t('Ln')} 1, ${t('Col')} 1`,

            alignment: 'right',

            priority: 200

        });

    }

    