import { useState, useCallback, useRef, useMemo } from 'react';
import type { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { save, ask } from '@tauri-apps/plugin-dialog';
import { pathUtils } from '../utils/pathUtils';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export interface FileData {
    id: string; // 磁盘路径或临时ID
    uid: string; // 内部唯一持久ID，用于 React Key
    name: string;
    path: string | null;
    content: string;
    originalContent: string;
    isDirty: boolean;
    encoding?: string;
}

const generateUid = () => Math.random().toString(36).substring(2, 11);
const normalize = (str: string) => (str || '').replace(/\r\n/g, '\n');

// 提取为普通的异步函数，避免 Hook 复杂度
const fsReadFile = (path: string) => invoke<any>('read_file', { path });
const fsWriteFile = (path: string, content: string) => invoke<void>('write_file', { path, content });

export interface FileManagement {
    openFiles: FileData[];
    setOpenFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
    activeFilePath: string | null;
    setActiveFilePath: (path: string | null) => void;
    editorViewRef: React.MutableRefObject<EditorView | null>;
    handleFileSelect: (path: string, name: string, line?: number) => Promise<void>;
    handleEditorChange: (content: string) => void;
    doSave: (file: FileData | null, force?: boolean) => Promise<boolean>;
    closeFile: (id: string) => void;
    handleNewFile: () => void;
    handleCreate: (targetPath: string, type: 'file' | 'dir', reload?: (path: string) => void, rootPath?: string, name?: string) => Promise<void>;
    handleRename: (oldPath: string, oldName: string, reload?: (path: string) => void, rootPath?: string, newName?: string) => Promise<void>;
    handleDelete: (path: string, name: string, reload?: (path: string) => void, rootPath?: string) => Promise<void>;
}

export function useFileManagement(): FileManagement {
    const { t } = useTranslation();
    const [openFiles, setOpenFiles] = useState<FileData[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const pendingFiles = useRef<Set<string>>(new Set());

    const handleFileSelect = useCallback(async (path: string, name: string, line?: number) => {
        // ... (保持原逻辑不变)
        if (line) {
            (window as any).__pendingLineJump = { path, line, ts: Date.now() };
        }

        const existing = openFiles.find(f => f.path === path);
        if (existing) {
            if (activeFilePath === existing.id && editorViewRef.current && line) {
                try {
                    const view = editorViewRef.current;
                    const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines));
                    view.dispatch({
                        selection: { anchor: lineInfo.from, head: lineInfo.from },
                        scrollIntoView: true
                    });
                    delete (window as any).__pendingLineJump;
                } catch (e) { console.warn("Manual jump failed", e); }
            }
            setActiveFilePath(existing.id);
            return;
        }

        if (pendingFiles.current.has(path)) return;
        pendingFiles.current.add(path);

                try {

                    const res = await fsReadFile(path);

                    const content = normalize(res.content);

                    const newFile: FileData = { 

                        id: path, 

                        uid: generateUid(),

                        name, 

                        path, 

                        content, 

                        originalContent: content, 

                        isDirty: false,

                        encoding: res.encoding 

                    };

        
            setOpenFiles(prev => {
                if (prev.some(f => f.path === path)) return prev;
                return [...prev, newFile];
            });
            setActiveFilePath(path);
        } catch (e) { 
            console.error(e); 
            toast.error(`Failed to open file: ${name}`);
        } finally {
            pendingFiles.current.delete(path);
        }
    }, [openFiles, activeFilePath]);

    const doSave = useCallback(async (file: FileData | null, force: boolean = false) => {
        const target = file || openFiles.find(f => f.id === activeFilePath);
        if (!target) return false;

        const currentText = editorViewRef.current?.state.doc.toString() || target.content;
        const normalizedCurrent = normalize(currentText);

        if (!force && normalizedCurrent === target.originalContent) return true;

        let targetPath = target.path;
        try {
            if (force || !targetPath) {
                const selected = await save({ defaultPath: targetPath || target.name });
                if (!selected) return false;
                targetPath = selected;
            }
            if (!targetPath) return false;
            if (targetPath === target.path && normalizedCurrent === target.originalContent) return true; 

            await fsWriteFile(targetPath, currentText);
            const fileName = pathUtils.getFileName(targetPath);
            const finalPath = targetPath;
            setOpenFiles(prev => prev.map(f => f.id === target.id ? { 
                ...f, id: finalPath, path: finalPath, name: fileName, content: currentText, originalContent: normalizedCurrent, isDirty: false 
            } : f));
            if (activeFilePath === target.id) setActiveFilePath(finalPath);
            return true;
        } catch (e) { 
            console.error("Save/Dialog Error:", e);
            toast.error(`Save failed: ${String(e)}`);
            return false; 
        }
    }, [activeFilePath, openFiles]);

    // --- 新增：磁盘写操作 (合并自 useFileIO) ---
    const handleCreate = useCallback(async (targetPath: string, type: 'file' | 'dir', reload?: (path: string) => void, rootPath?: string, name?: string) => {
        const finalName = name || prompt(t('EnterName', { type }));
        if (!finalName) return;
        const path = `${targetPath}/${finalName}`;
        try {
            if (type === 'file') await invoke('create_file', { path });
            else await invoke('create_dir', { path });
            if (reload && rootPath) reload(rootPath);
        } catch (e) { toast.error(String(e)); }
    }, [t]);

    const handleRename = useCallback(async (oldPath: string, oldName: string, reload?: (path: string) => void, rootPath?: string, newName?: string) => {
        const finalNewName = newName || prompt(t('EnterName', { type: 'New' }), oldName);
        if (!finalNewName || finalNewName === oldName) return;
        const lastSlashIndex = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'));
        const parentPath = lastSlashIndex > -1 ? oldPath.substring(0, lastSlashIndex) : '.';
        const separator = lastSlashIndex > -1 ? oldPath[lastSlashIndex] : '/';
        const finalPath = parentPath === '.' ? finalNewName : `${parentPath}${separator}${finalNewName}`;
        try {
            await invoke('rename_item', { at: oldPath, to: finalPath });
            if (reload && rootPath) reload(rootPath);
        } catch (e) { toast.error(String(e)); }
    }, [t]);

    const handleDelete = useCallback(async (path: string, name: string, reload?: (path: string) => void, rootPath?: string) => {
        const confirmed = await ask(t('ConfirmDelete', { name }), { title: t('File'), kind: 'warning' });
        if (confirmed) {
            try {
                await invoke('remove_item', { path });
                setOpenFiles(prev => prev.filter(f => f.id !== path));
                if (reload && rootPath) reload(rootPath);
            } catch (e) { toast.error(String(e)); }
        }
    }, [t]);

    const handleEditorChange = useCallback((content: string) => {
        setOpenFiles(prev => {
            const idx = prev.findIndex(f => f.id === activeFilePath);
            if (idx === -1) return prev;
            const file = prev[idx];
            const normalizedNew = normalize(content);
            const isDirty = normalizedNew !== file.originalContent;
            if (file.content === content && file.isDirty === isDirty) return prev;
            const next = [...prev];
            next[idx] = { ...file, content, isDirty }; 
            return next;
        });
    }, [activeFilePath]);

    const closeFile = useCallback((id: string) => {
        setOpenFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const handleNewFile = useCallback(() => {
        const tempId = `untitled-${Date.now()}`;
        const name = `Untitled-${openFiles.filter(f => !f.path).length + 1}`;
        const newFile: FileData = { id: tempId, uid: generateUid(), name, path: null, content: '', originalContent: '', isDirty: false };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(tempId);
    }, [openFiles]);

    return useMemo(() => ({
        openFiles, setOpenFiles, activeFilePath, setActiveFilePath, editorViewRef,
        handleFileSelect, handleEditorChange, doSave, closeFile, handleNewFile,
        handleCreate, handleRename, handleDelete
    }), [openFiles, activeFilePath, handleFileSelect, handleEditorChange, doSave, closeFile, handleNewFile, handleCreate, handleRename, handleDelete]);
}
