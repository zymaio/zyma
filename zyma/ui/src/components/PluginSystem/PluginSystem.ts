import React from 'react';
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

    getFileMenuItems() { return this.fileMenuItems.sort((a, b) => (a.order || 0) - (b.order || 0)); }

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
            
            for (const name of Array.from(this.manifests.keys())) {
                await this.unloadPlugin(name, true);
            }
            this.manifests.clear();

            for (const [dirPath, manifest, isBuiltin] of pluginList) {
                const isEnabled = !disabledPlugins.includes(manifest.name);
                this.manifests.set(manifest.name, { ...manifest, path: dirPath, isBuiltin });
                
                if (isEnabled) {
                    this.handleContributions(manifest, dirPath);
                    await this.loadPlugin(dirPath, manifest);
                }
            }
            this.notifyUI();
        } catch (e) { console.error("[PluginSystem] Load failed", e); this.notifyUI(); }
    }

    private handleContributions(manifest: PluginManifest, _dirPath: string) {
        if (!this.pluginResources.has(manifest.name)) {
            this.pluginResources.set(manifest.name, { views: [], statusItems: [], commands: [] });
        }
        const resources = this.pluginResources.get(manifest.name)!;

        if (manifest.contributes) {
            console.log(`>>> [PluginSystem] Found 'contributes' field for ${manifest.name}:`, manifest.contributes);
            
            if (manifest.contributes.views) {
                console.log(`>>> [PluginSystem] Found 'views' in contributions:`, manifest.contributes.views);
                
                manifest.contributes.views.forEach(viewDef => {
                    const viewId = viewDef.id;
                    if (!resources.views.includes(viewId)) {
                        resources.views.push(viewId);
                        
                                            console.log(`>>> [PluginSystem] REGISTERING VIEW: ${viewId} | Icon: ${viewDef.icon}`);
                                            
                                            // 核心改进：创建一个绑定了 ID 的 ChatPanel 实例
                                            const ChatPanel = this.callbacks.components.ChatPanel;
                                            const component = React.createElement(ChatPanel, { 
                                                participantId: viewId,
                                                title: viewDef.title 
                                            });
                        
                                                                views.registerView({
                        
                                                                    id: viewId,
                        
                                                                    title: viewDef.title,
                        
                                                                    icon: viewDef.icon || manifest.icon || 'Puzzle',
                        
                                                                    component: component, 
                        
                                                                    order: 100 // 默认排序调至 100
                        
                                                                });                    } else {
                        console.log(`>>> [PluginSystem] Skipped duplicate view: ${viewId}`);
                    }
                });
            }
        } else {
            console.log(`>>> [PluginSystem] No 'contributes' field found in manifest for ${manifest.name}`);
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

            const resources = this.pluginResources.get(manifest.name) || { views: [], statusItems: [], commands: [] };
            if (!this.pluginResources.has(manifest.name)) this.pluginResources.set(manifest.name, resources);

            const api = PluginAPIBuilder.create(
                manifest, 
                resources, 
                { ...this.callbacks, addFileMenuItem: (item: any) => this.fileMenuItems.push({ ...item, pluginName: manifest.name }) },
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
        } catch (e) { console.error(`Error activating plugin ${manifest.name}:`, e); }
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