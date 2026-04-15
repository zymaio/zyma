import type { UnlistenFn } from '@tauri-apps/api/event';
import type { Command } from '../CommandSystem/CommandRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import type { StatusBarItem } from '../StatusBar/StatusBarRegistry';
import type React from 'react';

export interface PluginManifest {
    name: string;
    version: string;
    author: string;
    entry: string;
    description?: string;
    icon?: string;
    path?: string;
    isBuiltin?: boolean;
    contributes?: {
        views?: { id: string, title: string, icon?: string }[];
    };
}

export interface FileStat {
    file_type: "file" | "dir" | "symlink" | "unknown";
    size: number;
    mtime: number;
}

export interface ExecResult {
    stdout: string;
    stderr: string;
    exit_code: number;
}

export interface OutputChannel {
    append: (value: string) => void;
    appendLine: (value: string) => void;
    clear: () => void;
    show: () => void;
}

export interface FileSystemWatcher {
    onDidCreate: (handler: (path: string) => void) => Promise<UnlistenFn>;
    onDidChange: (handler: (path: string) => void) => Promise<UnlistenFn>;
    onDidDelete: (handler: (path: string) => void) => Promise<UnlistenFn>;
    dispose: () => void;
}

export interface TextDocument {
    uri: string; // 在 Zyma 中即为文件完整路径
}

export interface TextEditorSelectionChangeEvent {
    textEditor: { uri: string };
    selections: { line: number, col: number }[]; // 简化版选区
}

export interface WindowState {
    focused: boolean;
}

export interface ZymaAPI {
    editor: {
        insertText: (text: string) => void;
        getContent: () => string;
        getSelection: () => string;
        showDiff: (originalPath: string, modifiedContent: string) => Promise<void>;
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
        stat: (path: string) => Promise<FileStat>;
        readDirectory: (path: string) => Promise<any[]>;
        findFiles: (baseDir: string, include: string, exclude?: string) => Promise<string[]>;
        createFileSystemWatcher: (path: string) => FileSystemWatcher;
        onDidSaveTextDocument: (listener: (doc: TextDocument) => void) => Promise<UnlistenFn>;
        onDidCreateFiles: (listener: (path: string) => void) => Promise<UnlistenFn>;
        onDidChangeFiles: (listener: (path: string) => void) => Promise<UnlistenFn>;
        onDidDeleteFiles: (listener: (path: string) => void) => Promise<UnlistenFn>;
        onDidOpenTextDocument: (listener: (doc: TextDocument) => void) => Promise<UnlistenFn>;
    };
    statusBar: {
        registerItem: (item: StatusBarItem) => void;
    };
    menus: {
        registerFileMenu: (item: { label: string, commandId: string, order?: number }) => void;
    };
    window: {
        create: (label: string, options: any) => Promise<void>;
        close: (label: string) => Promise<void>;
        openTab: (id: string, title: string, component: any) => void;
        createOutputChannel: (name: string) => OutputChannel;
        onDidChangeActiveTextEditor: (listener: (doc: TextDocument | null) => void) => Promise<UnlistenFn>;
        onDidChangeWindowState: (listener: (state: WindowState) => void) => Promise<UnlistenFn>;
        onDidChangeTextEditorSelection: (listener: (e: TextEditorSelectionChangeEvent) => void) => Promise<UnlistenFn>;
    };
    events: {
        on: (event: string, handler: (payload: any) => void) => Promise<UnlistenFn>;
    };
    storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
    };
    ui: {
        notify: (message: string) => void;
    };
    components: {
        ChatPanel: any;
    };
    auth: {
        registerAuthenticationProvider: (provider: {
            id: string,
            label: string,
            accountName?: string,
            onLogin: () => Promise<void>,
            onLogout: () => Promise<void>
        }) => void;
        unregisterAuthenticationProvider: (id: string) => void;
    };
    chat: {
        registerChatParticipant: (participant: {
            id: string,
            name: string,
            fullName: string,
            description?: string,
            icon?: string,
            commands?: { name: string, description: string }[],
            handler: (request: any, stream: any) => Promise<void>
        }) => void;
    };
    ai: {
        stream: (request: AIChatRequest) => AsyncIterableIterator<AIChatChunk>;
    };
    system: {
        version: string;
        getEnv: (name: string) => Promise<string | null>;
        exec: (command: string, args: string[]) => Promise<ExecResult>;
        invoke: (cmd: string, args?: any) => Promise<any>;
    };
}

export interface AIChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    name?: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

export interface AIChatRequest {
    messages: AIChatMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    tools?: any[];
    tool_choice?: any;
}

export interface AIChatChunk {
    id: string;
    model: string;
    choices: {
        index: number;
        delta: {
            role?: string;
            content?: string;
            tool_calls?: any[];
        };
        finish_reason?: string;
    }[];
}

/**
 * Plugin API Builder 回调接口
 */
export interface PluginCallbacks {
    insertText: (text: string) => void;
    getContent: () => string;
    getSelection: () => string;
    showDiff: (originalPath: string, modifiedContent: string) => Promise<void>;
    openCustomView?: (request: { id: string; title: string; component: React.ReactNode; options?: Record<string, unknown> }) => void;
    notify: (msg: string) => void;
    addFileMenuItem: (item: Record<string, unknown>) => void;
    onMenuUpdate?: () => void;
    components: PluginComponents;
}

/**
 * Plugin 组件接口
 */
export interface PluginComponents {
    ChatPanel: React.ComponentType<any>;
}

/**
 * Plugin API Builder 的完整回调接口（包含内部使用的回调）
 */
export interface PluginAPIBuilderCallbacks extends PluginCallbacks {
    openCustomView?: (request: { id: string; title: string; component: React.ReactNode; options?: Record<string, unknown> }) => void;
}

/**
 * Workbench Handlers 接口
 */
export interface WorkbenchHandlers {
    handleNewFile: () => void;
    handleSave: (force: boolean) => void;
    handleSaveSettings: (settings: AppSettings) => void;
    getSettings: () => AppSettings;
    setShowCommandPalette: (show: boolean) => void;
    setShowSearch: (show: boolean) => void;
    setSidebarTab: (id: string) => void;
    toggleSidebar: () => void;
    setRootPath: (path: string) => void;
    fm: import('../../hooks/useFileManagement').FileManagement;
    setActiveTabId: (id: string | null) => void;
    components: WorkbenchComponents;
    openCustomView: (request: import('../../hooks/useTabSystem').CustomViewRequest) => void;
}

/**
 * Workbench Components 接口
 */
export interface WorkbenchComponents {
    Sidebar: React.ReactNode;
    SearchPanel: React.ReactNode;
    PluginList: React.ComponentType;
    ChatPanel: (props: { getContext?: any }) => React.ReactNode;
}

/**
 * App Settings 接口（简化版）
 */
export interface AppSettings {
    language?: string;
    theme?: 'dark' | 'light' | 'abyss';
    ui_font_size?: number;
    [key: string]: any;
}
