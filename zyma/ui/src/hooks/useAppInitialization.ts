import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { PluginManager } from '../components/PluginSystem/PluginSystem';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';
import { useTranslation } from 'react-i18next';

export function useAppInitialization(fm: any, i18n: any) {
    const { t } = useTranslation();
    const [ready, setReady] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({
        theme: 'dark', font_size: 14, ui_font_size: 13, tab_size: 4, language: 'zh-CN', context_menu: false, single_instance: true, auto_update: true,
        window_width: 800, window_height: 600, window_x: 0, window_y: 0, is_maximized: false
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [platform, setPlatform] = useState<string>("");
    const [appVersion, setAppVersion] = useState<string>("");
    const [hasUpdate, setHasUpdate] = useState(false);
    const [activeChannels, setActiveChannels] = useState<string[]>([]);
    const [pluginMenus, setPluginMenus] = useState<any[]>([]);
    
    const pluginManager = useRef<PluginManager | null>(null);
    const initialArgsProcessed = useRef(false);
    const isExitingRef = useRef(false);
    const [, forceUpdate] = useState(0);

    const handleAppExit = async (saveAll: boolean) => {
        if (saveAll) {
            const dirtyFiles = fm.openFiles.filter((f: any) => f.content !== f.originalContent);
            for (const file of dirtyFiles) await fm.doSave(file);
        }
        isExitingRef.current = true;
        try { 
            // 逐个保存所有窗口的状态 (由后端根据当前调用窗口的 label 自动识别)
            await invoke('save_window_state');
        } catch (e) {}
        await getCurrentWindow().destroy();
    };

    useEffect(() => {
        let unlistenSingleInstance: (() => void) | null = null;

        const startApp = async () => {
            try {
                if (getCurrentWindow().label !== 'main') { setReady(true); return; }
                const [saved, adminStatus, plat, args, version, cwd] = await Promise.all([
                    invoke<AppSettings>('load_settings'), invoke<boolean>('is_admin'),
                    invoke<string>('get_platform'), invoke<string[]>('get_cli_args'), 
                    invoke<string>('get_app_version'), invoke<string>('get_cwd')
                ]);
                
                setSettings(saved);
                setAppVersion(version);
                i18n.changeLanguage(saved.language);
                setIsAdmin(adminStatus);
                setPlatform(plat);

                // Initialize Plugin Manager
                if (!pluginManager.current) {
                    pluginManager.current = new PluginManager({
                        insertText: (text) => {
                            const active = fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath);
                            if (active) fm.handleEditorChange(active.content + text);
                        }, 
                        getContent: () => fm.openFiles.find((f: any) => (f.path || f.name) === fm.activeFilePath)?.content || "", 
                        notify: (m) => alert(`[Plugin] ${m}`),
                        onMenuUpdate: () => {
                            setPluginMenus(pluginManager.current?.getFileMenuItems() || []);
                            forceUpdate(n => n + 1);
                        },
                        showDiff: async (path, content, title) => {
                            const confirmed = await ask(`是否应用 [${title || 'AI'}] 对文件 ${path} 的建议修改？`, { title: 'Zyma Diff', kind: 'info' });
                            if (confirmed) {
                                try {
                                    await invoke('write_file', { path, content });
                                    fm.handleEditorChange(content);
                                } catch (e) { alert("Error: " + e); }
                            }
                        }
                    });
                    pluginManager.current.loadAll();
                }

                // Handle single instance
                const cleanup = await listen<string[]>("single-instance", (event) => {
                    const possibleFile = event.payload[event.payload.length - 1];
                    if (possibleFile && !possibleFile.toLowerCase().endsWith('zyma.exe')) {
                        fm.handleFileSelect(possibleFile, possibleFile.split(/[\\/]/).pop() || possibleFile);
                    }
                    getCurrentWindow().setFocus();
                });
                unlistenSingleInstance = () => cleanup();

                // Listen for output channels
                listen<string>("output-channel-created", (event) => {
                    setActiveChannels(prev => prev.includes(event.payload) ? prev : [...prev, event.payload]);
                });

                setReady(true);
            } catch (e) { console.error("Init Error:", e); setReady(true); }
        };

        startApp();

        return () => { if (unlistenSingleInstance) unlistenSingleInstance(); };
    }, []);

    return {
        ready, settings, setSettings, isAdmin, platform, appVersion, hasUpdate, 
        activeChannels, pluginMenus, pluginManager, handleAppExit, isExiting: isExitingRef.current
    };
}
