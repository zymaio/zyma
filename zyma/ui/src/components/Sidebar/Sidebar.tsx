import React, { useState, useEffect } from 'react';
import { File, Folder, ChevronRight, ChevronDown, FilePlus, FolderPlus, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';

interface FileItemData {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileItemData[];
}

interface SidebarProps {
  rootPath: string;
  onFileSelect: (path: string, name: string) => void;
  onFileDelete?: (path: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ rootPath, onFileSelect, onFileDelete }) => {
  const { t } = useTranslation();
  const [rootFiles, setRootFiles] = useState<FileItemData[]>([]);
  const [projectName, setProjectName] = useState<string>("Project");
  const [isRootOpen, setIsRootOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRoot(rootPath);
  }, [rootPath]);

  const loadRoot = async (path: string) => {
    setIsLoading(true);
    const name = path.split(/[\\/]/).filter(Boolean).pop() || path;
    setProjectName(name);

    try {
      const items = await invoke<FileItemData[]>('read_dir', { path });
      setRootFiles(items);
    } catch (error) {
      console.error('Failed to load directory:', error);
      setRootFiles([]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreate = async (type: 'file' | 'dir') => {
      const name = prompt(t('EnterName', { type }));
      if (!name) return;

      const path = `${rootPath}/${name}`;
      try {
          if (type === 'file') {
              await invoke('create_file', { path });
          } else {
              await invoke('create_dir', { path });
          }
          loadRoot(rootPath);
      } catch (e) {
          alert(e);
      }
  };

  const handleDelete = async (path: string, name: string) => {
      const confirmed = await ask(t('ConfirmDelete', { name }), {
          title: t('File'),
          kind: 'warning',
      });

      if (confirmed) {
          try {
              await invoke('remove_item', { path });
              if (onFileDelete) onFileDelete(path);
              loadRoot(rootPath);
          } catch (e) {
              alert(e);
          }
      }
  };

  return (
    <div style={{
      width: '250px', height: '100%', backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)',
      display: 'flex', flexDirection: 'column', userSelect: 'none'
    }}>
      <div style={{
        padding: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
        color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>{t('Explorer')}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
            <FilePlus size={14} className="icon-btn" onClick={() => handleCreate('file')} />
            <FolderPlus size={14} className="icon-btn" onClick={() => handleCreate('dir')} />
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div 
            style={{ display: 'flex', alignItems: 'center', padding: '3px 5px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}
            className="file-item-hover"
            onClick={() => setIsRootOpen(!isRootOpen)}
        >
             <span style={{ marginRight: '5px', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                {isRootOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <span style={{ marginRight: '5px', opacity: 0.8, textTransform: 'uppercase' }}>{projectName}</span>
        </div>

        {isRootOpen && (
            <div>
                 {isLoading && <div style={{ paddingLeft: '20px', fontSize: '11px', color: '#666' }}>{t('Loading')}...</div>}
                 {rootFiles.map((file) => (
                    <FileTreeItem key={file.path} item={file} onFileSelect={onFileSelect} onDelete={handleDelete} level={1} />
                 ))}
            </div>
        )}
      </div>
    </div>
  );
};

interface FileTreeItemProps {
  item: FileItemData;
  onFileSelect: (path: string, name: string) => void;
  onDelete: (path: string, name: string) => void;
  level?: number;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ item, onFileSelect, onDelete, level = 0 }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.is_dir) {
      if (!isOpen && children.length === 0) {
        setIsLoading(true);
        try {
          const items = await invoke<FileItemData[]>('read_dir', { path: item.path });
          setChildren(items);
        } catch (error) {
          console.error('Failed to load sub-directory:', error);
        } finally {
            setIsLoading(false);
        }
      }
      setIsOpen(!isOpen);
    } else {
      onFileSelect(item.path, item.name);
    }
  };

  const handleAction = (e: React.MouseEvent, type: string) => {
      e.stopPropagation();
      if (type === 'delete') {
          onDelete(item.path, item.name);
      }
  };

  return (
    <div className="sidebar-item-container">
      <div 
        style={{ display: 'flex', alignItems: 'center', padding: '3px 5px', paddingLeft: `${10 + level * 10}px`, cursor: 'pointer', fontSize: '13px', color: item.name.startsWith('.') ? 'var(--text-secondary)' : 'var(--text-primary)', justifyContent: 'space-between' }}
        className="file-item-hover"
        onClick={handleToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
            <span style={{ marginRight: '5px', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                {item.is_dir && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                {!item.is_dir && <span style={{ width: '14px' }}></span>}
            </span>
            <span style={{ marginRight: '5px', opacity: 0.8 }}>
                {item.is_dir ? <Folder size={14} fill={isOpen ? '#e8c97e' : 'none'} color={isOpen ? '#e8c97e' : '#cccccc'} /> : <File size={14} color="#61dafb" />}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
        </div>
        <div className="item-actions" style={{ paddingRight: '5px' }}>
            <Trash2 size={12} className="action-icon" onClick={(e) => handleAction(e, 'delete')} />
        </div>
      </div>
      {item.is_dir && isOpen && (
        <div>
          {isLoading && <div style={{ paddingLeft: `${20 + level * 10}px`, fontSize: '11px', color: '#666' }}>{t('Loading')}...</div>}
          {children.map((child) => (
            <FileTreeItem key={child.path} item={child} onFileSelect={onFileSelect} onDelete={onDelete} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;