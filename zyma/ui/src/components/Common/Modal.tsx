import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title?: string;
    children: React.ReactNode;
    onClose: () => void;
    width?: string;
    footer?: React.ReactNode;
    zIndex?: number;
}

/**
 * 通用弹窗容器
 * 统一处理：遮罩层、居中、阴影、关闭逻辑、主题变量适配
 */
const Modal: React.FC<ModalProps> = ({ title, children, onClose, width = '450px', footer, zIndex = 2000 }) => {
    // 监听 ESC 键关闭
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'var(--overlay-bg)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex
        }} onClick={onClose}>
            <div 
                style={{
                    width, backgroundColor: 'var(--bg-dropdown)',
                    color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-main)', borderRadius: '8px',
                    display: 'flex', flexDirection: 'column',
                    maxHeight: '90vh', overflow: 'hidden',
                    animation: 'modalFadeIn 0.2s ease-out'
                }} 
                onClick={e => e.stopPropagation()} // 阻止点击弹窗内部关闭
            >
                {/* Header */}
                <div style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span style={{ fontWeight: 'bold', fontSize: 'calc(var(--ui-font-size) + 1px)' }}>
                        {title}
                    </span>
                    <X 
                        size={18} 
                        style={{ cursor: 'pointer', opacity: 0.6 }} 
                        className="icon-btn"
                        onClick={onClose} 
                    />
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{ 
                        padding: '12px 16px', borderTop: '1px solid var(--border-color)', 
                        display: 'flex', justifyContent: 'flex-end', gap: '10px' 
                    }}>
                        {footer}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Modal;
