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
        const tabToClose = activeTabs.find(t => t.id === id);
        if (!tabToClose) return;

        // 如果关闭的是当前活跃的 Tab，我们需要计算下一个活跃的 ID
        let nextActiveId = activeTabId;
        if (activeTabId === id) {
            const remaining = activeTabs.filter(t => t.id !== id);
            nextActiveId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
        }

        if (tabToClose.type === 'file') {
            fm.closeFile(id);
            // 注意：fm.closeFile 内部已经处理了 setActiveFilePath(null)
            // 我们这里手动补齐 Tab 层的状态切换
            if (activeTabId === id) {
                setActiveTabId(nextActiveId);
                // 同步更新文件系统的活跃路径
                if (nextActiveId) {
                    const nextTab = activeTabs.find(t => t.id === nextActiveId);
                    if (nextTab?.type === 'file') {
                        fm.setActiveFilePath(nextActiveId);
                    }
                } else {
                    fm.setActiveFilePath(null);
                }
            }
        } else {
            setActiveTabs(prev => prev.filter(t => t.id !== id));
            if (activeTabId === id) {
                setActiveTabId(nextActiveId);
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
