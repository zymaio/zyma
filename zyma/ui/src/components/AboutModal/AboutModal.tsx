import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import Modal from '../Common/Modal';

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

    useEffect(() => {
        if (autoCheck) checkUpdate();
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
            }
        } catch (e) {
            console.error('Download/Install failed:', e);
            alert(t('UpdateFailed'));
            setUpdateStatus('new');
        }
    };

    const renderUpdateStatus = () => {
        switch (updateStatus) {
            case 'checking': return <div style={{ fontSize: 'var(--ui-font-size)', opacity: 0.5 }}>{t('Checking')}</div>;
            case 'latest': return <div style={{ fontSize: 'var(--ui-font-size)', color: 'var(--status-success)' }}>{t('AlreadyLatest')}</div>;
            case 'downloading': return <div style={{ fontSize: 'var(--ui-font-size)', color: 'var(--status-warning)' }}>{t('Downloading')}...</div>;
            case 'new': return null;
            default:
                return (
                    <div onClick={checkUpdate} style={{ fontSize: 'var(--ui-font-size)', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={12} /> {t('CheckUpdate')}
                    </div>
                );
        }
    };

    return (
        <Modal onClose={onClose} width="400px" zIndex={3000}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ 
                    width: '80px', height: '80px', backgroundColor: 'var(--status-error)', borderRadius: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                    boxShadow: 'var(--shadow-main)'
                }}>
                    <svg width="50" height="50" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M190 100H430L250 260H390L150 420L220 260H130L190 100Z" fill="white"/>
                    </svg>
                </div>

                <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>智码 (Zyma)</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: 'calc(var(--ui-font-size) - 1px)', backgroundColor: 'var(--active-bg)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                        Version {currentVersion} Beta
                    </div>
                    {renderUpdateStatus()}
                </div>

                {updateStatus === 'new' && latestVersion && (
                    <div style={{ 
                        width: '100%', padding: '12px', backgroundColor: 'var(--active-bg)', 
                        borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' 
                    }}>
                        <div style={{ fontSize: 'var(--ui-font-size)', fontWeight: 'bold', color: 'var(--status-success)', marginBottom: '8px' }}>
                            {t('NewVersionFound', { version: latestVersion })}
                        </div>
                        <button 
                            onClick={installUpdate}
                            className="btn-primary"
                            style={{ 
                                padding: '6px 15px', backgroundColor: 'var(--status-success)',
                                margin: '0 auto'
                            }}
                        >
                            <Download size={14} /> {t('UpdateNow')}
                        </button>
                    </div>
                )}

                <p style={{ fontSize: 'var(--ui-font-size)', lineHeight: '1.6', margin: '0 0 25px 0', color: 'var(--text-secondary)' }}>
                    {t('AppDescription')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <a onClick={() => handleOpenLink('https://github.com/zymaio/zyma')} className="about-link" style={{ textDecoration: 'none' }}>
                        GitHub Repository <ExternalLink size={14} />
                    </a>
                    <a onClick={() => handleOpenLink('https://gitee.com/zymaio/zyma')} className="about-link" style={{ textDecoration: 'none' }}>
                        Gitee Mirror (China) <ExternalLink size={14} />
                    </a>
                </div>

                <div style={{ marginTop: '30px', fontSize: 'calc(var(--ui-font-size) - 2px)', opacity: 0.4, color: 'var(--text-primary)' }}>
                    © 2026 Zyma Contributors. MIT/Apache-2.0 License.
                </div>
            </div>
            
            <style>{`
                .about-link {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    padding: 10px; background-color: var(--active-bg); border-radius: 8px;
                    cursor: pointer; color: var(--text-primary); font-size: var(--ui-font-size);
                    border: 1px solid var(--border-color); transition: background 0.2s;
                }
                .about-link:hover { background-color: var(--dropdown-hover); }
            `}</style>
        </Modal>
    );
};

export default AboutModal;