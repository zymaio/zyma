import { views } from '../ViewSystem/ViewRegistry';
import { statusBar } from '../StatusBar/StatusBarRegistry';
import { commands } from '../CommandSystem/CommandRegistry';
import type { PluginManifest, PluginComponents } from './types';

/**
 * 专门负责解析和管理插件的声明式贡献 (Contributes)
 */
export class ContributionRegistry {
    private resources: Map<string, { views: string[]; statusItems: string[]; commands: string[]; tabs: string[] }> = new Map();
    private fileMenuItems: { label: string; commandId: string; order?: number; pluginName: string }[] = [];
    private callbacks: {
        components: PluginComponents;
        addFileMenuItem: (item: Record<string, unknown>) => void;
        closeTab?: (id: string) => void;
    };

    constructor(callbacks: {
        components: PluginComponents;
        addFileMenuItem: (item: Record<string, unknown>) => void;
        closeTab?: (id: string) => void;
    }) {
        this.callbacks = callbacks;
    }

    updateComponents(components: PluginComponents) {
        this.callbacks.components = components;
    }

    /**
     * 处理插件的贡献声明
     */
    handle(manifest: PluginManifest) {
        const pluginName = manifest.name;
        if (!this.resources.has(pluginName)) {
            this.resources.set(pluginName, { views: [], statusItems: [], commands: [], tabs: [] });
        }

        // ... (views logic remains same)
    }

    /**
     * 注册由插件打开的标签页以便卸载时清理
     */
    addOpenedTab(pluginName: string, tabId: string) {
        if (!this.resources.has(pluginName)) {
            this.resources.set(pluginName, { views: [], statusItems: [], commands: [], tabs: [] });
        }
        const res = this.resources.get(pluginName)!;
        if (!res.tabs.includes(tabId)) {
            res.tabs.push(tabId);
        }
    }

    /**
     * 获取特定插件的资源句柄
     */
    getResourceHandle(pluginName: string) {
        if (!this.resources.has(pluginName)) {
            this.resources.set(pluginName, { views: [], statusItems: [], commands: [], tabs: [] });
        }
        return this.resources.get(pluginName)!;
    }

    /**
     * 卸载特定插件的所有贡献资源，包括关闭它打开的标签页
     */
    unload(pluginName: string) {
        const res = this.resources.get(pluginName);
        if (res) {
            res.views.forEach(id => views.unregisterView(id));
            res.statusItems.forEach(id => statusBar.unregisterItem(id));
            res.commands.forEach(id => commands.unregisterCommand(id));

            // 关键：关闭插件打开的所有标签页
            if (this.callbacks.closeTab) {
                res.tabs.forEach(tabId => this.callbacks.closeTab!(tabId));
            }

            this.resources.delete(pluginName);
        }
        this.fileMenuItems = this.fileMenuItems.filter(m => m.pluginName !== pluginName);
    }

    addFileMenuItem(item: Record<string, unknown>) {
        this.fileMenuItems.push(item as { label: string; commandId: string; order?: number; pluginName: string });
        this.callbacks.addFileMenuItem(item);
    }

    getFileMenuItems() {
        return this.fileMenuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
}
