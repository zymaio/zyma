import React from 'react';
import { Info } from 'lucide-react';
import { statusBar } from './StatusBar/StatusBarRegistry';
import { commands } from './CommandSystem/CommandRegistry';
import { slotRegistry } from '../core/SlotRegistry';

interface StatusBarProps {
    isAdmin: boolean;
    relativePath: string;
    activeFile: any;
    getLanguageMode: () => string;
    hasUpdate: boolean;
    appVersion: string;
    t: any;
}

const StatusBar: React.FC<StatusBarProps> = ({ 
    isAdmin, relativePath, activeFile, getLanguageMode, hasUpdate, appVersion, t 
}) => {
    const [cursor, setCursor] = React.useState({ line: 1, col: 1 });
    const [, forceUpdate] = React.useState(0);

    React.useEffect(() => {
        const unsubCursor = statusBar.subscribeCursor((pos) => setCursor(pos));
        const unsubSlots = slotRegistry.subscribe(() => forceUpdate(n => n + 1));
        return () => { unsubCursor(); unsubSlots(); };
    }, []);

    const renderSlot = (location: any) => {
        return slotRegistry.getContributedComponents(location).map(c => {
            const Content = c.component;
            return <div key={c.id} style={{ display: 'flex', alignItems: 'center' }}>
                {typeof Content === 'function' ? <Content /> : Content}
            </div>;
        });
    };

    return (
        <div className="status-bar" style={{ backgroundColor: 'var(--bg-status)', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isAdmin && <span style={{ backgroundColor: 'var(--status-error)', color: '#fff', padding: '0 4px', borderRadius: '2px', fontSize: 'calc(var(--ui-font-size) - 3px)', fontWeight: 'bold' }}>{t('Administrator')}</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.9 }} title={activeFile?.path || ''}>
                    {relativePath}
                </div>
                {statusBar.getItems('left').map(item => <div key={item.id} title={item.tooltip} onClick={item.onClick} style={{ cursor: item.onClick ? 'pointer' : 'default', padding: '0 5px' }}>{item.text}</div>)}
                {renderSlot('STATUS_BAR_LEFT')}
            </div>

            <div style={{ flex: 1 }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {renderSlot('STATUS_BAR_RIGHT')}
                <div title={t('Line') + '/' + t('Column')}>
                    {`${t('Ln')} ${cursor.line}, ${t('Col')} ${cursor.col}`}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{t('Spaces')}: 4</div>
                <div style={{ color: 'var(--text-secondary)' }}>{t('UTF8')}</div>
                <div style={{ fontWeight: '500' }}>{getLanguageMode()}</div>
                <div style={{ minWidth: '60px', textAlign: 'right' }}>
                    {activeFile && activeFile.content !== activeFile.originalContent ? '● ' + t('Unsaved') : ''}
                </div>
                {statusBar.getItems('right').map(item => (
                    item.id !== 'editor-cursor' && (
                        <div key={item.id} title={item.tooltip} onClick={item.onClick} style={{ cursor: item.onClick ? 'pointer' : 'default', padding: '0 5px', display: 'flex', alignItems: 'center' }}>
                            {item.text}
                        </div>
                    )
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border-color)', paddingLeft: '10px', position: 'relative' }} onClick={() => commands.executeCommand('about')}>
                    {hasUpdate && <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--status-success)', borderRadius: '50%', border: '1px solid var(--bg-status)' }} title={t('UpdateAvailable')} />}
                    <Info size={14} />
                    <span>{appVersion}</span>
                </div>
            </div>
        </div>
    );
};

export default StatusBar;