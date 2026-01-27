import { useState, useEffect, useCallback, useMemo } from 'react';

export type TabItem = {
    id: string;
    title: string;
    type: 'file' | 'view';
    component?: React.ReactNode;
};

export function useTabSystem(fm: any) {
    const [activeTabs, setActiveTabs] = useState<TabItem[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // 1. 同步文件列表
    useEffect(() => {
        setActiveTabs(prev => {
            const viewTabs = prev.filter(t => t.type === 'view');
            const fileTabs: TabItem[] = fm.openFiles.map((f: any) => ({
                id: f.path || f.name,
                title: f.name,
                type: 'file'
            }));
            return [...fileTabs, ...viewTabs];
        });
    }, [fm.openFiles]);

    // 2. 同步活跃文件
    useEffect(() => {
        if (fm.activeFilePath) {
            setActiveTabId(fm.activeFilePath);
        }
    }, [fm.activeFilePath]);

    // 3. 打开自定义视图
    const openCustomView = useCallback((id: string, title: string, component: React.ReactNode) => {
        setActiveTabs(prev => {
            if (prev.some(t => t.id === id)) return prev;
            return [...prev, { id, title, type: 'view', component }];
        });
        setActiveTabId(id);
    }, []);

    // 4. 关闭 Tab 逻辑
    const closeTab = useCallback((id: string) => {
        const tab = activeTabs.find(t => t.id === id);
        if (tab?.type === 'file') {
            fm.closeFile(id);
        } else {
            setActiveTabs(prev => prev.filter(t => t.id !== id));
            // 如果关闭的是当前活跃 Tab，切换到上一个
            if (activeTabId === id) {
                const remaining = activeTabs.filter(t => t.id !== id);
                setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
            }
        }
    }, [activeTabs, activeTabId, fm]);

    const activeTab = useMemo(() => activeTabs.find(t => t.id === activeTabId), [activeTabs, activeTabId]);

    return {
        activeTabs,
        activeTabId,
        activeTab,
        setActiveTabId,
        openCustomView,
        closeTab
    };
}
