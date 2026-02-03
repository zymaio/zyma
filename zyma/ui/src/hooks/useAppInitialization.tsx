import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { PluginManager } from '../components/PluginSystem/PluginManager';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';
import { useNativeExtensions } from './useNativeExtensions';

export function useAppInitialization(fm: any, i18n: any, openCustomView?: (request: any) => void) {
    const [ready, setReady] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({
        theme: 'dark', font_size: 14, ui_font_size: 13, tab_size: 4, language: 'zh-CN', context_menu: false, single_instance: true, auto_update: true,
        window_width: 800, window_height: 600, window_x: 0, window_y: 0, is_maximized: false
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [platform, setPlatform] = useState('');
    const [appVersion, setAppVersion] = useState('');
    const [productName, setProductName] = useState('zyma');
    const [pluginMenus, setPluginMenus] = useState<any[]>([]);
    
    const pluginManager = useRef<PluginManager | null>(null);
    const [, forceUpdate] = useState(0);

    // 1. 系统核心信息加载
    useEffect(() => {
        const initSystem = async () => {
            try {
                const [saved, adminStatus, plat, version, rawName] = await Promise.all([
                    invoke<AppSettings>('load_settings'), 
                    invoke<boolean>('is_admin'),
                    invoke<string>('get_platform'), 
                    invoke<string>('get_app_version'),
                    invoke<string>('get_product_name')
                ]);
                setSettings(saved);
                setAppVersion(version);
                setProductName(rawName.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                if (i18n && typeof i18n.changeLanguage === 'function') {
                    i18n.changeLanguage(saved.language);
                }
                setIsAdmin(adminStatus);
                setPlatform(plat);
                setReady(true);
            } catch (e) { 
                console.error('Init System Error:', e); 
                setReady(true); 
            }
        };
        initSystem();
    }, [i18n]);

    // 2. 发现原生扩展 (已拆分)
    useNativeExtensions(ready, openCustomView);

    // 3. 插件管理器初始化
    useEffect(() => {
        if (!pluginManager.current) {
            pluginManager.current = new PluginManager({
                insertText: (text: string) => {
                    const active = fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath);
                    if (active) fm.handleEditorChange(active.content + text);
                }, 
                getContent: () => fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath)?.content || '', 
                getSelection: () => fm.getSelection ? fm.getSelection() : '',
                notify: (m: string) => alert('[Plugin] ' + m),
                onMenuUpdate: () => {
                    setPluginMenus(pluginManager.current?.getFileMenuItems() || []);
                    forceUpdate(n => n + 1);
                },
                showDiff: async (path: string, content: string) => {
                    const confirmed = await ask('是否应用建议修改？', { title: 'Zyma Diff', kind: 'info' });
                    if (confirmed) {
                        try {
                            await invoke('write_file', { path, content });
                            fm.handleEditorChange(content);
                        } catch (e) { alert('Error: ' + e); }
                    }
                },
                addFileMenuItem: () => {},
                components: { ChatPanel: null },
                openCustomView,
                closeTab: (id: string) => fm.closeTab ? fm.closeTab(id) : null
            });
            
            pluginManager.current.loadAll().then(async () => {
                try {
                    const native = await invoke<any>('get_native_extensions');
                    if (native.file_menu_items && pluginManager.current) {
                        native.file_menu_items.forEach((m: any) => pluginManager.current!.registerNativeMenu(m));
                    }
                } catch(e) {}
            });
        }
    }, [fm, openCustomView]);

    const handleAppExit = useCallback(async (saveAll: boolean) => {
        if (saveAll) {
            const dirtyFiles = fm.openFiles.filter((f: any) => f.content !== f.originalContent);
            for (const file of dirtyFiles) await fm.doSave(file);
        }
        try { await invoke('save_window_state'); } catch (e) {}
        await getCurrentWindow().destroy();
    }, [fm.openFiles, fm.doSave]);

    return useMemo(() => ({
        ready, settings, setSettings, isAdmin, platform, appVersion, productName,
        pluginMenus, pluginManager, handleAppExit
    }), [ready, settings, isAdmin, platform, appVersion, productName, pluginMenus, handleAppExit]);
}
