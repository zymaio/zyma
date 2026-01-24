import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';

interface AboutModalProps {
    onClose: () => void;
    autoCheck?: boolean;
    version: string;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose, autoCheck = false, version }) => {
    const { t } = useTranslation();
    const currentVersion = version;
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'new' | 'downloading'>('idle');
    const [latestVersion, setLatestVersion] = useState<string | null>(null);

    // Auto-trigger check if requested
    useEffect(() => {
        if (autoCheck) {
            checkUpdate();
        }
    }, [autoCheck]);

    const handleOpenLink = (url: string) => {
        invoke('open_url', { url }).catch(console.error);
    };

    const checkUpdate = async () => {
        if (updateStatus === 'checking' || updateStatus === 'downloading') return;
        setUpdateStatus('checking');
        try {
            const update = await check();
            if (update) {
                setLatestVersion(update.version);
                setUpdateStatus('new');
            } else {
                setUpdateStatus('latest');
            }
        } catch (e) {
            console.error('Update check failed:', e);
            setUpdateStatus('idle');
        }
    };

    const installUpdate = async () => {
        try {
            const update = await check();
            if (update) {
                setUpdateStatus('downloading');
                await update.downloadAndInstall();
                // App will restart automatically if configured, or you might need to relaunch
            }
        } catch (e) {
            console.error('Download/Install failed:', e);
            alert(t('UpdateFailed'));
            setUpdateStatus('new');
        }
    };

    const renderUpdateStatus = () => {
        switch (updateStatus) {
            case 'checking':
                return <div style={{ fontSize: 'var(--ui-font-size)', opacity: 0.5 }}>{t('Checking')}</div>;
            case 'latest':
                return <div style={{ fontSize: 'var(--ui-font-size)', color: '#52c41a' }}>{t('AlreadyLatest')}</div>;
            case 'downloading':
                return <div style={{ fontSize: 'var(--ui-font-size)', color: '#faad14' }}>{t('Downloading')}...</div>;
            case 'new':
                 return null;
            case 'idle':
            default:
                return (
                    <div onClick={checkUpdate} style={{ fontSize: 'var(--ui-font-size)', color: '#007acc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={12} /> {t('CheckUpdate')}
                    </div>
                );
        }
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
                    {/* Logo Section */}
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: 'calc(var(--ui-font-size) - 1px)', opacity: 0.6, backgroundColor: 'rgba(128,128,128,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                            Version {currentVersion} Beta
                        </div>
                        {renderUpdateStatus()}
                    </div>

                    {updateStatus === 'new' && latestVersion && (
                        <div style={{ 
                            width: '100%', padding: '12px', backgroundColor: 'rgba(82,196,26,0.1)', 
                            borderRadius: '8px', border: '1px solid rgba(82,196,26,0.2)', marginBottom: '20px' 
                        }}>
                            <div style={{ fontSize: 'var(--ui-font-size)', fontWeight: 'bold', color: '#52c41a', marginBottom: '8px' }}>
                                {t('NewVersionFound', { version: latestVersion })}
                            </div>
                            <button 
                                onClick={installUpdate}
                                style={{ 
                                    padding: '6px 15px', backgroundColor: '#52c41a', color: '#fff', 
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto'
                                }}
                            >
                                <Download size={14} /> {t('UpdateNow')}
                            </button>
                        </div>
                    )}

                    <p style={{ fontSize: 'var(--ui-font-size)', lineHeight: '1.6', margin: '0 0 25px 0', opacity: 0.9 }}>
                        {t('AppDescription')}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <div onClick={() => handleOpenLink('https://github.com/zymaio/zyma')} className="about-link" style={{ fontSize: 'var(--ui-font-size)' }}>
                            GitHub Repository <ExternalLink size={14} />
                        </div>
                        <div onClick={() => handleOpenLink('https://gitee.com/zymaio/zyma')} className="about-link" style={{ fontSize: 'var(--ui-font-size)' }}>
                            Gitee Mirror (China) <ExternalLink size={14} />
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', fontSize: 'calc(var(--ui-font-size) - 2px)', opacity: 0.4 }}>
                        © 2026 Zyma Contributors. MIT/Apache-2.0 License.
                    </div>
                </div>
            </div>
            
            <style>{`
                .about-link {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    padding: 10px; background-color: rgba(128,128,128,0.1); border-radius: 8px;
                    cursor: pointer; font-size: 13px; transition: background 0.2s;
                }
                .about-link:hover { background-color: rgba(128,128,128,0.2); }
            `}</style>
        </div>
    );
};

export default AboutModal;
