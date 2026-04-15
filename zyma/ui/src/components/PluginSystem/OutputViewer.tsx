import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { OutputLine } from '../../hooks/useOutputChannel';
import { parseLogLevel } from '../../utils/output';

interface OutputViewerProps {
    lines: OutputLine[];
    fontSize: number;
}

const OutputViewer: React.FC<OutputViewerProps> = ({ lines, fontSize }) => {
    const { t } = useTranslation();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [atBottom, setAtBottom] = useState(true);

    // 自动滚动到底部
    useEffect(() => {
        if (atBottom && lines.length > 0) {
            virtuosoRef.current?.scrollToIndex({ index: lines.length - 1, behavior: 'auto' });
        }
    }, [lines, atBottom]);

    const renderLine = useCallback((_index: number, line: OutputLine) => {
        const style = parseLogLevel(line.content);
        return (
            <div style={{
                padding: '1px 12px',
                color: style.color,
                fontWeight: style.fontWeight as any,
                opacity: style.opacity,
                fontSize: `${fontSize}px`,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
            }}>
                {line.content}
            </div>
        );
    }, [fontSize]);

    return (
        <div style={{ flex: 1, position: 'relative' }}>
            <Virtuoso
                ref={virtuosoRef}
                data={lines}
                atBottomStateChange={setAtBottom}
                initialTopMostItemIndex={lines.length > 0 ? lines.length - 1 : 0}
                itemContent={renderLine}
                followOutput="auto"
                style={{ height: '100%' }}
            />

            {!atBottom && lines.length > 0 && (
                <div
                    onClick={() => {
                        setAtBottom(true);
                        virtuosoRef.current?.scrollToIndex({ index: lines.length - 1, behavior: 'smooth' });
                    }}
                    style={{
                        position: 'absolute', bottom: '20px', right: '30px',
                        backgroundColor: 'var(--accent-color)', color: 'white',
                        borderRadius: '20px', padding: '5px 12px', fontSize: '11px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 10
                    }}
                >
                    <ArrowDown size={12} /> {t('ScrollToBottom')}
                </div>
            )}

            {lines.length === 0 && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    opacity: 0.3, textAlign: 'center', fontSize: 'var(--ui-font-size)'
                }}>
                    {t('NoOutput')}
                </div>
            )}
        </div>
    );
};

export default OutputViewer;
