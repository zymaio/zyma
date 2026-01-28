import { useState, useEffect, useCallback, useMemo } from 'react';

export type TabItem = {
    id: string; // 对应 FileData.id
    title: string;
    type: 'file' | 'view';
    component?: React.ReactNode;
};

export function useTabSystem(fm: any) {
    const [activeTabs, setActiveTabs] = useState<TabItem[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // 1. 同步文件列表 (核心：基于 fm.openFiles 映射，保持 ID 一致)
    useEffect(() => {
        setActiveTabs(prev => {
            const viewTabs = prev.filter(t => t.type === 'view');
            const fileTabs: TabItem[] = fm.openFiles.map((f: any) => ({
                id: f.id,
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
        const index = activeTabs.findIndex(t => t.id === id);
        if (index === -1) return;

        const tabToClose = activeTabs[index];

        // 自动计算下一个活跃 ID
        let nextActiveId = activeTabId;
        if (activeTabId === id) {
            if (activeTabs.length > 1) {
                // 优先激活右侧，若无则激活左侧
                nextActiveId = activeTabs[index + 1]?.id || activeTabs[index - 1]?.id;
            } else {
                nextActiveId = null;
            }
        }

        if (tabToClose.type === 'file') {
            fm.closeFile(id);
        } else {
            setActiveTabs(prev => prev.filter(t => t.id !== id));
        }

        // 统一处理活跃状态切换
        if (activeTabId === id) {
            setActiveTabId(nextActiveId);
            if (nextActiveId) {
                const nextTab = activeTabs.find(t => t.id === nextActiveId);
                if (nextTab?.type === 'file') {
                    fm.setActiveFilePath(nextActiveId);
                }
            } else {
                fm.setActiveFilePath(null);
            }
        }
    }, [activeTabs, activeTabId, fm]);

    const activeTab = useMemo(() => activeTabs.find(t => t.id === activeTabId), [activeTabs, activeTabId]);

    return useMemo(() => ({
        activeTabs,
        activeTabId,
        activeTab,
        setActiveTabId,
        openCustomView,
        closeTab
    }), [activeTabs, activeTabId, activeTab, openCustomView, closeTab]);
}