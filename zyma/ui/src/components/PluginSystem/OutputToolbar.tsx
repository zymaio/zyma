import React, { useState } from 'react';
import { Monitor, Trash2, X, Copy, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OutputToolbarProps {
    channels: string[];
    selectedChannel: string;
    onChannelChange: (channel: string) => void;
    onClear: () => void;
    onCopyAll: () => void;
    onClose?: () => void;
    hideHeader?: boolean;
    fontSize: number;
    onFontSizeChange: (size: number) => void;
}

const OutputToolbar: React.FC<OutputToolbarProps> = ({
    channels, selectedChannel, onChannelChange, onClear, onCopyAll,
    onClose, hideHeader, fontSize, onFontSizeChange
}) => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        await onCopyAll();
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (hideHeader) return null;

    return (
        <div style={{
            padding: '8px 15px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'var(--bg-tabs)',
            zIndex: 10
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--ui-font-size)', fontWeight: 'bold' }}>
                <Monitor size={14} style={{ color: 'var(--text-secondary)' }} />
                <select
                    value={selectedChannel}
                    onChange={(e) => onChannelChange(e.target.value)}
                    style={{
                        background: 'transparent', color: 'var(--text-primary)',
                        border: 'none', outline: 'none', cursor: 'pointer',
                        fontSize: 'inherit', fontWeight: 'inherit'
                    }}
                >
                    {channels.map(c => <option key={c} value={c} style={{ backgroundColor: 'var(--bg-dropdown)', color: 'var(--text-primary)' }}>{c}</option>)}
                </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid var(--border-color)', paddingRight: '15px' }}>
                    <span onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))} title="缩小" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} className="icon-btn">
                        <ZoomOut size={14} />
                    </span>
                    <span style={{ fontSize: '11px', minWidth: '25px', textAlign: 'center', opacity: 0.7 }}>{fontSize}px</span>
                    <span onClick={() => onFontSizeChange(Math.min(30, fontSize + 1))} title="放大" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} className="icon-btn">
                        <ZoomIn size={14} />
                    </span>
                </div>
                {isCopied ? (
                    <span title={t('CopySuccess')} style={{ display: 'flex', alignItems: 'center' }}><Check size={14} style={{ color: 'var(--status-success)' }} /></span>
                ) : (
                    <span title={t('CopyOutput')} onClick={handleCopy} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} className="icon-btn">
                        <Copy size={14} />
                    </span>
                )}
                <span title={t('ClearOutput')} onClick={onClear} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} className="icon-btn">
                    <Trash2 size={14} />
                </span>
                {onClose && (
                    <span title={t('Close')} onClick={onClose} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} className="icon-btn">
                        <X size={16} />
                    </span>
                )}
            </div>
        </div>
    );
};

export default OutputToolbar;
