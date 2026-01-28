import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ContextMenu from '../ContextMenu/ContextMenu';
import type { MenuItem } from '../ContextMenu/ContextMenu';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string } | null>(null);

  const isMatching = (p1: string | null, p2: string | null) => {
    if (!p1 || !p2) return p1 === p2;
    return p1.replace(/\\/g, '/').toLowerCase() === p2.replace(/\\/g, '/').toLowerCase();
  };

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
      const index = files.findIndex(f => isMatching(f.path, targetPath));
      const isLeftmost = index === 0;
      const isRightmost = index === files.length - 1;
      const hasOnlyOne = files.length === 1;

      return [
          { label: t('Close'), action: () => onClose(targetPath) },
          { 
              label: t('CloseOthers'), 
              action: () => {
                  files.forEach(f => { if (!isMatching(f.path, targetPath)) onClose(f.path); });
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
            active={isMatching(activePath, file.path)} 
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

interface TabItemProps {
  path: string;
  name: string;
  type?: 'file' | 'view';
  active: boolean;
  isDirty: boolean;
  style?: React.CSSProperties;
  onClick: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const TabItem: React.FC<TabItemProps> = ({ name, type, active, isDirty, style, onClick, onClose, onContextMenu }) => {
  const isView = type === 'view';
  
  // 基础颜色逻辑
  let backgroundColor = active ? 'var(--bg-active-tab)' : 'transparent';
  let color = active ? 'var(--text-active)' : 'var(--text-muted)';
  let borderTopColor = active ? 'var(--tab-active-border)' : 'transparent';

  // 针对 View (Chat 等) 的特殊样式
  if (isView) {
      if (active) {
          backgroundColor = 'var(--active-bg)'; 
          borderTopColor = 'var(--status-success)'; 
      } else {
          backgroundColor = 'var(--bg-tabs)'; 
      }
  }

  return (
    <div 
        onClick={onClick}
        onContextMenu={onContextMenu}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            minWidth: isView ? '100px' : '120px',
            maxWidth: '220px',
            backgroundColor,
            borderRight: '1px solid var(--border-color)',
            borderTop: `1px solid ${borderTopColor}`,
            color,
            cursor: 'pointer',
            fontSize: 'var(--ui-font-size)',
            userSelect: 'none',
            position: 'relative',
            transition: 'background-color 0.2s',
            ...style
        }}
    >
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '10px' }}>
        {name} {isDirty && <span style={{ color: 'var(--accent-color)', fontSize: '16px' }}>•</span>}
      </span>
      <span 
        style={{ 
            opacity: active ? 1 : 0.5, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center',
            padding: '2px',
            borderRadius: '3px'
        }} 
        className="tab-close-btn"
        onClick={(e) => {
            e.stopPropagation();
            onClose();
        }}
      >
        <X size={14} />
      </span>
    </div>
  );
};

export default TabBar;
