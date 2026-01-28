import React from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import Modal from '../Common/Modal';

export interface AppSettings {
    theme: 'dark' | 'light' | 'abyss';
    font_size: number;
    ui_font_size: number;
    tab_size: number;
    language: string;
    context_menu: boolean;
    single_instance: boolean;
    auto_update: boolean;
    window_width: number;
    window_height: number;
    window_x: number | null;
    window_y: number | null;
    is_maximized: boolean;
}

interface SettingsModalProps {
    currentSettings: AppSettings;
    onSave: (settings: AppSettings) => void;
    onClose: () => void;
    platform?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentSettings, onSave, onClose, platform }) => {
    const { t } = useTranslation();
    const isWindows = platform === 'windows' || platform === 'win32';

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const newSettings = { ...currentSettings, [key]: value };
        onSave(newSettings);
        
        if (key === 'context_menu' && isWindows) {
            invoke("manage_context_menu", { 
                enable: value as boolean, 
                label: t('ContextMenuLabel') 
            }).catch(console.error);
        }
    };

    const footer = (
        <button 
            onClick={onClose} 
            style={{ 
                padding: '6px 20px', backgroundColor: 'var(--accent-color)', border: 'none', 
                color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' 
            }}
        >
            {t('Close')}
        </button>
    );

    return (
        <Modal title={t('Settings')} onClose={onClose} footer={footer} width="480px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('Language')}</label>
                    <select 
                        value={currentSettings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                        style={{ padding: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', borderRadius: '4px', outline: 'none', fontSize: 'var(--ui-font-size)' }}
                    >
                        <option value="zh-CN">简体中文</option>
                        <option value="zh-TW">繁體中文</option>
                        <option value="en">English</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('Theme')}</label>
                    <select 
                        value={currentSettings.theme}
                        onChange={(e) => updateSetting('theme', e.target.value as 'dark' | 'light' | 'abyss')}
                        style={{ padding: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', borderRadius: '4px', outline: 'none', fontSize: 'var(--ui-font-size)' }}
                    >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="abyss">Abyss</option>
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('FontSize')} (Editor)</label>
                        <input 
                            type="number" value={currentSettings.font_size}
                            onChange={(e) => updateSetting('font_size', parseInt(e.target.value) || 12)}
                            style={{ padding: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', borderRadius: '4px', outline: 'none', fontSize: 'var(--ui-font-size)' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('UIFontSize')}</label>
                        <input 
                            type="number" value={currentSettings.ui_font_size || 13}
                            onChange={(e) => updateSetting('ui_font_size', parseInt(e.target.value) || 13)}
                            style={{ padding: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', borderRadius: '4px', outline: 'none', fontSize: 'var(--ui-font-size)' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {isWindows && (
                        <div style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px', backgroundColor: 'var(--active-bg)', borderRadius: '4px', border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ fontSize: 'var(--ui-font-size)', fontWeight: 'bold' }}>{t('ContextMenu')}</div>
                            <input 
                                type="checkbox" 
                                checked={currentSettings.context_menu}
                                onChange={(e) => updateSetting('context_menu', e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                        </div>
                    )}

                    <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px', backgroundColor: 'var(--active-bg)', borderRadius: '4px', border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ fontSize: 'var(--ui-font-size)', fontWeight: 'bold' }}>{t('AutoUpdate')}</div>
                        <input 
                            type="checkbox" 
                            checked={currentSettings.auto_update}
                            onChange={(e) => updateSetting('auto_update', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;