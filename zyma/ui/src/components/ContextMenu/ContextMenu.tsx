import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface MenuItem {
    label: string;
    action: () => void;
    icon?: React.ReactNode;
    shortcut?: string;
    separator?: boolean;
    danger?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const style: React.CSSProperties = {
        top: y,
        left: x,
    };
    
    if (y + (items.length * 30) > window.innerHeight) {
        style.top = y - (items.length * 30);
    }

    return (
        <div className="context-menu" style={style} ref={menuRef}>
            {items.map((item, index) => (
                item.separator ? (
                    <div key={index} className="context-menu-separator" />
                ) : (
                    <div 
                        key={index} 
                        className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
                        onClick={() => {
                            if (item.disabled) return;
                            item.action();
                            onClose();
                        }}
                    >
                        <span className="context-menu-label">{item.label}</span>
                        {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
                    </div>
                )
            ))}
        </div>
    );
};

export default ContextMenu;
