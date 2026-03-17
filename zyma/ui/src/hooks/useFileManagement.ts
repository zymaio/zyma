import { useMemo } from 'react';
import type { EditorView } from '@codemirror/view';
import { useFileState } from './useFileState';
import type { FileData } from './useFileState';
import { useFileSystem } from './useFileSystem';
import { useFileActions } from './useFileActions';

export type { FileData };

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
    const fileState = useFileState();
    const fileSystem = useFileSystem(fileState);
    const fileActions = useFileActions(fileState);

    return useMemo(() => ({
        ...fileState,
        ...fileSystem,
        ...fileActions,
        handleEditorChange: fileActions.handleEditorChange
    }), [fileState, fileSystem, fileActions]);
}
