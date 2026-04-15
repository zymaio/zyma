import { useState } from 'react';

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

export const generateUid = () => Math.random().toString(36).substring(2, 11);
export const normalizeContent = (str: string) => (str || '').replace(/\r\n/g, '\n');

export function useFileState() {
    const [openFiles, setOpenFiles] = useState<FileData[]>([]);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);

    return {
        openFiles,
        setOpenFiles,
        activeFilePath,
        setActiveFilePath
    };
}

export type UseFileStateReturn = ReturnType<typeof useFileState>;
