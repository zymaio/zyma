import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, X as CloseIcon, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';

interface MenuItem {
    label: string;
    action?: string;
    shortcut?: string;
    type?: 'separator' | 'item';
}

interface MenuGroup {
    label: string;
    items: MenuItem[];
}

interface TitleBarProps {
    onAction: (action: string) => void;
    themeMode: 'dark' | 'light';
    isAdmin?: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ onAction, themeMode, isAdmin }) => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_DATA: MenuGroup[] = [
    {
        label: t('File'),
        items: [
            { label: t('NewFile'), action: 'new_file', shortcut: 'Ctrl+N' },
            { label: t('OpenFolder'), action: 'open_folder' },
            { label: t('Save'), action: 'save', shortcut: 'Ctrl+S' },
            { label: t('SaveAs'), action: 'save_as' },
            { type: 'separator', label: '' },
            { label: t('Exit'), action: 'exit' }
        ]
    },
    {
        label: t('Edit'),
        items: [
            { label: 'Undo', action: 'undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', action: 'redo', shortcut: 'Ctrl+Y' }
        ]
    },
    {
        label: t('View'),
        items: [
            { label: t('SwitchTheme', { mode: themeMode === 'dark' ? 'Light' : 'Dark' }), action: 'toggle_theme' }
        ]
    },
    {
        label: t('Help'),
        items: [
             { label: t('About'), action: 'about' }
        ]
    }
  ];

  useEffect(() => {
    const checkMaximized = async () => {
        try {
            const win = getCurrentWindow();
            const max = await win.isMaximized();
            setIsMaximized(max);
        } catch (e) {
            console.error(e);
        }
    };
    checkMaximized();

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setActiveMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  const handleMenuClick = (menuLabel: string) => {
      setActiveMenu(activeMenu === menuLabel ? null : menuLabel);
  };

  const handleItemClick = (action?: string) => {
      if (action) {
          onAction(action);
          setActiveMenu(null);
      }
  };

  const handleMouseEnter = (menuLabel: string) => {
      if (activeMenu) {
          setActiveMenu(menuLabel);
      }
  };

  return (
    <div 
      data-tauri-drag-region 
      style={{
        height: '30px',
        backgroundColor: 'var(--bg-activity-bar)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontFamily: 'Segoe UI, sans-serif',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1000
      }}
      ref={menuRef}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }} data-tauri-drag-region>
          <div style={{ width: '18px', height: '18px', backgroundColor: '#007acc', borderRadius: '3px' }}></div> 
        </div>

        <div className="titlebar-menu" style={{ display: 'flex', height: '100%' }} data-tauri-drag-region>
            {MENU_DATA.map(menu => (
                <div key={menu.label} style={{ position: 'relative', height: '100%' }}>
                    <div 
                        style={{ 
                            padding: '0 8px', 
                            cursor: 'pointer', 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center',
                            backgroundColor: activeMenu === menu.label ? 'rgba(128,128,128,0.2)' : 'transparent'
                        }} 
                        className="menu-item" 
                        onClick={() => handleMenuClick(menu.label)}
                        onMouseEnter={() => handleMouseEnter(menu.label)}
                    >
                        {menu.label}
                    </div>

                    {activeMenu === menu.label && (
                        <div style={{
                            position: 'absolute', top: '30px', left: 0,
                            backgroundColor: 'var(--bg-dropdown)', border: '1px solid var(--border-color)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', minWidth: '200px', padding: '4px 0', zIndex: 1001
                        }}>
                            {menu.items.map((item, idx) => (
                                item.type === 'separator' ? (
                                    <div key={idx} style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
                                ) : (
                                    <div 
                                        key={idx} className="dropdown-item" onClick={() => handleItemClick(item.action)}
                                        style={{ padding: '6px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && <span style={{ marginLeft: '15px', fontSize: '10px', opacity: 0.6 }}>{item.shortcut}</span>}
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      <div style={{ flex: 1, textAlign: 'center', opacity: 0.6, pointerEvents: 'none' }} data-tauri-drag-region>
        智码 - zyma {isAdmin && `[${t('Administrator')}]`}
      </div>

      <div style={{ display: 'flex', height: '100%' }}>
        <div className="window-control" onClick={handleMinimize}><Minus size={16} /></div>
        <div className="window-control" onClick={handleMaximize}>
          {isMaximized ? <Copy size={14} style={{transform: 'rotate(180deg)'}} /> : <Square size={14} />}
        </div>
        <div className="window-control close" onClick={handleClose}><CloseIcon size={16} /></div>
      </div>
    </div>
  );
};

export default TitleBar;