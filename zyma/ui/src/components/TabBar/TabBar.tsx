import React from 'react';
import { X } from 'lucide-react';

interface TabData {
    path: string;
    name: string;
    isDirty: boolean;
}

interface TabBarProps {
    files: TabData[];
    activePath: string | null;
    onSwitch: (path: string) => void;
    onClose: (path: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ files, activePath, onSwitch, onClose }) => {
  return (
    <div style={{
      height: '35px',
      backgroundColor: 'var(--bg-tab)',
      display: 'flex',
      overflowX: 'auto',
      borderBottom: '1px solid var(--border-color)',
      scrollbarWidth: 'none' // Firefox
    }} className="no-scrollbar">
      {files.map((file) => (
        <TabItem 
            key={file.path}
            name={file.name} 
            active={activePath === file.path} 
            isDirty={file.isDirty}
            onClick={() => onSwitch(file.path)}
            onClose={() => onClose(file.path)} 
        />
      ))}
      {files.length === 0 && (
          <div style={{ height: '35px' }}></div>
      )}
    </div>
  );
};

interface TabItemProps {
  name: string;
  active: boolean;
  isDirty: boolean;
  onClick: () => void;
  onClose: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ name, active, isDirty, onClick, onClose }) => {
  return (
    <div 
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            minWidth: '120px',
            maxWidth: '220px',
            backgroundColor: active ? 'var(--bg-tab-active)' : 'transparent',
            borderRight: '1px solid var(--border-color)',
            borderTop: active ? '1px solid var(--accent-color)' : '1px solid transparent',
            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            userSelect: 'none',
            position: 'relative'
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