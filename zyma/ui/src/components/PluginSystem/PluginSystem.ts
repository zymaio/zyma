import { invoke } from '@tauri-apps/api/core';

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
            // In a real production app, consider using a Web Worker or a more isolated sandbox
            const pluginModule = { exports: {} };
            const runPlugin = new Function('module', 'exports', 'zyma', code);
            
            runPlugin(pluginModule, pluginModule.exports, this.api);
            
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
