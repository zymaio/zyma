import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, X as CloseIcon, Copy, ChevronRight } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';

import { getMenuData, type MenuItem } from './menuConfig';
import './TitleBar.css';
import { useWorkbench } from '../../core/WorkbenchContext';

interface TitleBarProps {
    onAction: (action: string, params?: any) => void;
    themeMode: 'dark' | 'light' | 'abyss';
    isAdmin: boolean;
    platform: string;
    brand?: {
        name: string;
        subName?: string;
        logo?: React.ReactNode;
    };
}

const TitleBar: React.FC<TitleBarProps> = ({ onAction, themeMode, isAdmin, platform, brand }) => {
  const { t } = useTranslation();
  const { productName, settings } = useWorkbench();
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoverSubMenu, setHoverSubMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMac = platform === 'macos' || platform === 'darwin';
  const MENU_DATA = getMenuData(t, themeMode);
  const recentWorkspaces = settings?.recent_workspaces || [];

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
            setHoverSubMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = async () => {
    const win = getCurrentWindow();
    if (await win.isMaximized()) { await win.unmaximize(); setIsMaximized(false); } 
    else { await win.maximize(); setIsMaximized(true); }
  };
  
  const handleRequestClose = () => onAction('exit');

  return (
    <div className="title-bar-container" ref={menuRef} style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto', // 关键：左、中、右三段式
        alignItems: 'center',
        height: '32px'
    }}>
      {/* 左侧：Logo + 菜单 */}
      <div className="title-bar-left" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <div className="logo-wrapper" data-tauri-drag-region style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
          <div className="logo-box" data-tauri-drag-region style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {brand?.logo ? (
                <div style={{ width: '18px', height: '18px', display: 'flex' }} data-tauri-drag-region>{brand.logo}</div>
            ) : (
                <svg width="16" height="16" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" data-tauri-drag-region>
                    <rect width="512" height="512" rx="100" fill="#FF4D4F"/><path d="M190 100H430L250 260H390L150 420L220 260H130L190 100Z" fill="white"/>
                </svg>
            )}
          </div>
        </div>

        <div className="menu-container" style={{ display: 'flex', height: '100%' }}>
            {MENU_DATA.map(menu => (
                <div key={menu.label} className="menu-item-wrapper">
                    <div className={`menu-item-label ${activeMenu === menu.label ? 'active' : ''}`}
                        onClick={() => { setActiveMenu(activeMenu === menu.label ? null : menu.label); setHoverSubMenu(null); }}
                        onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}>
                        {menu.label}
                    </div>
                    {activeMenu === menu.label && (
                        <div className="dropdown-menu">
                            {menu.items.map((item: MenuItem, idx) => (
                                item.type === 'separator' ? <div key={idx} className="dropdown-separator"></div> : (
                                    <div key={idx} className={`dropdown-item ${hoverSubMenu === item.action ? 'active' : ''}`} 
                                        onMouseEnter={() => item.action === 'open_recent' ? setHoverSubMenu(item.action) : setHoverSubMenu(null)}
                                        onClick={() => { if (item.action && item.action !== 'open_recent') { onAction(item.action); setActiveMenu(null); } }}>
                                        <div className="dropdown-item-content">
                                            <span>{item.label}</span>
                                            {item.action === 'open_recent' && <ChevronRight size={14} style={{ marginLeft: '10px', opacity: 0.5 }} />}
                                            {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
                                        </div>
                                        {hoverSubMenu === 'open_recent' && item.action === 'open_recent' && (
                                            <div className="dropdown-menu sub-menu">
                                                {recentWorkspaces.map((path: string) => (
                                                    <div key={path} className="dropdown-item" onClick={(e) => { e.stopPropagation(); onAction('workspace.open_recent', path); setActiveMenu(null); }}>
                                                        <div className="dropdown-item-content"><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{path}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* 中间：标题居中区域 (真正的居中) */}
      <div className="title-drag-region" data-tauri-drag-region style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          height: '100%', cursor: 'default', overflow: 'hidden'
      }}>
          <span data-tauri-drag-region style={{ opacity: 0.7, fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {brand?.name || t(`app_name_${productName}`)} 
              {brand?.subName && ` - ${brand.subName}`}
              {isAdmin && ` [${t('Administrator')}]`}
          </span>
      </div>

      {/* 右侧：窗口控制 */}
      <div className="window-controls-wrapper" style={{ display: 'flex', height: '100%' }}>
        {!isMac && (
            <>
                <div className="window-control" onClick={handleMinimize}><Minus size={16} /></div>
                <div className="window-control" onClick={handleMaximize}>{isMaximized ? <Copy size={14} /> : <Square size={14} />}</div>
                <div className="window-control close" onClick={handleRequestClose}><CloseIcon size={16} /></div>
            </>
        )}
      </div>
    </div>
  );
};

export default TitleBar;
