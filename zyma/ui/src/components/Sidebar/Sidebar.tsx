import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import ContextMenu from '../ContextMenu/ContextMenu';
import type { MenuItem } from '../ContextMenu/ContextMenu';
import FileTreeItem from './components/FileTreeItem';
import type { FileItemData } from './components/FileTreeItem';

interface SidebarProps {
  rootPath: string;
  onFileSelect: (path: string, name: string, line?: number) => void;
  onFileDelete?: (path: string) => void;
  activeFilePath: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ rootPath, onFileSelect, onFileDelete, activeFilePath }) => {
  const { t } = useTranslation();
  const [rootFiles, setRootFiles] = useState<FileItemData[]>([]);
  const [projectName, setProjectName] = useState<string>("Project");
  const [isRootOpen, setIsRootOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
        setIsLoading(true);
        const name = rootPath.split(/[\\/]/).filter(Boolean).pop() || rootPath;
        setProjectName(name);
        try {
          const items = await invoke<FileItemData[]>('read_dir', { path: rootPath });
          if (isMounted) setRootFiles(items);
        } catch (error) {
          if (isMounted) setRootFiles([]);
        } finally {
            if (isMounted) setIsLoading(false);
        }
    };
    load();
    return () => { isMounted = false; };
  }, [rootPath]);

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  const loadRoot = async (path: string) => {
    setIsLoading(true);
    try {
      const items = await invoke<FileItemData[]>('read_dir', { path });
      setRootFiles(items);
    } catch (error) {} finally {
        setIsLoading(false);
    }
  };

  const handleCreate = async (targetPath: string, type: 'file' | 'dir') => {
      const name = prompt(t('EnterName', { type }));
      if (!name) return;
      const path = `${targetPath}/${name}`;
      try {
          if (type === 'file') await invoke('create_file', { path });
          else await invoke('create_dir', { path });
          loadRoot(rootPath);
      } catch (e) { alert(e); }
  };

  const handleRename = async (oldPath: string, oldName: string) => {
      const newName = prompt(t('EnterName', { type: 'New' }), oldName);
      if (!newName || newName === oldName) return;
      const lastSlashIndex = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'));
      const parentPath = lastSlashIndex > -1 ? oldPath.substring(0, lastSlashIndex) : '.';
      const separator = lastSlashIndex > -1 ? oldPath[lastSlashIndex] : '/';
      const newPath = parentPath === '.' ? newName : `${parentPath}${separator}${newName}`;
      try {
          await invoke('rename_item', { at: oldPath, to: newPath });
          loadRoot(rootPath);
      } catch (e) { alert(e); }
  };

  const handleDelete = async (path: string, name: string) => {
      const confirmed = await ask(t('ConfirmDelete', { name }), { title: t('File'), kind: 'warning' });
      if (confirmed) {
          try {
              await invoke('remove_item', { path });
              if (onFileDelete) onFileDelete(path);
              loadRoot(rootPath);
          } catch (e) { alert(e); }
      }
  };

  const getMenuItems = (path: string, isDir: boolean, name: string): MenuItem[] => {
      const items: MenuItem[] = [];
      const parentPath = isDir ? path : path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
      items.push(
          { label: t('NewFile'), action: () => handleCreate(parentPath, 'file') },
          { label: t('NewFolder'), action: () => handleCreate(parentPath, 'dir') },
          { label: '', action: () => {}, separator: true }
      );
      if (path !== rootPath) {
          items.push(
              { label: t('Rename'), action: () => handleRename(path, name) },
              { label: t('Delete'), action: () => handleDelete(path, name), danger: true }
          );
      }
      return items;
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, item?: FileItemData) => {
      e.preventDefault(); e.stopPropagation();
      const targetPath = item ? item.path : rootPath;
      const isDir = item ? item.is_dir : true;
      const name = item ? item.name : projectName;
      setContextMenu({ x: e.clientX, y: e.clientY, items: getMenuItems(targetPath, isDir, name) });
  }, [rootPath, projectName, t]);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', userSelect: 'none' }} onContextMenu={(e) => handleContextMenu(e)}>
      <div style={{ padding: '10px', fontSize: 'calc(var(--ui-font-size) - 2px)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{t('Explorer')}</span></div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '3px 5px', cursor: 'pointer', fontSize: 'var(--ui-font-size)', fontWeight: 'bold', color: 'var(--text-primary)' }} className="file-item-hover" onClick={() => setIsRootOpen(!isRootOpen)} onContextMenu={(e) => handleContextMenu(e)}>
             <span style={{ marginRight: '5px', opacity: 0.8, display: 'flex', alignItems: 'center' }}>{isRootOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            <span style={{ marginRight: '5px', opacity: 0.8, textTransform: 'uppercase' }}>{projectName}</span>
        </div>
        {isRootOpen && (<div>{isLoading && <div style={{ paddingLeft: '20px', fontSize: 'calc(var(--ui-font-size) - 2px)', color: '#666' }}>{t('Loading')}...</div>}{rootFiles.map((file) => (<FileTreeItem key={file.path} item={file} onFileSelect={onFileSelect} onContextMenu={handleContextMenu} activeFilePath={activeFilePath} level={1} />))}</div>)}
      </div>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

export default Sidebar;