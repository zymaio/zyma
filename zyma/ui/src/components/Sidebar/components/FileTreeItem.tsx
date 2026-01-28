import React, { useState, memo } from 'react';
import { File, Folder, ChevronRight, ChevronDown, FileCode, FileJson, FileType, FileText, Image as ImageIcon } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

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
}

const FileTreeItemComponent: React.FC<FileTreeItemProps> = ({ item, onFileSelect, onContextMenu, activeFilePath, level = 0 }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const isActive = activeFilePath === item.path;

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
          case 'rs': return <FileCode size={14} color="#e06c75" />;
          case 'js':
          case 'jsx': return <FileCode size={14} color="#e5c07b" />;
          case 'ts':
          case 'tsx': return <FileCode size={14} color="#61afef" />;
          case 'json':
          case 'toml': return <FileJson size={14} color="#d19a66" />;
          case 'md': return <FileText size={14} color="#98c379" />;
          case 'css':
          case 'scss': return <FileType size={14} color="#c678dd" />;
          case 'html': return <FileType size={14} color="#e06c75" />;
          case 'svg':
          case 'png':
          case 'jpg': return <ImageIcon size={14} color="#56b6c2" />;
          default: return <File size={14} color="#abb2bf" />;
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

  return (
    <div className="sidebar-item-container">
      <div style={itemStyle} className="file-item-hover" onClick={handleToggle} onContextMenu={(e) => onContextMenu(e, item)}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
            <span style={{ marginRight: '5px', opacity: 0.8, display: 'flex', alignItems: 'center' }}>{item.is_dir && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}{!item.is_dir && <span style={{ width: '14px' }}></span>}</span>
            <span style={{ marginRight: '5px', opacity: 0.8 }}>
                {item.is_dir ? <Folder size={14} fill={isOpen ? 'var(--accent-color)' : 'none'} color={isOpen ? 'var(--accent-color)' : 'var(--text-secondary)'} /> : getFileIcon()}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isActive ? 'bold' : 'normal' }}>{item.name}</span>
        </div>
      </div>
      {item.is_dir && isOpen && (
        <div>
          {isLoading && <div style={{ paddingLeft: `${20 + level * 10}px`, fontSize: 'calc(var(--ui-font-size) - 2px)', color: 'var(--text-muted)' }}>{t('Loading')}...</div>}
          {children.map((child) => (
            <FileTreeItem 
                key={child.path} 
                item={child} 
                onFileSelect={onFileSelect} 
                onContextMenu={onContextMenu} 
                activeFilePath={activeFilePath} 
                level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTreeItem = memo(FileTreeItemComponent, (prev, next) => {
    // 性能核心：判断激活状态是否发生实质性改变
    const wasActive = prev.activeFilePath === prev.item.path;
    const nowActive = next.activeFilePath === next.item.path;
    
    // 如果激活状态没变，且其他关键属性（路径、展开子项等）也没变，则不重绘
    return prev.item.path === next.item.path && 
           wasActive === nowActive && 
           prev.onFileSelect === next.onFileSelect;
});

export default FileTreeItem;