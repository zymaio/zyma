import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { commands } from '../CommandSystem/CommandRegistry';
import { views } from '../ViewSystem/ViewRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import { chatRegistry } from '../Chat/Registry/ChatRegistry';
import { authRegistry } from './AuthRegistry';
import type { PluginManifest, ZymaAPI, FileSystemWatcher, AIChatRequest, AIChatChunk } from './types';
import { ContributionRegistry } from './ContributionRegistry';
import React from 'react';
import { createChannelGenerator } from '../../utils/streamUtils';

export class PluginAPIBuilder {
    static create(
        manifest: PluginManifest, 
        resources: { views: string[], statusItems: string[], commands: string[], tabs: string[] },
        contributionRegistry: ContributionRegistry,
        callbacks: any,
        onNotify: () => void,
        _registerUnlistener: (unlisten: any) => void
    ): ZymaAPI {
        return {
            editor: {
                insertText: callbacks.insertText,
                getContent: callbacks.getContent,
                getSelection: callbacks.getSelection,
                showDiff: callbacks.showDiff,
            },
            commands: {
                register: (cmd: any) => {
                    // 兼容性处理：支持 handler 属性映射到 callback
                    const normalizedCmd = {
                        ...cmd,
                        callback: cmd.callback || cmd.handler
                    };
                    resources.commands.push(normalizedCmd.id);
                    commands.registerCommand(normalizedCmd);
                },
                execute: (id: string, ...args: any[]) => commands.executeCommand(id, ...args),
            },
            workspace: {
                readFile: (path: string) => invoke('read_file', { path }),
                writeFile: (path: string, content: string) => invoke('write_file', { path, content }),
                stat: (path: string) => invoke('fs_stat', { path }),
                readDirectory: (path: string) => invoke('read_dir', { path }),
                findFiles: (baseDir: string, include: string, exclude?: string) => invoke('find_files', { baseDir, include, exclude }),
                createFileSystemWatcher: (path: string): FileSystemWatcher => ({
                    onDidCreate: (handler: any) => listen('fs-create:' + path, (e) => handler(e.payload)),
                    onDidChange: (handler: any) => listen('fs-change:' + path, (e) => handler(e.payload)),
                    onDidDelete: (handler: any) => listen('fs-delete:' + path, (e) => handler(e.payload)),
                    dispose: () => {}
                }),
                onDidSaveTextDocument: (listener: any) => listen('file-saved', (e) => listener(e.payload)),
                onDidCreateFiles: (listener: any) => listen('files-created', (e) => listener(e.payload)),
                onDidChangeFiles: (listener: any) => listen('files-changed', (e) => listener(e.payload)),
                onDidDeleteFiles: (listener: any) => listen('files-deleted', (e) => listener(e.payload)),
                onDidOpenTextDocument: (listener: any) => listen('file-opened', (e) => listener(e.payload)),
            },
            statusBar: {
                registerItem: (item: any) => {
                    resources.statusItems.push(item.id);
                    // register status bar item... (placeholder)
                }
            },
            menus: {
                registerFileMenu: (item: any) => {
                    callbacks.addFileMenuItem(item);
                    onNotify();
                }
            },
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
                create: (label: string, options: any) => invoke('window_create', { label, options }),
                close: (label: string) => invoke('window_close', { label }),
                openTab: (id: string, title: string, component: any, options?: any) => {
                    const element = typeof component === 'function' ? React.createElement(component) : component;
                    if (callbacks.openCustomView) {
                        // 记录此标签页属于该插件
                        (contributionRegistry as any).addOpenedTab(manifest.name, id);
                        callbacks.openCustomView({ id, title, component: element, options });
                    } else {
                        console.error("openCustomView callback is not defined");
                    }
                },
                createOutputChannel: (name: string) => {
                    return {
                        append: (val: string) => { invoke('output_append', { channel: name, content: val }); },
                        appendLine: (val: string) => { invoke('output_append', { channel: name, content: val + '\n' }); },
                        clear: () => { invoke('output_clear', { channel: name }); },
                        show: () => { commands.executeCommand('workbench.action.output.show', name); }
                    };
                },
                onDidChangeActiveTextEditor: (listener: any) => listen('active-editor-changed', (e) => listener(e.payload)),
                onDidChangeWindowState: (listener: any) => listen('window-state-changed', (e) => listener(e.payload)),
                onDidChangeTextEditorSelection: (listener: any) => listen('selection-changed', (e) => listener(e.payload)),
            },
            events: {
                on: (event: string, handler: any) => listen(event, (e) => handler(e.payload))
            },
            chat: {
                registerChatParticipant: (participant: any) => {
                    chatRegistry.registerParticipant(participant);
                    onNotify();
                }
            },
            ai: {
                stream: (request: AIChatRequest) => {
                    return createChannelGenerator<AIChatChunk>((channel) => 
                        invoke('llm_chat', { request, onEvent: channel })
                    );
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
                version: "0.9.5",
                invoke: (cmd: string, args?: any) => invoke(cmd, args),
                getEnv: (name: string) => invoke('system_get_env', { name }),
                exec: (command: string, args: string[]) => invoke('system_exec', { program: command, args })
            }
        };
    }
}
