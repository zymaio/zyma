import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { PluginManager } from '../components/PluginSystem/PluginManager';
import { authRegistry } from '../components/PluginSystem/AuthRegistry';
import { chatRegistry } from '../components/Chat/Registry/ChatRegistry';
import { slotRegistry, type SlotLocation } from '../core/SlotRegistry';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';

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

    const handleAppExit = useCallback(async (saveAll: boolean) => {
        if (saveAll) {
            const dirtyFiles = fm.openFiles.filter((f: any) => f.content !== f.originalContent);
            for (const file of dirtyFiles) await fm.doSave(file);
        }
        try { await invoke('save_window_state'); } catch (e) {}
        await getCurrentWindow().destroy();
    }, [fm.openFiles, fm.doSave]);

    useEffect(() => {
        const initSystem = async () => {
            try {
                const [saved, adminStatus, plat, version, rawName] = await Promise.all([
                    invoke<AppSettings>('load_settings'), invoke<boolean>('is_admin'),
                    invoke<string>('get_platform'), invoke<string>('get_app_version'),
                    invoke<string>('get_product_name')
                ]);
                setSettings(saved);
                setAppVersion(version);
                setProductName(rawName.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                i18n.changeLanguage(saved.language);
                setIsAdmin(adminStatus);
                setPlatform(plat);

                // --- 框架协议：自动发现原生扩展 ---
                try {
                    const native = await invoke<any>('get_native_extensions');
                    
                    // 1. 同步 AI 参与者
                    if (native.chat_participants) {
                        native.chat_participants.forEach((p: any) => {
                            chatRegistry.registerParticipant({
                                id: p.id, name: p.name, fullName: p.full_name, description: p.description,
                                handler: async (req, stream) => {
                                    stream.status('thinking');
                                    const history = req.history.map((h: any) => ({
                                        role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content
                                    }));
                                    history.push({ role: 'user', content: req.prompt });
                                    const unlisten = await listen(p.thought_event || 'ai-thought', (e) => stream.markdown(e.payload as string));
                                    try { await invoke(p.command, { prompt: req.prompt, history }); } 
                                    catch(e) { stream.error(String(e)); }
                                    finally { unlisten(); stream.done(); }
                                }
                            });
                        });
                    }

                    // 2. 同步账号提供商
                    if (native.auth_providers) {
                        native.auth_providers.forEach((p: any) => {
                            authRegistry.registerProvider({
                                id: p.id, label: p.label,
                                onLogin: async () => {
                                    try {
                                        const res = await invoke<any>(p.login_command);
                                        if (res && res.status === 'success') {
                                            localStorage.setItem(`auth_${p.id}_user`, JSON.stringify(res.user));
                                            authRegistry.updateAccount(p.id, res.user?.username || 'User');
                                        }
                                    } catch(e) { console.warn("Login failed:", e); }
                                },
                                onLogout: async () => {
                                    try {
                                        await invoke(p.logout_command);
                                        localStorage.removeItem(`auth_${p.id}_user`);
                                        authRegistry.updateAccount(p.id, undefined);
                                    } catch(e) {}
                                }
                            });
                            if (p.auth_event) {
                                listen(p.auth_event, (e: any) => authRegistry.updateAccount(p.id, (e.payload as any).username));
                            }
                            const saved = localStorage.getItem(`auth_${p.id}_user`);
                            if (saved) {
                                try {
                                    const u = JSON.parse(saved);
                                    authRegistry.updateAccount(p.id, typeof u === 'object' ? u.username : u);
                                } catch(e) {}
                            }
                        });
                    }

                    // 3. 同步插槽组件
                    if (native.slot_components) {
                        native.slot_components.forEach((s: any) => {
                            slotRegistry.register(s.slot as SlotLocation, {
                                id: s.id,
                                params: s.params,
                                component: () => {
                                    if (s.component_type === 'webview') {
                                        return React.createElement('iframe', {
                                            src: s.params?.url,
                                            style: { width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' }
                                        });
                                    }
                                    return null;
                                }
                            });
                        });
                    }
                } catch(e) { console.log("Standard Zyma mode: No native extensions found."); }

                setReady(true);
            } catch (e) { console.error('Init System Error:', e); setReady(true); }
        };
        initSystem();
    }, [openCustomView]);

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

    return useMemo(() => ({
        ready, settings, setSettings, isAdmin, platform, appVersion, productName,
        pluginMenus, pluginManager, handleAppExit
    }), [ready, settings, isAdmin, platform, appVersion, productName, pluginMenus, handleAppExit]);
}