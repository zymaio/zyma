import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { commands } from '../CommandSystem/CommandRegistry';
import type { Command } from '../CommandSystem/CommandRegistry';
import { views } from '../ViewSystem/ViewRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import { statusBar } from '../StatusBar/StatusBarRegistry';
import type { StatusBarItem } from '../StatusBar/StatusBarRegistry';
import type { PluginManifest, ZymaAPI, FileSystemWatcher } from './types';

export class PluginManager {
    private plugins: Map<string, any> = new Map();
    private manifests: Map<string, PluginManifest> = new Map();
    private unlisteners: Map<string, UnlistenFn[]> = new Map();
    private pluginResources: Map<string, { views: string[], statusItems: string[], commands: string[] }> = new Map();
    private fileMenuItems: { label: string, commandId: string, order?: number, pluginName: string }[] = [];
    private listeners: (() => void)[] = [];
    private callbacks: { 
        insertText: (text: string) => void,
        getContent: () => string,
        notify: (msg: string) => void,
        showDiff: (originalPath: string, modifiedContent: string, title?: string) => Promise<void>,
        onMenuUpdate?: () => void
    };

    constructor(callbacks: { 
        insertText: (text: string) => void,
        getContent: () => string,
        notify: (msg: string) => void,
        showDiff: (originalPath: string, modifiedContent: string, title?: string) => Promise<void>,
        onMenuUpdate?: () => void
    }) {
        this.callbacks = callbacks;
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notify() {
        this.listeners.forEach(l => l());
        if (this.callbacks.onMenuUpdate) this.callbacks.onMenuUpdate();
    }

    getFileMenuItems() {
        return this.fileMenuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    getLoadedPlugins() {
        const disabled = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
        return Array.from(this.manifests.values()).map(m => ({
            ...m,
            id: m.name,
            enabled: !disabled.includes(m.name)
        }));
    }

    private createAPI(manifest: PluginManifest): ZymaAPI {
        const resources: { views: string[], statusItems: string[], commands: string[] } = { views: [], statusItems: [], commands: [] };
        this.pluginResources.set(manifest.name, resources);

        return {
            editor: {
                insertText: this.callbacks.insertText,
                getContent: this.callbacks.getContent,
                showDiff: this.callbacks.showDiff,
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
                        onDidCreate: (handler) => listen('fs-event', (e: any) => { if (e.payload.kind === 'Create') handler(e.payload.paths[0]); }),
                        onDidChange: (handler) => listen('fs-event', (e: any) => { if (e.payload.kind === 'Modify') handler(e.payload.paths[0]); }),
                        onDidDelete: (handler) => listen('fs-event', (e: any) => { if (e.payload.kind === 'Remove') handler(e.payload.paths[0]); }),
                        dispose: () => invoke('fs_unwatch', { path })
                    };
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
                    this.fileMenuItems.push({ ...item, pluginName: manifest.name });
                    this.notify();
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
                }
            },
            events: {
                on: async (event: string, handler: (payload: any) => void) => {
                    const unlisten = await listen(event, (eventData) => {
                        handler(eventData.payload);
                    });
                    if (!this.unlisteners.has(manifest.name)) {
                        this.unlisteners.set(manifest.name, []);
                    }
                    this.unlisteners.get(manifest.name)!.push(unlisten);
                    return unlisten;
                }
            },
            storage: {
                get: async (key: string) => {
                    const fullKey = `plugin:${manifest.name}:${key}`;
                    const val = localStorage.getItem(fullKey);
                    return val ? JSON.parse(val) : null;
                },
                set: async (key: string, value: any) => {
                    const fullKey = `plugin:${manifest.name}:${key}`;
                    localStorage.setItem(fullKey, JSON.stringify(value));
                }
            },
            ui: {
                notify: this.callbacks.notify,
            },
            system: {
                version: "0.1.0",
                getEnv: (name: string) => invoke('system_get_env', { name }),
                exec: (command: string, args: string[]) => invoke('system_exec', { program: command, args }),
                invoke: (cmd: string, args?: any) => invoke(cmd, args)
            }
        };
    }

    async loadAll() {
        try {
            const disabledPlugins = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
            const pluginList = await invoke<[string, PluginManifest, boolean][]>('list_plugins');
            
            this.manifests.clear();

            for (const [dirPath, manifest, isBuiltin] of pluginList) {
                this.manifests.set(manifest.name, { ...manifest, path: dirPath, isBuiltin });
            }

            const pluginsToLoad = pluginList.filter(([_, m]) => !disabledPlugins.includes(m.name) && !this.plugins.has(m.name));
            await Promise.all(pluginsToLoad.map(([dirPath, manifest]) => this.loadPlugin(dirPath, manifest)));
            
            this.notify();
        } catch (e) {
            console.error(e);
        }
    }

    private async loadPlugin(dirPath: string, manifest: PluginManifest) {
        try {
            const entryPath = `${dirPath}/${manifest.entry}`;
            const code = await invoke<string>('read_plugin_file', { path: entryPath });
            const pluginModule = { exports: {} };
            const runPlugin = new Function('module', 'exports', 'zyma', 'React', 'Lucide', code);
            const ReactInstance = await import('react');
            const LucideIcons = await import('lucide-react');
            const api = this.createAPI(manifest);
            runPlugin(pluginModule, pluginModule.exports, api, ReactInstance, LucideIcons);
            const pluginInstance: any = pluginModule.exports;
            if (pluginInstance.activate) {
                const res = pluginInstance.activate(api, ReactInstance, LucideIcons);
                if (res instanceof Promise) await res;
            }
            this.plugins.set(manifest.name, pluginInstance);
        } catch (e) {
            console.error(e);
        }
    }

    async disablePlugin(name: string) {
        await this.unloadPlugin(name, true);
        const disabled = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
        if (!disabled.includes(name)) {
            disabled.push(name);
            localStorage.setItem('zyma_disabled_plugins', JSON.stringify(disabled));
        }
        this.notify();
    }

    async enablePlugin(name: string) {
        const disabled = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
        localStorage.setItem('zyma_disabled_plugins', JSON.stringify(disabled.filter((n: string) => n !== name)));
        await this.loadAll();
    }

    async unloadPlugin(name: string, keepManifest = false) {
        const pluginInstance = this.plugins.get(name);
        if (pluginInstance && pluginInstance.deactivate) {
            try { pluginInstance.deactivate(); } catch (e) {}
        }
        const unlisteners = this.unlisteners.get(name);
        if (unlisteners) {
            unlisteners.forEach(unlisten => unlisten());
            this.unlisteners.delete(name);
        }
        const resources = this.pluginResources.get(name);
        if (resources) {
            resources.views.forEach(id => views.unregisterView(id));
            resources.statusItems.forEach(id => statusBar.unregisterItem(id));
            resources.commands.forEach(id => commands.unregisterCommand(id));
            this.pluginResources.delete(name);
        }
        this.fileMenuItems = this.fileMenuItems.filter(item => item.pluginName !== name);
        this.plugins.delete(name);
        if (!keepManifest) this.manifests.delete(name);
    }
}