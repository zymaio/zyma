import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

interface AboutModalProps {
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
    const version = "0.9.1";

    const handleOpenLink = (url: string) => {
        invoke('open_url', { url }).catch(console.error);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 3000
        }}>
            <div style={{
                width: '400px', backgroundColor: 'var(--bg-dropdown)',
                color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)', borderRadius: '12px',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                    <X size={20} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={onClose} />
                </div>

                <div style={{ padding: '0 40px 40px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    {/* Logo Section - Red Branding */}
                    <div style={{ 
                        width: '80px', height: '80px', backgroundColor: '#FF4D4F', borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                        boxShadow: '0 4px 15px rgba(255,77,79,0.3)'
                    }}>
                        <svg width="50" height="50" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M190 100H430L250 260H390L150 420L220 260H130L190 100Z" fill="white"/>
                        </svg>
                    </div>

                    <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '900' }}>智码 (Zyma)</h2>
                    <div style={{ 
                        fontSize: '12px', opacity: 0.6, backgroundColor: 'rgba(128,128,128,0.1)', 
                        padding: '2px 8px', borderRadius: '10px', marginBottom: '20px' 
                    }}>
                        Version {version} Beta
                    </div>

                    <p style={{ fontSize: '14px', lineHeight: '1.6', margin: '0 0 25px 0', opacity: 0.9 }}>
                        简洁 · 快速 · 高效的现代代码编辑器
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <div 
                            onClick={() => handleOpenLink('https://github.com/zymaio/zyma')}
                            style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '10px', backgroundColor: 'rgba(128,128,128,0.1)', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '13px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.1)'}
                        >
                            GitHub Repository <ExternalLink size={14} />
                        </div>
                        <div 
                            onClick={() => handleOpenLink('https://gitee.com/zymaio/zyma')}
                            style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '10px', backgroundColor: 'rgba(128,128,128,0.1)', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '13px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.1)'}
                        >
                            Gitee Mirror (China) <ExternalLink size={14} />
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', fontSize: '11px', opacity: 0.4 }}>
                        © 2026 Zyma Contributors. MIT/Apache-2.0 License.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;