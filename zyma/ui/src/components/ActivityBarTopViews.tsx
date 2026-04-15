import React from 'react';
import { MessageSquare } from 'lucide-react';
import { DynamicIcon } from './Common/DynamicIcon';
import { commands } from './CommandSystem/CommandRegistry';
import { slotRegistry } from '../core/SlotRegistry';
import type { NativeSidebarItem } from '../hooks/useActivityBarData';

interface ActivityBarTopViewsProps {
    sidebarTab: string;
    showSidebar: boolean;
    onTabClick: (id: string) => void;
    activeViews: any[];
    isAIChatEnabled: boolean;
    nativeSidebarItems: NativeSidebarItem[];
}

const ActivityBarTopViews: React.FC<ActivityBarTopViewsProps> = ({
    sidebarTab, showSidebar, onTabClick, activeViews, isAIChatEnabled, nativeSidebarItems
}) => {
    const BUILTIN_BOTTOM_IDS = ['output', 'debug', 'terminal', 'accounts', 'settings', 'explorer', 'search', 'plugins'];
    const topViews = activeViews.filter(v => !BUILTIN_BOTTOM_IDS.includes(v.id));
    const topNativeItems = nativeSidebarItems.filter(item => !item.params || item.params.position !== 'bottom');

    const handleNativeClick = (item: NativeSidebarItem) => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.command === 'zyma:toggle-bottom-panel') {
            import('@tauri-apps/api/event').then(({ emit }) => emit('open-output-panel', item.params?.channel));
        } else {
            import('@tauri-apps/api/core').then(({ invoke }) => invoke(item.command, { params: item.params || {} }).catch(console.error));
        }
    };

    return (
        <>
            {activeViews.filter(v => ['explorer', 'search', 'plugins'].includes(v.id)).map(view => (
                <div
                    key={view.id}
                    className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`}
                    onClick={() => onTabClick(view.id)}
                    title={view.title}
                >
                    <DynamicIcon icon={view.icon} />
                </div>
            ))}

            {slotRegistry.getContributedComponents('ACTIVITY_BAR_TOP').map(c => {
                const Content = c.component;
                return <div key={c.id} className="activity-icon">
                    {typeof Content === 'function' ? <Content /> : Content}
                </div>;
            })}

            {isAIChatEnabled && (
                <div
                    className="activity-icon"
                    onClick={() => commands.executeCommand('ai.chat.open')}
                    title="AI Assistant"
                    style={{ color: 'var(--accent-color)' }}
                >
                    <MessageSquare size={24} />
                </div>
            )}

            {topViews.length > 0 && <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--border-color)', margin: '5px 0' }} />}

            {topViews.map(view => (
                <div
                    key={view.id}
                    className={`activity-icon ${sidebarTab === view.id && showSidebar ? 'active' : ''}`}
                    onClick={() => onTabClick(view.id)}
                    title={view.title}
                >
                    <DynamicIcon icon={view.icon} />
                </div>
            ))}

            {topNativeItems.map(item => (
                <div
                    key={item.id}
                    className="activity-icon"
                    onClick={handleNativeClick(item)}
                    title={item.title}
                    style={{ color: item.color || 'inherit' }}
                >
                    <DynamicIcon icon={item.icon} />
                </div>
            ))}
        </>
    );
};

export default ActivityBarTopViews;
