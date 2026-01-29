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
                className="btn-secondary"
                style={{ padding: '6px 15px' }}
            >
                {t('Cancel')}
            </button>
            <button 
                onClick={onDontSave}
                className="btn-secondary"
                style={{ padding: '6px 15px' }}
            >
                {t('DontSave')}
            </button>
            <button 
                onClick={onSave}
                className="btn-primary"
                style={{ padding: '6px 15px' }}
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
