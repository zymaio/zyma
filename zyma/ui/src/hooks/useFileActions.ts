import { useCallback, useRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { pathUtils } from '../utils/pathUtils';
import toast from 'react-hot-toast';
import { generateUid, normalizeContent } from './useFileState';
import type { FileData, UseFileStateReturn } from './useFileState';
import { logger } from '../utils/logger';

const fsReadFile = (path: string) => invoke<any>('read_file', { path });
const fsWriteFile = (path: string, content: string) => invoke<void>('write_file', { path, content });

export function useFileActions(fileState: UseFileStateReturn) {
    const { openFiles, setOpenFiles, activeFilePath, setActiveFilePath } = fileState;
    const editorViewRef = useRef<EditorView | null>(null);
    const pendingFiles = useRef<Set<string>>(new Set());

    const handleFileSelect = useCallback(async (path: string, name: string, line?: number) => {
        const normalizedPath = pathUtils.toForwardSlashes(path);
        
        if (line) {
            (window as any).__pendingLineJump = { path: normalizedPath, line, ts: Date.now() };
        }

        const existing = openFiles.find(f => f.path === normalizedPath);
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
                } catch (e) { logger.warn("Manual jump failed", e); }
            }
            setActiveFilePath(existing.id);
            return;
        }

        if (pendingFiles.current.has(normalizedPath)) return;
        pendingFiles.current.add(normalizedPath);

        try {
            const res = await fsReadFile(normalizedPath);
            const content = normalizeContent(res.content);
            const newFile: FileData = { 
                id: normalizedPath, 
                uid: generateUid(),
                name, 
                path: normalizedPath, 
                content, 
                originalContent: content, 
                isDirty: false,
                encoding: res.encoding 
            };

            setOpenFiles(prev => {
                if (prev.some(f => f.path === normalizedPath)) return prev;
                return [...prev, newFile];
            });
            setActiveFilePath(normalizedPath);
        } catch (e) { 
            console.error(e); 
            toast.error(`Failed to open file: ${name}`);
        } finally {
            pendingFiles.current.delete(normalizedPath);
        }
    }, [openFiles, activeFilePath, setOpenFiles, setActiveFilePath]);

    const handleEditorChange = useCallback((content: string) => {
        setOpenFiles(prev => {
            const idx = prev.findIndex(f => f.id === activeFilePath);
            if (idx === -1) return prev;
            const file = prev[idx];
            const normalizedNew = normalizeContent(content);
            const isDirty = normalizedNew !== file.originalContent;
            if (file.content === content && file.isDirty === isDirty) return prev;
            const next = [...prev];
            next[idx] = { ...file, content, isDirty }; 
            return next;
        });
    }, [activeFilePath, setOpenFiles]);

    const doSave = useCallback(async (file: FileData | null, force: boolean = false) => {
        const target = file || openFiles.find(f => f.id === activeFilePath);
        if (!target) return false;

        const currentText = editorViewRef.current?.state.doc.toString() || target.content;
        const normalizedCurrent = normalizeContent(currentText);

        if (!force && normalizedCurrent === target.originalContent) return true;

        let targetPath = target.path;
        try {
            if (force || !targetPath) {
                const selected = await save({ defaultPath: targetPath || target.name });
                if (!selected) return false;
                targetPath = selected;
            }
            if (!targetPath) return false;

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
    }, [activeFilePath, openFiles, setOpenFiles, setActiveFilePath]);

    const closeFile = useCallback((id: string) => {
        setOpenFiles(prev => prev.filter(f => f.id !== id));
    }, [setOpenFiles]);

    const handleNewFile = useCallback(() => {
        const tempId = `untitled-${Date.now()}`;
        const name = `Untitled-${openFiles.filter(f => !f.path).length + 1}`;
        const newFile: FileData = { 
            id: tempId, 
            uid: generateUid(), 
            name, 
            path: null, 
            content: '', 
            originalContent: '', 
            isDirty: false 
        };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(tempId);
    }, [openFiles, setOpenFiles, setActiveFilePath]);

    return { 
        editorViewRef, 
        handleFileSelect, 
        handleEditorChange, 
        doSave, 
        closeFile, 
        handleNewFile 
    };
}
