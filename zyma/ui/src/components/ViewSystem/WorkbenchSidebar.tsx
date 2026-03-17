import React from 'react';
import ActivityBar from '../ActivityBar';
import PluginsPanel from '../PluginSystem/PluginsPanel';
import { views } from '../ViewSystem/ViewRegistry';
import { ErrorBoundary } from '../ErrorBoundary';

interface WorkbenchSidebarProps {
    logic: any;
    sidebarWidth: number;
    startResizing: () => void;
    pluginManager: any;
}

export const WorkbenchSidebar: React.FC<WorkbenchSidebarProps> = ({ 
    logic, sidebarWidth, startResizing, pluginManager 
}) => {
    return (
        <>
            <ActivityBar 
                sidebarTab={logic.sidebarTab} 
                showSidebar={logic.showSidebar} 
                setSidebarTab={logic.setSidebarTab} 
                setShowSidebar={logic.setShowSidebar} 
                onShowSettings={() => logic.setShowSettings(true)} 
                showSettings={logic.showSettings} 
            />
            
            {logic.showSidebar && (
                <>
                    <div className="sidebar-container" style={{ width: `${sidebarWidth}px` }}>
                        <ErrorBoundary>
                            {(() => {
                                if (logic.sidebarTab === 'plugins') return <PluginsPanel pluginManager={pluginManager.current} onUpdate={() => logic.forceUpdate((n: number) => n + 1)} />;
                                const view = views.getView(logic.sidebarTab);
                                if (!view) return null;
                                const Content = view.component;
                                return typeof Content === 'function' ? <Content /> : Content;
                            })()}
                        </ErrorBoundary>
                    </div>
                    <div style={{ width: '4px', cursor: 'col-resize', zIndex: 10 }} className="resize-handle" onMouseDown={startResizing} />
                </>
            )}
        </>
    );
};
