import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { commands } from '../CommandSystem/CommandRegistry';
import type { Command } from '../CommandSystem/CommandRegistry';
import { views } from '../ViewSystem/ViewRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import { statusBar } from '../StatusBar/StatusBarRegistry';
import type { StatusBarItem } from '../StatusBar/StatusBarRegistry';

export interface PluginManifest {
    name: string;
    version: string;
    author: string;
    entry: string;
    description?: string;
}

export interface ZymaAPI {
    editor: {
        insertText: (text: string) => void;
        getContent: () => string;
    };
    commands: {
        register: (command: Command) => void;
        execute: (id: string, ...args: any[]) => Promise<any>;
    };
    views: {
        register: (view: View) => void;
    };
    workspace: {
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<void>;
    };
    statusBar: {
        registerItem: (item: StatusBarItem) => void;
    };
    window: {
        create: (label: string, options: any) => Promise<void>;
        close: (label: string) => Promise<void>;
    };
    ui: {
        notify: (message: string) => void;
    };
    system: {
        version: string;
    };
}

export class PluginManager {
    private plugins: Map<string, any> = new Map();
    private api: ZymaAPI;

    constructor(callbacks: { 
        insertText: (text: string) => void,
        getContent: () => string,
        notify: (msg: string) => void
    }) {
        this.api = {
            editor: {
                insertText: callbacks.insertText,
                getContent: callbacks.getContent,
            },
            commands: {
                register: (cmd) => commands.registerCommand(cmd),
                execute: (id, ...args) => commands.executeCommand(id, ...args),
            },
            views: {
                register: (view) => views.registerView(view),
            },
            workspace: {
                readFile: (path) => invoke('read_file', { path }),
                writeFile: (path, content) => invoke('write_file', { path, content }),
            },
            statusBar: {
                registerItem: (item) => statusBar.registerItem(item),
            },
            window: {
                create: async (label, options) => {
                    const webview = new WebviewWindow(label, {
                        title: options.title || label,
                        width: options.width || 800,
                        height: options.height || 600,
                        decorations: options.decorations !== undefined ? options.decorations : true,
                        url: options.url || 'index.html', // 默认加载主应用，可以通过路由区分 AI 窗口
                        ...options
                    });
                    return new Promise((resolve, reject) => {
                        webview.once('tauri://created', () => resolve());
                        webview.once('tauri://error', (e) => reject(e));
                    });
                },
                close: async (label) => {
                    const win = await WebviewWindow.getByLabel(label);
                    if (win) await win.close();
                }
            },
            ui: {
                notify: callbacks.notify,
            },
            system: {
                version: "0.1.0"
            }
        };
    }

    async loadAll() {
        try {
            const pluginList = await invoke<[string, PluginManifest][]>('list_plugins');
            for (const [dirPath, manifest] of pluginList) {
                await this.loadPlugin(dirPath, manifest);
            }
        } catch (e) {
            console.error("Failed to load plugins:", e);
        }
    }

    private async loadPlugin(dirPath: string, manifest: PluginManifest) {
        try {
            const entryPath = `${dirPath}/${manifest.entry}`;
            const code = await invoke<string>('read_plugin_file', { path: entryPath });
            
            // Create a safe-ish execution context
            const pluginModule = { exports: {} };
            // 确保 API 传递正确
            const runPlugin = new Function('module', 'exports', 'zyma', 'React', code);
            
            // 为了让插件能写 React UI，我们将 React 也注入进去
            const ReactInstance = await import('react');
            runPlugin(pluginModule, pluginModule.exports, this.api, ReactInstance);
            
            const pluginInstance: any = pluginModule.exports;
            if (pluginInstance.activate) {
                pluginInstance.activate();
            }
            
            this.plugins.set(manifest.name, pluginInstance);
            console.log(`Plugin loaded: ${manifest.name} v${manifest.version}`);
        } catch (e) {
            console.error(`Failed to execute plugin ${manifest.name}:`, e);
        }
    }
}
