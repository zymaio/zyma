import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import OutputToolbar from './OutputToolbar';
import OutputViewer from './OutputViewer';
import { useOutputChannel } from '../../hooks/useOutputChannel';

interface OutputPanelProps {
    channels: string[];
    onClose?: () => void;
    hideHeader?: boolean;
    forcedChannel?: string;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ channels, onClose, hideHeader, forcedChannel }) => {
    const { t } = useTranslation();
    const [selectedChannel, setSelectedChannel] = useState(forcedChannel || channels[0] || "");
    const [localFontSize, setLocalFontSize] = useState(13);
    const { lines, handleClear, handleCopyAll } = useOutputChannel(selectedChannel);

    // 响应外部强制切换频道
    useEffect(() => {
        if (forcedChannel && forcedChannel !== selectedChannel) {
            setSelectedChannel(forcedChannel);
        }
    }, [forcedChannel]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-editor)' }}>
            <OutputToolbar
                channels={channels}
                selectedChannel={selectedChannel}
                onChannelChange={setSelectedChannel}
                onClear={handleClear}
                onCopyAll={handleCopyAll}
                onClose={onClose}
                hideHeader={hideHeader}
                fontSize={localFontSize}
                onFontSizeChange={setLocalFontSize}
            />
            <OutputViewer lines={lines} fontSize={localFontSize} />
        </div>
    );
};

export default OutputPanel;