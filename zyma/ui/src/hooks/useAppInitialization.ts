import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { PluginManager } from '../components/PluginSystem/PluginSystem';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';

export function useAppInitialization(fm: any, i18n: any) {
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
    const isExitingRef = useRef(false);
    const [, forceUpdate] = useState(0);

    const handleAppExit = useCallback(async (saveAll: boolean) => {
        if (saveAll) {
            const dirtyFiles = fm.openFiles.filter((f: any) => f.content !== f.originalContent);
            for (const file of dirtyFiles) await fm.doSave(file);
        }
        isExitingRef.current = true;
        try { 
            await invoke('save_window_state');
        } catch (e) {}
        await getCurrentWindow().destroy();
    }, [fm.openFiles, fm.doSave]);

    useEffect(() => {
        let unlistenSingleInstance: (() => void) | null = null;

        const startApp = async () => {
            try {
                if (getCurrentWindow().label !== 'main') { setReady(true); return; }
                const [saved, adminStatus, plat, _args, version, _cwd] = await Promise.all([
                    invoke<AppSettings>('load_settings'), invoke<boolean>('is_admin'),
                    invoke<string>('get_platform'), invoke<string[]>('get_cli_args'), 
                    invoke<string>('get_app_version'), invoke<string>('get_cwd')
                ]);
                
                setSettings(saved);
                setAppVersion(version);
                i18n.changeLanguage(saved.language);
                setIsAdmin(adminStatus);
                setPlatform(plat);

                if (!pluginManager.current) {
                    pluginManager.current = new PluginManager({
                        insertText: (text) => {
                            const active = fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath);
                            if (active) fm.handleEditorChange(active.content + text);
                        }, 
                        getContent: () => fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath)?.content || '', 
                        notify: (m) => alert('[Plugin] ' + m),
                        onMenuUpdate: () => {
                            setPluginMenus(pluginManager.current?.getFileMenuItems() || []);
                            forceUpdate(n => n + 1);
                        },
                        showDiff: async (path, content, title) => {
                            const confirmed = await ask('是否应用 [' + (title || 'AI') + '] 对文件 ' + path + ' 的建议修改？', { title: 'Zyma Diff', kind: 'info' });
                            if (confirmed) {
                                try {
                                    await invoke('write_file', { path, content });
                                    fm.handleEditorChange(content);
                                } catch (e) { alert('Error: ' + e); }
                            }
                        }
                    });
                    pluginManager.current.loadAll();
                }

                const cleanup = await listen<string[]>('single-instance', (event) => {
                    const possibleFile = event.payload[event.payload.length - 1];
                    if (possibleFile && !possibleFile.toLowerCase().endsWith('zyma.exe')) {
                        fm.handleFileSelect(possibleFile, possibleFile.split(/[\/]/).pop() || possibleFile);
                    }
                    getCurrentWindow().setFocus();
                });
                unlistenSingleInstance = () => cleanup();

                setReady(true);
            } catch (e) { console.error('Init Error:', e); setReady(true); }
        };

        startApp();

        return () => { if (unlistenSingleInstance) unlistenSingleInstance(); };
    }, [fm.openFiles, fm.activeFilePath, fm.handleEditorChange, fm.handleFileSelect, i18n]);

    return useMemo(() => ({
        ready, settings, setSettings, isAdmin, platform, appVersion, 
        pluginMenus, pluginManager, handleAppExit, isExiting: isExitingRef.current
    }), [ready, settings, isAdmin, platform, appVersion, pluginMenus, handleAppExit]);
}