import { useState, useCallback, useRef, useMemo } from 'react';
import type { EditorView } from '@codemirror/view';
import { useFileIO } from './useFileIO';
import { save } from '@tauri-apps/plugin-dialog';

export interface FileData {
    id: string;
    name: string;
    path: string | null;
    content: string;
    originalContent: string;
    isDirty: boolean;
}

/**
 * 辅助：规范化内容（统一换行符），确保对比的准确性
 */
const normalize = (str: string) => (str || '').replace(/\r\n/g, '\n');

export function useFileManagement(t: any) {
    const [openFiles, setOpenFiles] = useState<FileData[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    
    const { readFile, writeFile } = useFileIO();

    // 1. 打开文件：读取时直接规范化 originalContent
    const handleFileSelect = useCallback(async (path: string, name: string) => {
        const existing = openFiles.find(f => f.path === path);
        if (existing) {
            setActiveFilePath(existing.id);
            return;
        }
        try {
            const raw = await readFile(path);
            const content = normalize(raw);
            const newFile: FileData = { id: path, name, path, content, originalContent: content, isDirty: false };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(path);
        } catch (e) { console.error(e); }
    }, [openFiles, readFile]);

    // 2. 保存文件：保存成功后同步 originalContent
    const doSave = useCallback(async (file: FileData | null, force: boolean = false) => {
        const target = file || openFiles.find(f => f.id === activeFilePath);
        if (!target) return false;

        // 获取当前编辑器里的最新内容
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
            await writeFile(targetPath, currentText);
            const fileName = targetPath.split(/[\\/]/).pop() || target.name;
            
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
        } catch (e) { return false; }
    }, [activeFilePath, openFiles, writeFile]);

    // 3. 核心修复：内容变更同步
    const handleEditorChange = useCallback((content: string) => {
        setOpenFiles(prev => {
            const idx = prev.findIndex(f => f.id === activeFilePath);
            if (idx === -1) return prev;
            
            const file = prev[idx];
            const normalizedNew = normalize(content);
            const isDirty = normalizedNew !== file.originalContent;
            
            // 只有当 内容变了 OR 脏状态变了，才触发 React 更新
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
