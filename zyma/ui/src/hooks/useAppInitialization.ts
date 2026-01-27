import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { PluginManager } from '../components/PluginSystem/PluginManager';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';

export function useAppInitialization(fm: any, i18n: any, components?: { ChatPanel: any }, openCustomView?: (id: string, title: string, component: any) => void) {
    const [ready, setReady] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({
        theme: 'dark', font_size: 14, ui_font_size: 13, tab_size: 4, language: 'zh-CN', context_menu: false, single_instance: true, auto_update: true,
        window_width: 800, window_height: 600, window_x: 0, window_y: 0, is_maximized: false
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [platform, setPlatform] = useState('');
    const [appVersion, setAppVersion] = useState('');
    const [pluginMenus, setPluginMenus] = useState<any[]>([]);
    
    const pluginManager = useRef<PluginManager | null>(null);
    const [, forceUpdate] = useState(0);

    const handleAppExit = useCallback(async (saveAll: boolean) => {
        if (saveAll) {
            const dirtyFiles = fm.openFiles.filter((f: any) => f.content !== f.originalContent);
            for (const file of dirtyFiles) await fm.doSave(file);
        }
        try { await invoke('save_window_state'); } catch (e) {}
        await getCurrentWindow().destroy();
    }, [fm.openFiles, fm.doSave]);

    // 核心修复：将“系统元数据加载”与“插件加载”分离
    useEffect(() => {
        const initSystem = async () => {
            try {
                const [saved, adminStatus, plat, version] = await Promise.all([
                    invoke<AppSettings>('load_settings'), invoke<boolean>('is_admin'),
                    invoke<string>('get_platform'), invoke<string>('get_app_version')
                ]);
                setSettings(saved);
                setAppVersion(version);
                i18n.changeLanguage(saved.language);
                setIsAdmin(adminStatus);
                setPlatform(plat);
                setReady(true);
            } catch (e) { console.error('Init System Error:', e); setReady(true); }
        };
        initSystem();
    }, []); // 仅挂载时运行一次

    // 插件管理器初始化：独立于 ready 状态，避免被 ready 变化触发死循环
    useEffect(() => {
        if (!pluginManager.current && components?.ChatPanel) {
            console.log("[useAppInitialization] Initializing PluginManager...");
            pluginManager.current = new PluginManager({
                insertText: (text: string) => {
                    const active = fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath);
                    if (active) fm.handleEditorChange(active.content + text);
                }, 
                getContent: () => fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath)?.content || '', 
                notify: (m: string) => alert('[Plugin] ' + m),
                onMenuUpdate: () => {
                    setPluginMenus(pluginManager.current?.getFileMenuItems() || []);
                    forceUpdate(n => n + 1);
                },
                showDiff: async (path: string, content: string, title?: string) => {
                    const confirmed = await ask('是否应用 [' + (title || 'AI') + '] 对文件 ' + path + ' 的建议修改？', { title: 'Zyma Diff', kind: 'info' });
                    if (confirmed) {
                        try {
                            await invoke('write_file', { path, content });
                            fm.handleEditorChange(content);
                        } catch (e) { alert('Error: ' + e); }
                    }
                },
                components: { ChatPanel: components.ChatPanel },
                openCustomView
            });
            pluginManager.current.loadAll();
        }
    }, [components, openCustomView]); // 只有当组件或回调函数引用变化时才运行

    return useMemo(() => ({
        ready, settings, setSettings, isAdmin, platform, appVersion, 
        pluginMenus, pluginManager, handleAppExit
    }), [ready, settings, isAdmin, platform, appVersion, pluginMenus, handleAppExit]);
}