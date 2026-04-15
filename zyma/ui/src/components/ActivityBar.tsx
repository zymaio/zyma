import React from 'react';
import { useActivityBarData } from '../hooks/useActivityBarData';
import ActivityBarTopViews from './ActivityBarTopViews';
import ActivityBarBottomViews from './ActivityBarBottomViews';

interface ActivityBarProps {
    sidebarTab: string;
    showSidebar: boolean;
    setSidebarTab: (id: string) => void;
    setShowSidebar: (show: boolean) => void;
    onShowSettings: () => void;
    showSettings: boolean;
}

const ActivityBar: React.FC<ActivityBarProps> = ({
    sidebarTab, showSidebar, setSidebarTab, setShowSidebar,
    onShowSettings, showSettings
}) => {
    const { activeViews, isAIChatEnabled, nativeSidebarItems } = useActivityBarData();

    const handleTabClick = (id: string) => {
        if (sidebarTab === id && showSidebar) {
            setShowSidebar(false);
        } else {
            setSidebarTab(id);
            setShowSidebar(true);
        }
    };

    return (
        <div className="activity-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%', paddingTop: '10px' }}>
                <ActivityBarTopViews
                    sidebarTab={sidebarTab}
                    showSidebar={showSidebar}
                    onTabClick={handleTabClick}
                    activeViews={activeViews}
                    isAIChatEnabled={isAIChatEnabled}
                    nativeSidebarItems={nativeSidebarItems}
                />
            </div>

            <div style={{ flex: 1 }}></div>

            <div style={{ paddingBottom: '15px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                <ActivityBarBottomViews
                    sidebarTab={sidebarTab}
                    showSidebar={showSidebar}
                    onTabClick={handleTabClick}
                    nativeSidebarItems={nativeSidebarItems}
                    onShowSettings={onShowSettings}
                    showSettings={showSettings}
                />
            </div>
        </div>
    );
};

export default ActivityBar;
