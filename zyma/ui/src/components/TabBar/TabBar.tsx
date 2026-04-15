import React from 'react';
import ContextMenu from '../ContextMenu/ContextMenu';
import TabItem from './TabItem';
import { useTabContextMenu } from './useTabContextMenu';
import { pathUtils } from '../../utils/pathUtils';

interface TabData {
    path: string;
    name: string;
    isDirty: boolean;
    type?: 'file' | 'view';
}

interface TabBarProps {
    files: TabData[];
    activePath: string | null;
    onSwitch: (path: string) => void;
    onClose: (path: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ files, activePath, onSwitch, onClose }) => {
  const { contextMenu, setContextMenu, handleContextMenu, getMenuItems } = useTabContextMenu(files, onClose);

  // 找到第一个 'view' 类型的 Tab 的索引，用于设置 margin-left: auto
  const firstViewIndex = files.findIndex(f => f.type === 'view');

  return (
    <div style={{
      height: '35px',
      backgroundColor: 'var(--bg-tabs)',
      display: 'flex',
      overflowX: 'auto',
      borderBottom: '1px solid var(--border-color)',
      scrollbarWidth: 'none',
      position: 'relative'
    }} className="no-scrollbar">
      {files.map((file, index) => (
        <TabItem
            key={file.path}
            path={file.path}
            name={file.name}
            type={file.type}
            active={pathUtils.isEqual(activePath, file.path)}
            isDirty={file.isDirty}
            style={index === firstViewIndex ? { marginLeft: 'auto', borderLeft: '1px solid var(--border-color)' } : {}}
            onClick={() => onSwitch(file.path)}
            onClose={() => onClose(file.path)}
            onContextMenu={(e) => handleContextMenu(e, file.path)}
        />
      ))}
      {files.length === 0 && (
          <div style={{ height: '35px' }}></div>
      )}
      {contextMenu && (
          <ContextMenu 
              x={contextMenu.x} 
              y={contextMenu.y} 
              items={getMenuItems(contextMenu.path)} 
              onClose={() => setContextMenu(null)} 
          />
      )}
    </div>
  );
};

export default TabBar;