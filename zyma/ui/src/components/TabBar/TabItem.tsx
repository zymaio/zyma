import React from 'react';
import { X } from 'lucide-react';

export interface TabItemProps {
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
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '10px', fontWeight: active ? 600 : 400 }}>
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

export default TabItem;
