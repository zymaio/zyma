import React, { useState, memo, useEffect } from 'react';
import { File, Folder, ChevronRight, ChevronDown, FileCode, FileJson, FileType, FileText, Image as ImageIcon } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { InlineInput } from '../InlineInput';

export interface FileItemData {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileItemData[];
}

interface FileTreeItemProps {
  item: FileItemData;
  onFileSelect: (path: string, name: string, line?: number) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItemData) => void;
  activeFilePath: string | null;
  level?: number;
  editing: any;
  onInlineSubmit: (val: string) => void;
  setEditing: (val: any) => void;
}

const FileTreeItemComponent: React.FC<FileTreeItemProps> = ({ 
    item, onFileSelect, onContextMenu, activeFilePath, level = 0,
    editing, onInlineSubmit, setEditing
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const isActive = activeFilePath === item.path;
  const isRenaming = editing?.type === 'rename' && editing?.oldPath === item.path;
  const isAddingUnderMe = editing?.type !== 'rename' && editing?.parentPath === item.path;

  // 真正的懒加载：只在展开时请求子目录
  const handleExpand = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && item.is_dir && children.length === 0 && !isLoading) {
        setIsLoading(true);
        try {
            const items = await invoke<FileItemData[]>('read_dir', { path: item.path });
            setChildren(items);
        } catch (error) {
            console.error('Failed to load directory:', item.path, error);
        } finally {
            setIsLoading(false);
        }
    }
  };

  const handleExpandClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleExpand();
  };

  const handleSelect = () => {
      if (item.is_dir) {
          handleExpand();
      } else {
          onFileSelect(item.path, item.name);
      }
  };
  useEffect(() => {
    if (!item.is_dir || !isOpen) return;
    
    let unlisten: (() => void) | null = null;
    const setupListener = async () => {
      unlisten = await listen('fs_event', (event: any) => {
        const payload = event.payload;
        if ((payload.kind === 'Create' || payload.kind === 'Remove') && payload.paths) {
          // 检查是否有文件在当前目录下被创建或删除
          const hasRelevantChange = payload.paths.some((path: string) => {
            const parentDir = path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
            return parentDir === item.path;
          });
          
          if (hasRelevantChange) {
            invoke<FileItemData[]>('read_dir', { path: item.path })
              .then(items => setChildren(items))
              .catch(error => console.error('Failed to refresh directory:', error));
          }
        }
      });
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, [item.is_dir, item.path, isOpen]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.is_dir) {
      if (!isOpen && children.length === 0) {
        setIsLoading(true);
        try {
          const items = await invoke<FileItemData[]>('read_dir', { path: item.path });
          setChildren(items);
        } catch (error) {} finally { setIsLoading(false); }
      }
      setIsOpen(!isOpen);
    } else {
      onFileSelect(item.path, item.name);
    }
  };

  const getFileIcon = () => {
      const ext = item.name.split('.').pop()?.toLowerCase() || '';
      switch(ext) {
          case 'rs': return <FileCode size={14} color="var(--syn-keyword)" />;
          case 'js':
          case 'jsx': return <FileCode size={14} color="var(--syn-function)" />;
          case 'ts':
          case 'tsx': return <FileCode size={14} color="var(--syn-type)" />;
          case 'json':
          case 'toml': return <FileJson size={14} color="var(--syn-string)" />;
          case 'md': return <FileText size={14} color="var(--syn-md-heading)" />;
          case 'css':
          case 'scss': return <FileType size={14} color="var(--syn-builtin)" />;
          case 'html': return <FileType size={14} color="var(--syn-tag)" />;
          case 'svg':
          case 'png':
          case 'jpg': return <ImageIcon size={14} color="var(--syn-number)" />;
          default: return <File size={14} color="var(--text-muted)" />;
      }
  };

  const itemStyle: React.CSSProperties = {
      display: 'flex', 
      alignItems: 'center', 
      padding: '3px 5px', 
      paddingLeft: `${10 + level * 10}px`, 
      cursor: 'pointer', 
      fontSize: 'var(--ui-font-size)', 
      color: isActive ? 'var(--active-text)' : (item.name.startsWith('.') ? 'var(--text-secondary)' : 'var(--text-primary)'), 
      backgroundColor: isActive ? 'var(--active-bg)' : 'transparent',
      justifyContent: 'space-between'
  };

  if (isRenaming) {
      return <InlineInput initialValue={item.name} type="rename" level={level} onSubmit={onInlineSubmit} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="sidebar-item-container">
      <div style={itemStyle} className="file-item-hover" onClick={handleSelect} onContextMenu={(e) => onContextMenu(e, item)}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
            <span style={{ marginRight: '5px', opacity: 0.8, display: 'flex', alignItems: 'center', cursor: item.is_dir ? 'pointer' : 'default' }} onClick={item.is_dir ? handleExpandClick : undefined}>
                {item.is_dir && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                {!item.is_dir && <span style={{ width: '14px' }}></span>}
            </span>
            <span style={{ marginRight: '5px', opacity: 0.8 }}>
                {item.is_dir ? <Folder size={14} fill={isOpen ? 'var(--accent-color)' : 'none'} color={isOpen ? 'var(--accent-color)' : 'var(--text-secondary)'} /> : getFileIcon()}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isActive ? 600 : 400 }}>{item.name}</span>
        </div>
      </div>
      {item.is_dir && isOpen && (
        <div>
          {isLoading && <div style={{ paddingLeft: `${20 + level * 10}px`, fontSize: 'calc(var(--ui-font-size) - 2px)', color: 'var(--text-muted)' }}>{t('Loading')}...</div>}
          
          {/* 在展开的目录下显示新建项输入框 */}
          {isAddingUnderMe && (
              <InlineInput initialValue="" type={editing.type} level={level + 1} onSubmit={onInlineSubmit} onCancel={() => setEditing(null)} />
          )}

          {children.map((child) => (
            <FileTreeItem 
                key={child.path} 
                item={child} 
                onFileSelect={onFileSelect} 
                onContextMenu={onContextMenu} 
                activeFilePath={activeFilePath} 
                level={level + 1}
                editing={editing}
                onInlineSubmit={onInlineSubmit}
                setEditing={setEditing}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTreeItem = memo(FileTreeItemComponent, (prev, next) => {
    const wasActive = prev.activeFilePath === prev.item.path;
    const nowActive = next.activeFilePath === next.item.path;
    return prev.item.path === next.item.path && 
           wasActive === nowActive && 
           prev.editing === next.editing &&
           prev.onFileSelect === next.onFileSelect;
});

export default FileTreeItem;
