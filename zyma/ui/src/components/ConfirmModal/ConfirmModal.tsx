import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Common/Modal';

interface ConfirmModalProps {
    title: string;
    message: string;
    onSave: () => void;
    onDontSave: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onSave, onDontSave, onCancel }) => {
    const { t } = useTranslation();

    const footer = (
        <>
            <button 
                onClick={onCancel}
                style={{
                    padding: '6px 15px', 
                    backgroundColor: 'var(--active-bg)',
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                    borderRadius: '4px', cursor: 'pointer', 
                    fontSize: 'var(--ui-font-size)',
                    transition: 'opacity 0.2s'
                }}
                className="icon-btn"
            >
                {t('Cancel')}
            </button>
            <button 
                onClick={onDontSave}
                style={{
                    padding: '6px 15px', 
                    backgroundColor: 'var(--active-bg)',
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                    borderRadius: '4px', cursor: 'pointer', 
                    fontSize: 'var(--ui-font-size)',
                    transition: 'opacity 0.2s'
                }}
                className="icon-btn"
            >
                {t('DontSave')}
            </button>
            <button 
                onClick={onSave}
                style={{
                    padding: '6px 15px', 
                    backgroundColor: 'var(--accent-color)',
                    border: 'none', 
                    color: '#000', // 在金黄色背景下使用黑色文字更醒目 (灵码风格)
                    borderRadius: '4px', cursor: 'pointer', 
                    fontSize: 'var(--ui-font-size)',
                    fontWeight: 'bold'
                }}
            >
                {t('Save')}
            </button>
        </>
    );

    return (
        <Modal title={title} onClose={onCancel} footer={footer} width="420px" zIndex={3000}>
            <div style={{ 
                fontSize: 'var(--ui-font-size)', 
                lineHeight: '1.6', 
                color: 'var(--text-primary)',
                padding: '10px 0' 
            }}>
                {message}
            </div>
        </Modal>
    );
};

export default ConfirmModal;
