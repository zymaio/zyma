import React from 'react';
import { views } from '../ViewSystem/ViewRegistry';
import { statusBar } from '../StatusBar/StatusBarRegistry';
import { commands } from '../CommandSystem/CommandRegistry';
import type { PluginManifest } from './types';

/**
 * 专门负责解析和管理插件的声明式贡献 (Contributes)
 */
export class ContributionRegistry {
    private resources: Map<string, { views: string[], statusItems: string[], commands: string[] }> = new Map();
    private fileMenuItems: { label: string, commandId: string, order?: number, pluginName: string }[] = [];
    private callbacks: { components: { ChatPanel: any }, addFileMenuItem: (item: any) => void };

    constructor(callbacks: { components: { ChatPanel: any }, addFileMenuItem: (item: any) => void }) {
        this.callbacks = callbacks;
    }

    updateComponents(components: any) {
        this.callbacks.components = components;
    }

    /**
     * 处理插件的贡献声明
     */
    handle(manifest: PluginManifest) {
        const pluginName = manifest.name;
        if (!this.resources.has(pluginName)) {
            this.resources.set(pluginName, { views: [], statusItems: [], commands: [] });
        }
        const res = this.resources.get(pluginName)!;

        // 1. 处理视图贡献
        if (manifest.contributes?.views) {
            manifest.contributes.views.forEach(viewDef => {
                if (!res.views.includes(viewDef.id)) {
                    res.views.push(viewDef.id);
                    
                    // 存储为一个动态渲染函数，确保每次获取视图时都从最新的 callbacks 中读取组件
                    const component = () => {
                        const ChatPanel = this.callbacks.components.ChatPanel;
                        if (!ChatPanel) return React.createElement('div', { style: { padding: '20px', opacity: 0.5 } }, 'Loading Component...');
                        return React.createElement(ChatPanel, { 
                            participantId: viewDef.id,
                            title: viewDef.title 
                        });
                    };

                    views.registerView({
                        id: viewDef.id,
                        title: viewDef.title,
                        icon: viewDef.icon || manifest.icon || 'Puzzle',
                        component: component,
                        order: 100
                    });
                }
            });
        }
    }

    /**
     * 获取特定插件的资源句柄（用于 API 调用）
     */
    getResourceHandle(pluginName: string) {
        if (!this.resources.has(pluginName)) {
            this.resources.set(pluginName, { views: [], statusItems: [], commands: [] });
        }
        return this.resources.get(pluginName)!;
    }

    /**
     * 卸载特定插件的所有贡献资源
     */
    unload(pluginName: string) {
        const res = this.resources.get(pluginName);
        if (res) {
            res.views.forEach(id => views.unregisterView(id));
            res.statusItems.forEach(id => statusBar.unregisterItem(id));
            res.commands.forEach(id => commands.unregisterCommand(id));
            this.resources.delete(pluginName);
        }
        this.fileMenuItems = this.fileMenuItems.filter(m => m.pluginName !== pluginName);
    }

    addFileMenuItem(item: any) {
        this.fileMenuItems.push(item);
        this.callbacks.addFileMenuItem(item);
    }

    getFileMenuItems() {
        return this.fileMenuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
}
