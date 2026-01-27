import { useState, useCallback, useRef, useMemo } from 'react';
import type { EditorView } from '@codemirror/view';
import { useFileIO } from './useFileIO';

export interface FileData {
    name: string;
    path: string | null;
    content: string;
    originalContent: string;
}

export function useFileManagement(t: any) {
    const [openFiles, setOpenFiles] = useState<FileData[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    
    const { readFile, writeFile } = useFileIO();

    // 1. 打开文件逻辑
    const handleFileSelect = useCallback(async (path: string, name: string) => {
        if (openFiles.find(f => f.path === path)) {
            setActiveFilePath(path);
            return;
        }
        try {
            const content = await readFile(path);
            const newFile: FileData = { name, path, content, originalContent: content };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (e) { console.error('Failed to open file:', e); }
    }, [openFiles, readFile]);

    // 2. 保存文件逻辑
    const doSave = useCallback(async (file: FileData | null, force: boolean = false) => {
        if (!file || (!force && file.content === file.originalContent)) return true;
        if (!file.path) return false;

        try {
            await writeFile(file.path, file.content);
            setOpenFiles(prev => prev.map(f => f.path === file.path ? { ...f, originalContent: file.content } : f));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    }, [writeFile]);

    // 3. 内容变更同步
    const handleEditorChange = useCallback((content: string) => {
        setOpenFiles(prev => prev.map(f => (f.path || f.name) === activeFilePath ? { ...f, content } : f));
    }, [activeFilePath]);

    const closeFile = useCallback((path: string) => {
        setOpenFiles(prev => prev.filter(f => (f.path || f.name) !== path));
    }, []);

    const handleNewFile = useCallback(() => {
        const name = `Untitled-${openFiles.length + 1}`;
        const newFile: FileData = { name, path: null, content: '', originalContent: '' };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(name);
    }, [openFiles.length]);

    return useMemo(() => ({
        openFiles,
        setOpenFiles,
        activeFilePath,
        setActiveFilePath,
        editorViewRef,
        handleFileSelect,
        handleEditorChange,
        doSave,
        closeFile,
        handleNewFile
    }), [openFiles, activeFilePath, handleFileSelect, handleEditorChange, doSave, closeFile, handleNewFile]);
}