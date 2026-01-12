import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

export interface AppSettings {
    theme: 'dark' | 'light';
    font_size: number;
    tab_size: number;
    language: string;
    context_menu: boolean;
    single_instance: boolean;
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

    // Helper to update specific fields and trigger parent save
    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const newSettings = { ...currentSettings, [key]: value };
        onSave(newSettings);
        
        // Side effect for context menu
        if (key === 'context_menu' && isWindows) {
            invoke("manage_context_menu", { 
                enable: value as boolean, 
                label: t('ContextMenuLabel') 
            }).catch(console.error);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }}>
            <div style={{
                width: '450px', backgroundColor: 'var(--bg-dropdown)',
                color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)', borderRadius: '6px',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{
                    padding: '15px', borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold'
                }}>
                    <span>{t('Settings')}</span>
                    <X size={18} style={{ cursor: 'pointer' }} onClick={onClose} />
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* Language */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('Language')}</label>
                        <select 
                            value={currentSettings.language}
                            onChange={(e) => updateSetting('language', e.target.value)}
                            style={{ padding: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', borderRadius: '4px', outline: 'none' }}
                        >
                            <option value="zh-CN">简体中文</option>
                            <option value="zh-TW">繁體中文</option>
                            <option value="en">English</option>
                        </select>
                    </div>

                    {/* Theme */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('Theme')}</label>
                        <select 
                            value={currentSettings.theme}
                            onChange={(e) => updateSetting('theme', e.target.value as 'dark' | 'light')}
                            style={{ padding: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', borderRadius: '4px', outline: 'none' }}
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>

                    {/* Font Size */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('FontSize')} (px)</label>
                        <input 
                            type="number" value={currentSettings.font_size}
                            onChange={(e) => updateSetting('font_size', parseInt(e.target.value) || 12)}
                            style={{ padding: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', borderRadius: '4px', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        {isWindows && (
                            <div style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' 
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{t('ContextMenu')}</div>
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
                            padding: '12px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' 
                        }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{t('SingleInstance')}</div>
                                <div style={{ fontSize: '11px', opacity: 0.6 }}>{t('SingleInstanceDesc')}</div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={currentSettings.single_instance}
                                onChange={(e) => updateSetting('single_instance', e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            padding: '6px 20px', backgroundColor: 'var(--accent-color)', border: 'none', 
                            color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' 
                        }}
                    >
                        {t('Close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;