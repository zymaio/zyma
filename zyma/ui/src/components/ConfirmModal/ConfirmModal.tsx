import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
    title: string;
    message: string;
    onSave: () => void;
    onDontSave: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onSave, onDontSave, onCancel }) => {
    const { t } = useTranslation();

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 3000
        }}>
            <div style={{
                width: '450px', backgroundColor: 'var(--bg-dropdown)',
                color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)', borderRadius: '8px',
                padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px'
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{title}</div>
                <div style={{ fontSize: '14px', lineHeight: '1.5', opacity: 0.9 }}>{message}</div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button 
                        onClick={onCancel}
                        style={{
                            padding: '6px 15px', backgroundColor: 'transparent',
                            border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                            borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
                        }}
                    >
                        {t('Cancel')}
                    </button>
                    <div style={{ flex: 1 }}></div>
                    <button 
                        onClick={onDontSave}
                        style={{
                            padding: '6px 15px', backgroundColor: 'transparent',
                            border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                            borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
                        }}
                    >
                        {t('DontSave')}
                    </button>
                    <button 
                        onClick={onSave}
                        style={{
                            padding: '6px 15px', backgroundColor: 'var(--accent-color)',
                            border: 'none', color: '#fff',
                            borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
                        }}
                    >
                        {t('Save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
