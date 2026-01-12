import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, X as CloseIcon, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';

interface TitleBarProps {
    onAction: (action: string) => void;
    themeMode: 'dark' | 'light';
    isAdmin?: boolean;
    platform?: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ onAction, themeMode, isAdmin, platform }) => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMac = platform === 'macos' || platform === 'darwin';

  const MENU_DATA = [
    {
        label: t('File'),
        items: [
            { label: t('NewFile'), action: 'new_file', shortcut: 'Ctrl+N' },
            { label: t('OpenFolder'), action: 'open_folder' },
            { label: t('Save'), action: 'save', shortcut: 'Ctrl+S' },
            { label: t('SaveAs'), action: 'save_as' },
            { type: 'separator' },
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
        items: [ { label: t('About'), action: 'about' } ]
    }
  ];

  useEffect(() => {
    const checkMaximized = async () => {
        try {
            const win = getCurrentWindow();
            const max = await win.isMaximized();
            setIsMaximized(max);
        } catch (e) { console.error(e); }
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

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = async () => {
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };
  const handleClose = () => getCurrentWindow().close();

  return (
    <div 
      style={{
        height: '30px',
        backgroundColor: 'var(--bg-activity-bar)',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
        color: 'var(--text-primary)',
        fontSize: '12px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1000,
        flexDirection: isMac ? 'row-reverse' : 'row'
      }}
      ref={menuRef}
    >
      {/* 1. Window Controls (MacOS: Left, Windows: Right) */}
      {!isMac && <div style={{ width: '48px' }} data-tauri-drag-region></div> /* Placeholder for balance */}
      
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', flex: 1 }} data-tauri-drag-region>
        {/* App Icon */}
        <div style={{ padding: '0 10px' }} data-tauri-drag-region>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#007acc', borderRadius: '3px' }}></div>
        </div>

        {/* Menus */}
        <div style={{ display: 'flex', height: '100%' }}>
            {MENU_DATA.map(menu => (
                <div key={menu.label} style={{ position: 'relative' }}>
                    <div 
                        className="menu-item"
                        style={{ 
                            padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer',
                            backgroundColor: activeMenu === menu.label ? 'rgba(128,128,128,0.2)' : 'transparent'
                        }}
                        onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                        onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
                    >
                        {menu.label}
                    </div>
                    {activeMenu === menu.label && (
                        <div style={{
                            position: 'absolute', top: '30px', left: 0,
                            backgroundColor: 'var(--bg-dropdown)', border: '1px solid var(--border-color)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)', minWidth: '180px', padding: '4px 0', zIndex: 1001
                        }}>
                            {menu.items.map((item: any, idx) => (
                                item.type === 'separator' ? (
                                    <div key={idx} style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
                                ) : (
                                    <div 
                                        key={idx} className="dropdown-item" 
                                        style={{ padding: '6px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                                        onClick={() => { onAction(item.action); setActiveMenu(null); }}
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && <span style={{ opacity: 0.5, fontSize: '10px' }}>{item.shortcut}</span>}
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* Draggable Title Area */}
        <div style={{ flex: 1, height: '100%', textAlign: 'center', opacity: 0.5, paddingTop: '6px' }} data-tauri-drag-region>
            智码 - zyma {isAdmin && `[${t('Administrator')}]`}
        </div>
      </div>

      {/* Actual Buttons (Windows: Right, MacOS: Left) */}
      <div style={{ display: 'flex', height: '100%' }}>
        {isMac ? (
            <div style={{ width: '70px' }} data-tauri-drag-region></div> /* Space for MacOS traffic lights */
        ) : (
            <>
                <div className="window-control" onClick={handleMinimize}><Minus size={16} /></div>
                <div className="window-control" onClick={handleMaximize}>
                    {isMaximized ? <Copy size={14} /> : <Square size={14} />}
                </div>
                <div className="window-control close" onClick={handleClose}><CloseIcon size={16} /></div>
            </>
        )}
      </div>
    </div>
  );
};

export default TitleBar;