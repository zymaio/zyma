import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '../ContextMenu/ContextMenu';
import type { FileItemData } from './components/FileTreeItem';

export interface EditingState {
    parentPath: string;
    type: 'file' | 'dir' | 'rename';
    oldPath?: string;
    oldName?: string;
}

interface UseFileContextMenuProps {
    rootPath: string;
    projectName: string;
    onEdit: (editing: EditingState | null) => void;
    onSetRootOpen: (open: boolean) => void;
    handleDelete: (path: string, name: string, reload?: (path: string) => void, rootPath?: string) => Promise<void>;
    pluginMenuItems?: { label: string, commandId: string }[];
}

export function useFileContextMenu({
    rootPath,
    projectName,
    onEdit,
    onSetRootOpen,
    handleDelete,
    pluginMenuItems = []
}: UseFileContextMenuProps) {
    const { t } = useTranslation();
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);

    const getMenuItems = useCallback((path: string, isDir: boolean, name: string): MenuItem[] => {
        const items: MenuItem[] = [];
        const parentPath = isDir 
            ? path 
            : path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
            
        items.push(
            { 
                label: t('NewFile'), 
                action: () => { 
                    onEdit({ parentPath, type: 'file' }); 
                    onSetRootOpen(true); 
                } 
            },
            { 
                label: t('NewFolder'), 
                action: () => { 
                    onEdit({ parentPath, type: 'dir' }); 
                    onSetRootOpen(true); 
                } 
            },
            { label: '', action: () => {}, separator: true }
        );
        
        if (path !== rootPath) {
            items.push(
                { 
                    label: t('Rename'), 
                    action: () => onEdit({ parentPath, type: 'rename', oldPath: path, oldName: name }) 
                },
                { 
                    label: t('Delete'), 
                    action: () => handleDelete(path, name), 
                    danger: true 
                }
            );
        }
        
        if (pluginMenuItems.length > 0) {
            items.push({ label: '', action: () => {}, separator: true });
            pluginMenuItems.forEach(mi => {
                items.push({
                    label: mi.label,
                    action: () => { 
                        import('../CommandSystem/CommandRegistry').then(m => { 
                            m.commands.executeCommand(mi.commandId, path); 
                        }); 
                    }
                });
            });
        }
        return items;
    }, [rootPath, t, handleDelete, pluginMenuItems, onEdit, onSetRootOpen]);

    const handleContextMenu = useCallback((e: React.MouseEvent, item?: FileItemData) => {
        e.preventDefault(); 
        e.stopPropagation();
        const targetPath = item ? item.path : rootPath;
        const isDir = item ? item.is_dir : true;
        const name = item ? item.name : projectName;
        setContextMenu({ 
            x: e.clientX, 
            y: e.clientY, 
            items: getMenuItems(targetPath, isDir, name) 
        });
    }, [rootPath, projectName, getMenuItems]);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    return { contextMenu, handleContextMenu, closeContextMenu, setContextMenu };
}
