import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { EditorView } from '@codemirror/view';

export interface OpenedFile {
    path: string;
    name: string;
    content: string;
    originalContent: string;
}

export function useFileManagement(t: (key: string) => string) {
    const [openFiles, setOpenFiles] = useState<OpenedFile[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [untitledCount, setUntitledCount] = useState(1);
    const editorViewRef = useRef<EditorView | null>(null);

    // 辅助引用，解决闭包陷阱
    const stateRef = useRef({ openFiles, activeFilePath, untitledCount });
    useEffect(() => {
        stateRef.current = { openFiles, activeFilePath, untitledCount };
    }, [openFiles, activeFilePath, untitledCount]);

    const handleFileSelect = useCallback(async (path: string, name: string) => {
        // 全系统唯一路径标准：正斜杠 + 小写
        const normalizePath = (p: string) => p.replace(/^"(.*)"$/, '$1').replace(/\\/g, '/').toLowerCase();
        const cleanPath = normalizePath(path);

        // 1. 立即检查是否已存在
        const existing = stateRef.current.openFiles.find(f => {
            if (!f.path) return false;
            return normalizePath(f.path) === cleanPath;
        });
        
        if (existing) {
            setActiveFilePath(existing.path);
            return;
        }

        // 2. 如果不存在，再执行异步读取
        try {
            const content = await invoke<string>('read_file', { path: cleanPath });
            const newFile: OpenedFile = { 
                path: cleanPath, 
                name: name.replace(/^"(.*)"$/, '$1'), 
                content, 
                originalContent: content 
            };
            
            setOpenFiles(prev => {
                if (prev.some(f => f.path && normalizePath(f.path) === cleanPath)) {
                    return prev;
                }
                return [...prev, newFile];
            });
            setActiveFilePath(cleanPath);
        } catch (error) { console.error('File open error:', error); }
    }, []);

    const handleNewFile = useCallback(() => {
        const name = `${t('NewFile')}-${stateRef.current.untitledCount}`;
        const newFile: OpenedFile = { path: "", name, content: "", originalContent: "" };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(name);
        setUntitledCount(prev => prev + 1);
    }, [t]);

    const doSave = async (targetFile: OpenedFile | null, forceDialog = false) => {
        if (!targetFile) return false;
        let savePath = targetFile.path;
        if (!savePath || forceDialog) {
            const selected = await save({ defaultPath: savePath || targetFile.name });
            if (!selected) return false;
            savePath = selected as string;
        }
        try {
            await invoke('write_file', { path: savePath, content: targetFile.content });
            const newName = savePath.split(/[\/]/).pop() || targetFile.name;
            setOpenFiles(prev => prev.map(f => 
                (f.path === targetFile.path && f.name === targetFile.name) 
                ? { ...f, path: savePath, name: newName, originalContent: f.content } : f
            ));
            setActiveFilePath(savePath);
            return true;
        } catch (e) { alert('Save failed: ' + e); return false; }
    };

    const handleEditorChange = useCallback((v: string) => {
        setOpenFiles(prev => prev.map(f => 
            (f.path || f.name) === stateRef.current.activeFilePath ? { ...f, content: v } : f
        ));
    }, []);

    const closeFile = useCallback((id: string) => {
        setOpenFiles(prev => prev.filter(x => (x.path || x.name) !== id));
        if (stateRef.current.activeFilePath === id) {
            setActiveFilePath(null);
        }
    }, []);

    return {
        openFiles,
        setOpenFiles,
        activeFilePath,
        setActiveFilePath,
        untitledCount,
        setUntitledCount,
        editorViewRef,
        handleFileSelect,
        handleNewFile,
        doSave,
        handleEditorChange,
        closeFile,
        stateRef
    };
}
