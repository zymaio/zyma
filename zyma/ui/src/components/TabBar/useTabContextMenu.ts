import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '../ContextMenu/ContextMenu';
import { pathUtils } from '../../utils/pathUtils';

interface TabData {
    path: string;
    name: string;
    isDirty: boolean;
    type?: 'file' | 'view';
}

export const useTabContextMenu = (files: TabData[], onClose: (path: string) => void) => {
    const { t } = useTranslation();
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string } | null>(null);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, path });
    };

    const getMenuItems = (targetPath: string): MenuItem[] => {
        const index = files.findIndex(f => pathUtils.isEqual(f.path, targetPath));
        const isLeftmost = index === 0;
        const isRightmost = index === files.length - 1;
        const hasOnlyOne = files.length === 1;

        return [
            { label: t('Close'), action: () => onClose(targetPath) },
            {
                label: t('CloseOthers'),
                action: () => {
                    files.forEach(f => { if (!pathUtils.isEqual(f.path, targetPath)) onClose(f.path); });
                },
                disabled: hasOnlyOne
            },
            { 
                label: t('CloseToLeft'), 
                action: () => {
                    files.slice(0, index).forEach(f => onClose(f.path));
                },
                disabled: isLeftmost
            },
            { 
                label: t('CloseToRight'), 
                action: () => {
                    files.slice(index + 1).forEach(f => onClose(f.path));
                },
                disabled: isRightmost
            },
            { label: '', action: () => {}, separator: true },
            { 
                label: t('CloseSaved'), 
                action: () => {
                    files.forEach(f => { if (!f.isDirty) onClose(f.path); });
                },
                disabled: !files.some(f => !f.isDirty)
            },
            { label: t('CloseAll'), action: () => {
                files.forEach(f => onClose(f.path));
            }}
        ];
    };

    return {
        contextMenu,
        setContextMenu,
        handleContextMenu,
        getMenuItems
    };
};
