import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { commands } from '../CommandSystem/CommandRegistry';
import type { Command } from '../CommandSystem/CommandRegistry';
import { views } from '../ViewSystem/ViewRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import { statusBar } from '../StatusBar/StatusBarRegistry';
import type { StatusBarItem } from '../StatusBar/StatusBarRegistry';
import type { PluginManifest, ZymaAPI, FileSystemWatcher } from './types';

/**
 * 专门负责为特定插件构建 ZymaAPI 注入对象
 */
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
            views: {
                register: (view: View) => {
                    resources.views.push(view.id);
                    views.registerView(view);
                },
            },
            workspace: {
                readFile: (path: string) => invoke('read_file', { path }),
                writeFile: (path, content) => invoke('write_file', { path, content }),
                stat: (path: string) => invoke('fs_stat', { path }),
                readDirectory: (path: string) => invoke('read_dir', { path }),
                findFiles: (baseDir: string, include: string, exclude?: string) => invoke('fs_find_files', { baseDir, include, exclude }),
                createFileSystemWatcher: (path: string): FileSystemWatcher => {
                    invoke('fs_watch', { path });
                    return {
                        onDidCreate: (handler) => listen('fs_create', (e: any) => handler(e.payload)),
                        onDidChange: (handler) => listen('fs_change', (e: any) => handler(e.payload)),
                        onDidDelete: (handler) => listen('fs_delete', (e: any) => handler(e.payload)),
                        dispose: () => invoke('fs_unwatch', { path })
                    };
                },
                onDidSaveTextDocument: (handler: (doc: any) => void) => {
                    const un = listen('file_saved', (event) => handler({ uri: event.payload as string }));
                    registerUnlistener(un);
                    return un;
                },
                onDidCreateFiles: (handler: (path: string) => void) => {
                    const un = listen('fs_create', (event) => handler(event.payload as string));
                    registerUnlistener(un);
                    return un;
                },
                onDidChangeFiles: (handler: (path: string) => void) => {
                    const un = listen('fs_change', (event) => handler(event.payload as string));
                    registerUnlistener(un);
                    return un;
                },
                onDidDeleteFiles: (handler: (path: string) => void) => {
                    const un = listen('fs_delete', (event) => handler(event.payload as string));
                    registerUnlistener(un);
                    return un;
                },
                onDidOpenTextDocument: (handler: (doc: any) => void) => {
                    const un = listen('active_editor_changed', (event) => handler({ uri: event.payload as string }));
                    registerUnlistener(un);
                    return un;
                }
            },
            statusBar: {
                registerItem: (item: StatusBarItem) => {
                    resources.statusItems.push(item.id);
                    statusBar.registerItem(item);
                },
            },
            menus: {
                registerFileMenu: (item: { label: string, commandId: string, order?: number }) => {
                    callbacks.addFileMenuItem({ ...item, pluginName: manifest.name });
                    onNotify();
                }
            },
            window: {
                create: async (label: string, options: any) => {
                    const webview = new WebviewWindow(label, {
                        title: options.title || label,
                        width: options.width || 800,
                        height: options.height || 600,
                        decorations: options.decorations !== undefined ? options.decorations : true,
                        url: options.url || 'index.html',
                        ...options
                    });
                    return new Promise<void>((resolve, reject) => {
                        webview.once('tauri://created', () => resolve());
                        webview.once('tauri://error', (e) => reject(e));
                    });
                },
                close: async (label: string) => {
                    const win = await WebviewWindow.getByLabel(label);
                    if (win) await win.close();
                },
                createOutputChannel: (name: string) => {
                    return {
                        append: (val: string) => invoke('output_append', { channel: name, content: val }),
                        appendLine: (val: string) => invoke('output_append', { channel: name, content: val + '\n' }),
                        clear: () => invoke('output_clear', { channel: name }),
                        show: () => commands.executeCommand('workbench.action.output.show', name)
                    };
                },
                onDidChangeActiveTextEditor: (handler: (doc: any) => void) => {
                    const un = listen('active_editor_changed', (event) => handler(event.payload ? { uri: event.payload as string } : null));
                    registerUnlistener(un);
                    return un;
                },
                onDidChangeWindowState: (handler: (state: any) => void) => {
                    const un = listen('window_state_changed', (event) => handler({ focused: event.payload as boolean }));
                    registerUnlistener(un);
                    return un;
                },
                onDidChangeTextEditorSelection: (handler: (e: any) => void) => {
                    const un = listen('selection_changed', (event) => {
                        try {
                            const data = JSON.parse(event.payload as string);
                            handler({ textEditor: { uri: data.path }, selections: [{ line: data.line, col: data.col }] });
                        } catch (e) {}
                    });
                    registerUnlistener(un);
                    return un;
                }
            },
            events: {
                on: async (event: string, handler: (payload: any) => void) => {
                    const normEvent = event.replace(/-/g, '_');
                    const unlisten = await listen(normEvent, (eventData) => handler(eventData.payload));
                    registerUnlistener(unlisten);
                    return unlisten;
                }
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
            ui: { notify: callbacks.notify },
            system: {
                version: "0.1.0",
                getEnv: (name: string) => invoke('system_get_env', { name }),
                exec: (command: string, args: string[]) => invoke('system_exec', { program: command, args }),
                invoke: (cmd: string, args?: any) => invoke(cmd, args)
            }
        };
    }
}
