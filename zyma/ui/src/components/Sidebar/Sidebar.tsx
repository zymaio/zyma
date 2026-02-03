import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import ContextMenu from '../ContextMenu/ContextMenu';
import type { MenuItem } from '../ContextMenu/ContextMenu';
import FileTreeItem from './components/FileTreeItem';
import type { FileItemData } from './components/FileTreeItem';

import { pathUtils } from '../../utils/pathUtils';
import { useWorkbench } from '../../core/WorkbenchContext';

interface SidebarProps {
  pluginMenuItems?: { label: string, commandId: string }[];
}

export const InlineInput: React.FC<{ 
    initialValue: string, 
    type: 'file' | 'dir' | 'rename',
    level: number,
    onSubmit: (val: string) => void, 
    onCancel: () => void 
}> = ({ initialValue, type, level, onSubmit, onCancel }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [val, setVal] = useState(initialValue);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            if (type === 'rename') {
                const lastDot = initialValue.lastIndexOf('.');
                inputRef.current.setSelectionRange(0, lastDot > 0 ? lastDot : initialValue.length);
            }
        }
    }, []);

    return (
        <div style={{ 
            display: 'flex', alignItems: 'center', padding: '3px 5px', gap: '5px', 
            paddingLeft: `${10 + level * 10}px`,
            backgroundColor: 'var(--bg-side)'
        }}>
            <span style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                {type === 'dir' ? <Folder size={14} /> : <File size={14} />}
            </span>
            <input 
                ref={inputRef} 
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') onSubmit(val);
                    if (e.key === 'Escape') onCancel();
                }}
                onBlur={() => onSubmit(val)}
                style={{ 
                    flex: 1, minWidth: 0, border: '1px solid var(--accent-color)', 
                    backgroundColor: 'var(--bg-editor)', color: 'var(--text-primary)', 
                    fontSize: 'var(--ui-font-size)', outline: 'none', padding: '1px 4px',
                    borderRadius: '2px'
                }}
            />
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ pluginMenuItems = [] }) => {
  const { t } = useTranslation();
  const { rootPath, fm } = useWorkbench();
  const { handleFileSelect, activeFilePath, handleCreate, handleRename, handleDelete } = fm;
  const [rootFiles, setRootFiles] = useState<FileItemData[]>([]);
  const [isRootOpen, setIsRootOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);

  const projectName = useMemo(() => {
      return pathUtils.getFileName(rootPath) || "Project";
  }, [rootPath]);

  const [editing, setEditing] = useState<{ 
      parentPath: string, 
      type: 'file' | 'dir' | 'rename', 
      oldPath?: string, 
      oldName?: string 
  } | null>(null);

  const loadRoot = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const items = await invoke<FileItemData[]>('read_dir', { path });
      setRootFiles(items);
    } catch (error) {} finally { setIsLoading(false); }
  }, []);

  const onInlineSubmit = async (name: string) => {
      const currentEditing = editing;
      setEditing(null);
      if (!currentEditing || !name || (currentEditing.type === 'rename' && name === currentEditing.oldName)) return;
      
      if (currentEditing.type === 'rename') {
          await handleRename(currentEditing.oldPath!, currentEditing.oldName!, loadRoot, rootPath, name);
      } else {
          await handleCreate(currentEditing.parentPath, currentEditing.type as any, loadRoot, rootPath, name);
      }
  };

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setupListener = async () => {
      unlisten = await listen('fs_event', (event: any) => {
        const payload = event.payload;
        if (payload.kind === 'Create' || payload.kind === 'Remove') {
          loadRoot(rootPath);
        }
      });
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, [rootPath, loadRoot]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
        setIsLoading(true);
        try {
          const items = await invoke<FileItemData[]>('read_dir', { path: rootPath });
          if (isMounted) setRootFiles(items);
        } catch (error) { if (isMounted) setRootFiles([]); } finally { if (isMounted) setIsLoading(false); }
    };
    load();
    return () => { isMounted = false; };
  }, [rootPath]);

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  const getMenuItems = (path: string, isDir: boolean, name: string): MenuItem[] => {
      const items: MenuItem[] = [];
      const parentPath = isDir ? path : path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
      items.push(
          { label: t('NewFile'), action: () => { setEditing({ parentPath, type: 'file' }); setIsRootOpen(true); } },
          { label: t('NewFolder'), action: () => { setEditing({ parentPath, type: 'dir' }); setIsRootOpen(true); } },
          { label: '', action: () => {}, separator: true }
      );
      if (path !== rootPath) {
          items.push(
              { label: t('Rename'), action: () => setEditing({ parentPath, type: 'rename', oldPath: path, oldName: name }) },
              { label: t('Delete'), action: () => handleDelete(path, name, loadRoot, rootPath), danger: true }
          );
      }
      if (pluginMenuItems.length > 0) {
          items.push({ label: '', action: () => {}, separator: true });
          pluginMenuItems.forEach(mi => {
              items.push({
                  label: mi.label, 
                  action: () => { import('../CommandSystem/CommandRegistry').then(m => { m.commands.executeCommand(mi.commandId, path); }); } 
              });
          });
      }
      return items;
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, item?: FileItemData) => {
      e.preventDefault(); e.stopPropagation();
      const targetPath = item ? item.path : rootPath;
      const isDir = item ? item.is_dir : true;
      const name = item ? item.name : projectName;
      setContextMenu({ x: e.clientX, y: e.clientY, items: getMenuItems(targetPath, isDir, name) });
  }, [rootPath, projectName, t, handleDelete]);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', userSelect: 'none' }} onContextMenu={(e) => handleContextMenu(e)}>
      <div style={{ padding: '10px', fontSize: 'calc(var(--ui-font-size) - 2px)', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}><span>{t('Workspace')}</span></div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '3px 5px', cursor: 'pointer', fontSize: 'var(--ui-font-size)', fontWeight: 600, color: 'var(--text-primary)' }} className="file-item-hover" onClick={() => setIsRootOpen(!isRootOpen)} onContextMenu={(e) => handleContextMenu(e)}>
             <span style={{ marginRight: '5px', opacity: 0.8, display: 'flex', alignItems: 'center' }}>{isRootOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            <span style={{ marginRight: '5px', opacity: 0.8 }}>{projectName}</span>
        </div>
        {isRootOpen && (
            <div>
                {isLoading && <div style={{ paddingLeft: '20px', fontSize: 'calc(var(--ui-font-size) - 2px)', color: 'var(--loading-text)' }}>{t('Loading')}...</div>}
                {editing && editing.parentPath === rootPath && editing.type !== 'rename' && (
                    <InlineInput initialValue="" type={editing.type} level={1} onSubmit={onInlineSubmit} onCancel={() => setEditing(null)} />
                )}
                {rootFiles.map((file) => (
                    <FileTreeItem 
                        key={file.path} 
                        item={file} 
                        onFileSelect={handleFileSelect} 
                        onContextMenu={handleContextMenu} 
                        activeFilePath={activeFilePath} 
                        level={1}
                        editing={editing}
                        onInlineSubmit={onInlineSubmit}
                        setEditing={setEditing}
                    />
                ))}
            </div>
        )}
      </div>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

export default Sidebar;