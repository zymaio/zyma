import { invoke } from '@tauri-apps/api/core';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { PluginManifest } from './types';
import { PluginAPIBuilder } from './PluginAPIBuilder';
import { ContributionRegistry } from './ContributionRegistry';
import toast from 'react-hot-toast';

export class PluginManager {
    private plugins: Map<string, any> = new Map();
    private manifests: Map<string, PluginManifest> = new Map();
    private unlisteners: Map<string, UnlistenFn[]> = new Map();
    private contributionRegistry: ContributionRegistry;
    private listeners: (() => void)[] = [];
    private callbacks: any;

    constructor(callbacks: any) {
        this.callbacks = callbacks;
        this.contributionRegistry = new ContributionRegistry({
            components: callbacks.components,
            addFileMenuItem: (item) => callbacks.addFileMenuItem(item)
        });
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notifyUI() {
        this.listeners.forEach(l => l());
        if (this.callbacks.onMenuUpdate) this.callbacks.onMenuUpdate();
    }

    getFileMenuItems() { return this.contributionRegistry.getFileMenuItems(); }

    setCallbacks(callbacks: any) {
        Object.assign(this.callbacks, callbacks);
        // 同时更新 contributionRegistry 的回调 (假设也是同一个对象引用)
        Object.assign((this.contributionRegistry as any).callbacks, callbacks);
    }

    setComponents(components: any) {
        this.callbacks.components = components;
        this.contributionRegistry.updateComponents(components);
    }

    getLoadedPlugins() {
        const disabled = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
        return Array.from(this.manifests.values()).map(m => ({
            ...m, id: m.name, enabled: !disabled.includes(m.name)
        }));
    }

    async loadAll() {
        try {
            const disabledPlugins = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
            const pluginList = await invoke<[string, PluginManifest, boolean][]>('list_plugins');
            
            // 清理
            for (const name of Array.from(this.manifests.keys())) { await this.unloadPlugin(name, true); }
            this.manifests.clear();

            for (const [dirPath, manifest, isBuiltin] of pluginList) {
                const isEnabled = !disabledPlugins.includes(manifest.name);
                this.manifests.set(manifest.name, { ...manifest, path: dirPath, isBuiltin });
                
                if (isEnabled) {
                    this.contributionRegistry.handle(manifest);
                    await this.loadPlugin(dirPath, manifest);
                }
            }
            this.notifyUI();
        } catch (e) { 
            console.error("[PluginManager] Load failed", e); 
            toast.error('Failed to initialize plugin system');
            this.notifyUI(); 
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

            const resources = this.contributionRegistry.getResourceHandle(manifest.name);

            const api = PluginAPIBuilder.create(
                manifest, 
                resources, 
                this.contributionRegistry,
                { ...this.callbacks, addFileMenuItem: (item: any) => this.contributionRegistry.addFileMenuItem(item) },
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
        } catch (e) { 
            console.error(`Error activating plugin ${manifest.name}:`, e); 
            toast.error(`Plugin failed to load: ${manifest.name}`);
        }
    }

    async enablePlugin(name: string) {
        const disabled = JSON.parse(localStorage.getItem('zyma_disabled_plugins') || '[]');
        localStorage.setItem('zyma_disabled_plugins', JSON.stringify(disabled.filter((n: string) => n !== name)));
        await this.loadAll();
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

    async unloadPlugin(name: string, keepManifest = false) {
        const pluginInstance = this.plugins.get(name);
        if (pluginInstance?.deactivate) { try { pluginInstance.deactivate(); } catch (e) {} }
        
        const unlisteners = this.unlisteners.get(name);
        if (unlisteners) {
            for (const un of unlisteners) { try { (await un)(); } catch(e) {} }
            this.unlisteners.delete(name);
        }

        this.contributionRegistry.unload(name);
        this.plugins.delete(name);
        if (!keepManifest) this.manifests.delete(name);
    }
}
