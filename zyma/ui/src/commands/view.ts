import { commands } from '../components/CommandSystem/CommandRegistry';

export function registerViewCommands(t: any, handlers: any) {
    commands.registerCommand({
        id: 'view.toggleTheme',
        title: t('ToggleTheme'),
        category: 'View',
        callback: () => {
            const current = handlers.getSettings();
            const themes: ('dark' | 'light' | 'abyss')[] = ['dark', 'light', 'abyss'];
            const nextIdx = (themes.indexOf(current.theme) + 1) % themes.length;
            handlers.handleSaveSettings({ ...current, theme: themes[nextIdx] });
        }
    });

    commands.registerCommand({
        id: 'view.toggleSidebar',
        title: t('ToggleSidebar'),
        category: 'View',
        callback: handlers.toggleSidebar
    });

    // 缩放控制逻辑
    const handleZoom = (delta: number, reset: boolean = false) => {
        const current = handlers.getSettings();
        let newSize = reset ? 13 : (current.ui_font_size || 13) + delta;
        newSize = Math.max(9, Math.min(24, newSize));
        handlers.handleSaveSettings({ ...current, ui_font_size: newSize });
    };

    commands.registerCommand({ id: 'editor.zoomIn', title: t('ZoomIn'), category: 'View', callback: () => handleZoom(1) });
    commands.registerCommand({ id: 'editor.zoomOut', title: t('ZoomOut'), category: 'View', callback: () => handleZoom(-1) });
    commands.registerCommand({ id: 'editor.zoomReset', title: t('ZoomReset'), category: 'View', callback: () => handleZoom(0, true) });

    commands.registerCommand({
        id: 'workbench.action.showCommands',
        title: t('ShowCommands'),
        category: 'View',
        callback: () => handlers.setShowCommandPalette(true)
    });
}
