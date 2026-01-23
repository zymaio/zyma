import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

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

    const handleFileSelect = useCallback(async (path: string, name: string, line?: number) => {
        const cleanPath = path.replace(/^"(.*)"$/, '$1');
        const existing = stateRef.current.openFiles.find(f => f.path === cleanPath);
        
        if (existing) {
            setActiveFilePath(cleanPath);
            if (line !== undefined && editorViewRef.current) {
                setTimeout(() => {
                    if (!editorViewRef.current) return;
                    const view = editorViewRef.current;
                    const safeLine = Math.min(Math.max(1, line), view.state.doc.lines);
                    const lineInfo = view.state.doc.line(safeLine);
                    view.dispatch({ 
                        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }), 
                        selection: EditorSelection.cursor(lineInfo.from) 
                    });
                    view.focus();
                }, 50);
            }
            return;
        }

        try {
            const content = await invoke<string>('read_file', { path: cleanPath });
            const newFile: OpenedFile = { path: cleanPath, name: name.replace(/^"(.*)"$/, '$1'), content, originalContent: content };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFilePath(cleanPath);
            if (line !== undefined) {
                setTimeout(() => {
                    if (!editorViewRef.current) return;
                    const view = editorViewRef.current;
                    const safeLine = Math.min(Math.max(1, line), view.state.doc.lines);
                    const lineInfo = view.state.doc.line(safeLine);
                    view.dispatch({ 
                        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }), 
                        selection: EditorSelection.cursor(lineInfo.from) 
                    });
                    view.focus();
                }, 100);
            }
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
