import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { commands } from '../CommandSystem/CommandRegistry';
import type { Command } from '../CommandSystem/CommandRegistry';
import { views } from '../ViewSystem/ViewRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import { chatRegistry } from '../Chat/Registry/ChatRegistry';
import { authRegistry } from './AuthRegistry';
import type { PluginManifest, ZymaAPI } from './types';
import React from 'react';

export class PluginAPIBuilder {
    static create(
        manifest: PluginManifest, 
        resources: { views: string[], statusItems: string[], commands: string[] },
        callbacks: any,
        onNotify: () => void,
        registerUnlistener: (unlisten: any) => void
    ): ZymaAPI {
        return {
            editor: {
                insertText: callbacks.insertText,
                getContent: callbacks.getContent,
                showDiff: callbacks.showDiff,
            },
            commands: {
                register: (cmd: Command) => {
                    resources.commands.push(cmd.id);
                    commands.registerCommand(cmd);
                },
                execute: (id: string, ...args: any[]) => commands.executeCommand(id, ...args),
            },
            // 关键修复：找回被误删的 auth 模块
            auth: {
                registerAuthenticationProvider: (provider: any) => {
                    authRegistry.registerProvider(provider);
                    onNotify();
                },
                unregisterAuthenticationProvider: (id: string) => {
                    authRegistry.unregisterProvider(id);
                    onNotify();
                }
            },
            window: {
                openTab: (id: string, title: string, component: any) => {
                    const element = typeof component === 'function' ? React.createElement(component) : component;
                    if (callbacks.openCustomView) {
                        callbacks.openCustomView(id, title, element);
                    } else {
                        console.error("openCustomView callback is not defined");
                    }
                },
                createOutputChannel: (name: string) => {
                    return {
                        appendLine: (val: string) => invoke('output_append', { channel: name, content: val + '\n' }),
                        show: () => commands.executeCommand('workbench.action.output.show', name)
                    };
                }
            },
            chat: {
                registerChatParticipant: (participant: any) => {
                    chatRegistry.registerParticipant(participant);
                    onNotify();
                }
            },
            views: {
                register: (view: View) => {
                    resources.views.push(view.id);
                    views.registerView(view);
                },
            },
            storage: {
                get: async (key: string) => {
                    const val = localStorage.getItem(`plugin:${manifest.name}:${key}`);
                    return val ? JSON.parse(val) : null;
                },
                set: async (key: string, value: any) => {
                    localStorage.setItem(`plugin:${manifest.name}:${key}`, JSON.stringify(value));
                }
            },
            ui: { notify: (msg: string) => callbacks.notify(msg) },
            components: {
                ChatPanel: callbacks.components.ChatPanel
            },
            system: {
                invoke: (cmd: string, args?: any) => invoke(cmd, args),
                getEnv: (name: string) => invoke('system_get_env', { name }),
                exec: (command: string, args: string[]) => invoke('system_exec', { program: command, args })
            }
        };
    }
}
