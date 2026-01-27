import type { UnlistenFn } from '@tauri-apps/api/event';
import type { Command } from '../CommandSystem/CommandRegistry';
import type { View } from '../ViewSystem/ViewRegistry';
import type { StatusBarItem } from '../StatusBar/StatusBarRegistry';

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
        showDiff: (originalPath: string, modifiedContent: string, title?: string) => Promise<void>;
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
    system: {
        version: string;
        getEnv: (name: string) => Promise<string | null>;
        exec: (command: string, args: string[]) => Promise<ExecResult>;
        invoke: (cmd: string, args?: any) => Promise<any>;
    };
}
