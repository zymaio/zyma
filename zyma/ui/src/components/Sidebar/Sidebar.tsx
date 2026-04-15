import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContextMenu from '../ContextMenu/ContextMenu';
import FileTreeItem from './components/FileTreeItem';
import { pathUtils } from '../../utils/pathUtils';
import { useWorkbench } from '../../core/WorkbenchContext';
import { InlineInput } from './InlineInput';
import { useFileTree } from './useFileTree';
import { useFileContextMenu } from './useFileContextMenu';
import type { EditingState } from './useFileContextMenu';

interface SidebarProps {
  pluginMenuItems?: { label: string, commandId: string }[];
}

const Sidebar: React.FC<SidebarProps> = ({ pluginMenuItems = [] }) => {
  const { t } = useTranslation();
  const { rootPath, fm } = useWorkbench();
  const { handleFileSelect, activeFilePath, handleCreate, handleRename, handleDelete } = fm;
  const [isRootOpen, setIsRootOpen] = useState(true);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const { rootFiles, isLoading, loadRoot } = useFileTree(rootPath);

  const projectName = useMemo(() => {
      return pathUtils.getFileName(rootPath) || "Project";
  }, [rootPath]);

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

  const { contextMenu, handleContextMenu, closeContextMenu } = useFileContextMenu({
      rootPath,
      projectName,
      onEdit: setEditing,
      onSetRootOpen: setIsRootOpen,
      handleDelete,
      pluginMenuItems
  });

  // 点击外部关闭右键菜单
  useEffect(() => {
      const handleClick = () => closeContextMenu();
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, [closeContextMenu]);

  return (
    <div 
        style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: 'var(--bg-sidebar)', 
            borderRight: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', 
            display: 'flex', 
            flexDirection: 'column', 
            userSelect: 'none' 
        }} 
        onContextMenu={(e) => handleContextMenu(e)}
    >
      <div style={{ 
          padding: '10px', 
          fontSize: 'calc(var(--ui-font-size) - 2px)', 
          fontWeight: 600, 
          color: 'var(--text-secondary)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px' 
      }}>
          <span>{t('Workspace')}</span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div 
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '3px 5px', 
                cursor: 'pointer', 
                fontSize: 'var(--ui-font-size)', 
                fontWeight: 600, 
                color: 'var(--text-primary)' 
            }} 
            className="file-item-hover" 
            onClick={() => setIsRootOpen(!isRootOpen)} 
            onContextMenu={(e) => handleContextMenu(e)}
        >
             <span style={{ marginRight: '5px', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                 {isRootOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
             </span>
            <span style={{ marginRight: '5px', opacity: 0.8 }}>{projectName}</span>
        </div>
        
        {isRootOpen && (
            <div>
                {isLoading && (
                    <div style={{ 
                        paddingLeft: '20px', 
                        fontSize: 'calc(var(--ui-font-size) - 2px)', 
                        color: 'var(--loading-text)' 
                    }}>
                        {t('Loading')}...
                    </div>
                )}
                
                {editing && editing.parentPath === rootPath && editing.type !== 'rename' && (
                    <InlineInput 
                        initialValue="" 
                        type={editing.type} 
                        level={1} 
                        onSubmit={onInlineSubmit} 
                        onCancel={() => setEditing(null)} 
                    />
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
      
      {contextMenu && (
          <ContextMenu 
              x={contextMenu.x} 
              y={contextMenu.y} 
              items={contextMenu.items} 
              onClose={closeContextMenu} 
          />
      )}
    </div>
  );
};

export default Sidebar;
