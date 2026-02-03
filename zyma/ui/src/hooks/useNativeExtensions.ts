import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { authRegistry } from '../components/PluginSystem/AuthRegistry';
import { chatRegistry } from '../components/Chat/Registry/ChatRegistry';
import { slotRegistry, type SlotLocation } from '../core/SlotRegistry';
import React from 'react';

export function useNativeExtensions(ready: boolean, openCustomView?: (request: any) => void) {
    useEffect(() => {
        if (!ready) return;

        const discover = async () => {
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
            } catch(e) {
                console.log("Standard Zyma mode: No native extensions found.");
            }
        };

        discover();
    }, [ready, openCustomView]);
}
