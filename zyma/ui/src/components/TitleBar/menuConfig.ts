export interface MenuItem {
    label: string;
    action?: string;
    shortcut?: string;
    type?: 'separator';
}

export interface MenuCategory {
    label: string;
    items: MenuItem[];
}

export const getMenuData = (t: (key: string, options?: any) => string, themeMode: string): MenuCategory[] => [
    {
        label: t('File'),
        items: [
            { label: t('NewFile'), action: 'new_file', shortcut: 'Ctrl+N' },
            { label: t('OpenFolder'), action: 'open_folder' },
            { label: t('OpenRecent'), action: 'open_recent' },
            { label: t('Save'), action: 'save', shortcut: 'Ctrl+S' },
            { label: t('SaveAs'), action: 'save_as' },
            { type: 'separator', label: '' },
            { label: t('Exit'), action: 'exit' }
        ]
    },
    {
        label: t('Edit'),
        items: [
            { label: t('Undo'), action: 'undo', shortcut: 'Ctrl+Z' },
            { label: t('Redo'), action: 'redo', shortcut: 'Ctrl+Y' }
        ]
    },
    {
        label: t('View'),
        items: [
            { label: t('SwitchTheme', { mode: themeMode === 'dark' ? 'Light' : 'Dark' }), action: 'toggle_theme' }
        ]
    },
    {
        label: t('Help'),
        items: [ 
            { label: t('CheckUpdate', '检查更新...'), action: 'check_update' },
            { type: 'separator', label: '' },
            { label: t('About'), action: 'about' } 
        ]
    }
];
