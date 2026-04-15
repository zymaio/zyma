import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { commands } from '../CommandSystem/CommandRegistry';
import { views } from '../ViewSystem/ViewRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import type { Command } from '../CommandSystem/CommandRegistry';
import { chatRegistry } from '../Chat/Registry/ChatRegistry';
import { authRegistry } from './AuthRegistry';
import type { PluginManifest, ZymaAPI, FileSystemWatcher, AIChatRequest, AIChatChunk, PluginAPIBuilderCallbacks } from './types';
import { ContributionRegistry } from './ContributionRegistry';
import React from 'react';
import { createChannelGenerator } from '../../utils/streamUtils';
import type { UnlistenFn, Event } from '@tauri-apps/api/event';

// 定义回调类型
type FileEventListener = (path: string) => void;
type DocumentEventListener = (doc: { uri: string }) => void;
type EditorListener = (doc: { uri: string } | null) => void;
type WindowStateListener = (state: { focused: boolean }) => void;
type SelectionListener = (e: { textEditor: { uri: string }; selections: { line: number; col: number }[] }) => void;
type GenericEventHandler = (payload: unknown) => void;

export class PluginAPIBuilder {
    static create(
        manifest: PluginManifest,
        resources: { views: string[]; statusItems: string[]; commands: string[]; tabs: string[] },
        contributionRegistry: ContributionRegistry,
        callbacks: PluginAPIBuilderCallbacks,
        onNotify: () => void,
        _registerUnlistener: (unlisten: UnlistenFn) => void
    ): ZymaAPI {
        return {
            editor: {
                insertText: callbacks.insertText,
                getContent: callbacks.getContent,
                getSelection: callbacks.getSelection,
                showDiff: callbacks.showDiff,
            },
            commands: {
                register: (cmd: Command) => {
                    // 兼容性处理：支持 handler 的属性映射到 callback
                    const normalizedCmd = {
                        ...cmd,
                        callback: cmd.callback || (cmd as Record<string, unknown>).handler
                    };
                    resources.commands.push(normalizedCmd.id);
                    commands.registerCommand(normalizedCmd);
                },
                execute: (id: string, ...args: unknown[]) => commands.executeCommand(id, ...args),
            },
            workspace: {
                readFile: (path: string) => invoke('read_file', { path }),
                writeFile: (path: string, content: string) => invoke('write_file', { path, content }),
                stat: (path: string) => invoke('fs_stat', { path }),
                readDirectory: (path: string) => invoke<unknown[]>('read_dir', { path }),
                findFiles: (baseDir: string, include: string, exclude?: string) => invoke<string[]>('find_files', { baseDir, include, exclude }),
                createFileSystemWatcher: (path: string): FileSystemWatcher => ({
                    onDidCreate: (handler: FileEventListener) => listen('fs-create:' + path, (e: Event<unknown>) => handler(e.payload as string)),
                    onDidChange: (handler: FileEventListener) => listen('fs-change:' + path, (e: Event<unknown>) => handler(e.payload as string)),
                    onDidDelete: (handler: FileEventListener) => listen('fs-delete:' + path, (e: Event<unknown>) => handler(e.payload as string)),
                    dispose: () => {}
                }),
                onDidSaveTextDocument: (listener: DocumentEventListener) => listen('file-saved', (e: Event<unknown>) => listener(e.payload as { uri: string })),
                onDidCreateFiles: (listener: FileEventListener) => listen('files-created', (e: Event<unknown>) => listener(e.payload as string)),
                onDidChangeFiles: (listener: FileEventListener) => listen('files-changed', (e: Event<unknown>) => listener(e.payload as string)),
                onDidDeleteFiles: (listener: FileEventListener) => listen('files-deleted', (e: Event<unknown>) => listener(e.payload as string)),
                onDidOpenTextDocument: (listener: DocumentEventListener) => listen('file-opened', (e: Event<unknown>) => listener(e.payload as { uri: string })),
            },
            statusBar: {
                registerItem: (item: { id: string; text: string; alignment: 'left' | 'right'; priority?: number }) => {
                    resources.statusItems.push(item.id);
                    // register status bar item... (placeholder)
                }
            },
            menus: {
                registerFileMenu: (item: { label: string; commandId: string; order?: number }) => {
                    callbacks.addFileMenuItem(item);
                    onNotify();
                }
            },
            auth: {
                registerAuthenticationProvider: (provider: {
                    id: string;
                    label: string;
                    accountName?: string;
                    onLogin: () => Promise<void>;
                    onLogout: () => Promise<void>;
                }) => {
                    authRegistry.registerProvider(provider);
                    onNotify();
                },
                unregisterAuthenticationProvider: (id: string) => {
                    authRegistry.unregisterProvider(id);
                    onNotify();
                }
            },
            window: {
                create: (label: string, options: Record<string, unknown>) => invoke('window_create', { label, options }),
                close: (label: string) => invoke('window_close', { label }),
                openTab: (id: string, title: string, component: React.ComponentType<unknown> | React.ReactNode, options?: Record<string, unknown>) => {
                    const element = typeof component === 'function' ? React.createElement(component) : component;
                    if (callbacks.openCustomView) {
                        // 记录此标签页属于该插件
                        (contributionRegistry as Record<string, unknown>).addOpenedTab(manifest.name, id);
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
                onDidChangeActiveTextEditor: (listener: EditorListener) => listen('active-editor-changed', (e: Event<unknown>) => listener(e.payload as { uri: string } | null)),
                onDidChangeWindowState: (listener: WindowStateListener) => listen('window-state-changed', (e: Event<unknown>) => listener(e.payload as { focused: boolean })),
                onDidChangeTextEditorSelection: (listener: SelectionListener) => listen('selection-changed', (e: Event<unknown>) => listener(e.payload as { textEditor: { uri: string }; selections: { line: number; col: number }[] })),
            },
            events: {
                on: (event: string, handler: GenericEventHandler) => listen(event, (e: Event<unknown>) => handler(e.payload))
            },
            chat: {
                registerChatParticipant: (participant: {
                    id: string;
                    name: string;
                    fullName: string;
                    description?: string;
                    icon?: string;
                    commands?: { name: string; description: string }[];
                    handler: (request: Record<string, unknown>, stream: Record<string, unknown>) => Promise<void>;
                }) => {
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
                set: async (key: string, value: unknown) => {
                    localStorage.setItem(`plugin:${manifest.name}:${key}`, JSON.stringify(value));
                }
            },
            ui: { notify: (msg: string) => callbacks.notify(msg) },
            components: {
               ChatPanel: callbacks.components.ChatPanel
            },
            system: {
                version: "0.9.7",
                invoke: (cmd: string, args?: Record<string, unknown>) => invoke(cmd, args),
                getEnv: (name: string) => invoke<string | null>('system_get_env', { name }),
                exec: (command: string, args: string[]) => invoke('system_exec', { program: command, args })
            }
        };
    }
}
