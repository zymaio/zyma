import { useState, useCallback, useRef, useMemo } from 'react';
import type { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { pathUtils } from '../utils/pathUtils';
import toast from 'react-hot-toast';

export interface FileData {
    id: string;
    name: string;
    path: string | null;
    content: string;
    originalContent: string;
    isDirty: boolean;
}

const normalize = (str: string) => (str || '').replace(/\r\n/g, '\n');

// 提取为普通的异步函数，避免 Hook 复杂度
const fsReadFile = (path: string) => invoke<string>('read_file', { path });
const fsWriteFile = (path: string, content: string) => invoke<void>('write_file', { path, content });

export function useFileManagement() {
    const [openFiles, setOpenFiles] = useState<FileData[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    const handleFileSelect = useCallback(async (path: string, name: string) => {
        const existing = openFiles.find(f => f.path === path);
        if (existing) {
            setActiveFilePath(existing.id);
            return;
        }
        try {
            const raw = await fsReadFile(path);
            const content = normalize(raw);
            const newFile: FileData = { id: path, name, path, content, originalContent: content, isDirty: false };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (e) { 
            console.error(e); 
            toast.error(`Failed to open file: ${name}`);
        }
    }, [openFiles]);

    const doSave = useCallback(async (file: FileData | null, force: boolean = false) => {
        const target = file || openFiles.find(f => f.id === activeFilePath);
        if (!target) return false;

        const currentText = editorViewRef.current?.state.doc.toString() || target.content;
        const normalizedCurrent = normalize(currentText);

        if (!force && normalizedCurrent === target.originalContent) return true;

        let targetPath = target.path;
        if (!targetPath) {
            const selected = await save({ defaultPath: target.name });
            if (!selected) return false;
            targetPath = selected;
        }

        try {
            await fsWriteFile(targetPath, currentText);
            const fileName = pathUtils.getFileName(targetPath);
            
            setOpenFiles(prev => prev.map(f => f.id === target!.id ? { 
                ...f, 
                id: targetPath!,
                path: targetPath,
                name: fileName,
                content: currentText,
                originalContent: normalizedCurrent, 
                isDirty: false 
            } : f));
            
            if (activeFilePath === target.id) setActiveFilePath(targetPath);
            return true;
        } catch (e) { 
            toast.error(`Save failed: ${target.name}`);
            return false; 
        }
    }, [activeFilePath, openFiles]);

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
        const newFile: FileData = { id: tempId, name, path: null, content: '', originalContent: '', isDirty: false };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(tempId);
    }, [openFiles]);

    return useMemo(() => ({
        openFiles, setOpenFiles, activeFilePath, setActiveFilePath, editorViewRef,
        handleFileSelect, handleEditorChange, doSave, closeFile, handleNewFile
    }), [openFiles, activeFilePath, handleFileSelect, handleEditorChange, doSave, closeFile, handleNewFile]);
}
