import { invoke } from '@tauri-apps/api/core';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { commands } from '../CommandSystem/CommandRegistry';
import { views } from '../ViewSystem/ViewRegistry';
import { statusBar } from '../StatusBar/StatusBarRegistry';
import type { PluginManifest } from './types';
import { PluginAPIBuilder } from './PluginAPIBuilder';

export class PluginManager {
    private plugins: Map<string, any> = new Map();
    private manifests: Map<string, PluginManifest> = new Map();
    private unlisteners: Map<string, UnlistenFn[]> = new Map();
    private pluginResources: Map<string, { views: string[], statusItems: string[], commands: string[] }> = new Map();
    private fileMenuItems: { label: string, commandId: string, order?: number, pluginName: string }[] = [];
    private listeners: (() => void)[] = [];
    private callbacks: any;

    constructor(callbacks: any) {
        this.callbacks = callbacks;
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notifyUI() {
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
            this.notifyUI();
        } catch (e) { console.error(e); }
    }

    private async loadPlugin(dirPath: string, manifest: PluginManifest) {
        try {
            const entryPath = `${dirPath}/${manifest.entry}`;
            const code = await invoke<string>('read_plugin_file', { path: entryPath });
            const pluginModule = { exports: {} };
            const runPlugin = new Function('module', 'exports', 'zyma', 'React', 'Lucide', code);
            const ReactInstance = await import('react');
            const LucideIcons = await import('lucide-react');

            const resources = { views: [], statusItems: [], commands: [] };
            this.pluginResources.set(manifest.name, resources);

            const api = PluginAPIBuilder.create(
                manifest, 
                resources, 
                { ...this.callbacks, addFileMenuItem: (item: any) => this.fileMenuItems.push(item) },
                () => this.notifyUI(),
                (un: any) => {
                    if (!this.unlisteners.has(manifest.name)) this.unlisteners.set(manifest.name, []);
                    this.unlisteners.get(manifest.name)!.push(un);
                }
            );

            runPlugin(pluginModule, pluginModule.exports, api, ReactInstance, LucideIcons);
            const pluginInstance: any = pluginModule.exports;
            if (pluginInstance && typeof pluginInstance.activate === 'function') {
                const res = pluginInstance.activate(api, ReactInstance, LucideIcons);
                if (res instanceof Promise) await res;
            }
            this.plugins.set(manifest.name, pluginInstance);
        } catch (e) { console.error(`Error loading plugin ${manifest.name}:`, e); }
    }

    async disablePlugin(name: string) {
        await this.unloadPlugin(name, true);
        const disabled = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
        if (!disabled.includes(name)) {
            disabled.push(name);
            localStorage.setItem('zyma_disabled_plugins', JSON.stringify(disabled));
        }
        this.notifyUI();
    }

    async enablePlugin(name: string) {
        const disabled = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
        localStorage.setItem('zyma_disabled_plugins', JSON.stringify(disabled.filter((n: string) => n !== name)));
        await this.loadAll();
    }

    async unloadPlugin(name: string, keepManifest = false) {
        const pluginInstance = this.plugins.get(name);
        if (pluginInstance && pluginInstance.deactivate) { try { pluginInstance.deactivate(); } catch (e) {} }
        const unlisteners = this.unlisteners.get(name);
        if (unlisteners) { unlisteners.forEach(async (un) => { const f = await un; f(); }); this.unlisteners.delete(name); }
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