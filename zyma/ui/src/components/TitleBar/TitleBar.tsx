import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, X as CloseIcon, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';

import { getMenuData, type MenuItem } from './menuConfig';
import './TitleBar.css';
import { useWorkbench } from '../../core/WorkbenchContext';

interface TitleBarProps {
    onAction: (action: string) => void;
    themeMode: 'dark' | 'light' | 'abyss';
    isAdmin: boolean;
    platform: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ onAction, themeMode, isAdmin, platform }) => {
  const { t } = useTranslation();
  const { productName } = useWorkbench();
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMac = platform === 'macos' || platform === 'darwin';

  const MENU_DATA = getMenuData(t, themeMode);

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
  
  // 关键：这里不再直接 close()，而是触发 onAction('exit') 让上层处理
  const handleRequestClose = () => onAction('exit');

  return (
    <div 
      className="title-bar-container"
      style={{ flexDirection: isMac ? 'row-reverse' : 'row' }}
      ref={menuRef}
    >
      {/* 1. Window Controls (MacOS: Left, Windows: Right) */}
      {!isMac && <div style={{ width: '48px' }} data-tauri-drag-region></div> /* Placeholder for balance */}
      
      <div className="title-bar-main" style={{ flexDirection: isMac ? 'row-reverse' : 'row' }}>
        {/* New Zyma Logo: Theme-aware Background + White Bolt */}
        <div className="logo-wrapper" data-tauri-drag-region>
          <div className="logo-box">
            <svg width="12" height="12" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M110 20H470L180 260H400L20 492L130 260H20L110 20Z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Menus */}
        <div className="menu-container">
            {MENU_DATA.map(menu => (
                <div key={menu.label} className="menu-item-wrapper">
                    <div 
                        className={`menu-item-label ${activeMenu === menu.label ? 'active' : ''}`}
                        onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                        onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
                    >
                        {menu.label}
                    </div>
                    {activeMenu === menu.label && (
                        <div className="dropdown-menu">
                            {menu.items.map((item: MenuItem, idx) => (
                                item.type === 'separator' ? (
                                    <div key={idx} className="dropdown-separator"></div>
                                ) : (
                                    <div 
                                        key={idx} className="dropdown-item" 
                                        onClick={() => { if (item.action) onAction(item.action); setActiveMenu(null); }}
                                    >
                                        <div className="dropdown-item-content">
                                            <span>{item.label}</span>
                                            {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* Draggable Title Area */}
        <div className="title-drag-region" data-tauri-drag-region>
            {t(`app_name_${productName}`)} {isAdmin && `[${t('Administrator')}]`}
        </div>
      </div>

      {/* Actual Buttons (Windows: Right, MacOS: Left) */}
      <div className="window-controls-wrapper">
        {isMac ? (
            <div style={{ width: '70px' }} data-tauri-drag-region></div> /* Space for MacOS traffic lights */
        ) : (
            <>
                <div className="window-control" onClick={handleMinimize}><Minus size={16} /></div>
                <div className="window-control" onClick={handleMaximize}>
                    {isMaximized ? <Copy size={14} /> : <Square size={14} />}
                </div>
                <div className="window-control close" onClick={handleRequestClose}><CloseIcon size={16} /></div>
            </>
        )}
      </div>
    </div>
  );
};

export default TitleBar;