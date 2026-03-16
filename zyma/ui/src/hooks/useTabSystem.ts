import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';

export type TabItem = {
    id: string; // 对应 FileData.id
    title: string;
    type: 'file' | 'view';
    component?: React.ReactNode;
};

export type CustomViewOptions = {
    canSplit?: boolean;
    preferLocation?: 'editor' | 'bottom';
    persistent?: boolean;
};

export type CustomViewRequest = {
    id: string;
    title: string;
    component: React.ReactNode;
    options?: CustomViewOptions;
};

/**
 * 专门处理来自后端的页签控制事件 (CLI, Single Instance, 插件)
 */
function useRemoteTabHandler(fm: any, closeTab: (id: string) => void) {
    const fmRef = useRef(fm);
    const closeTabRef = useRef(closeTab);
    fmRef.current = fm;
    closeTabRef.current = closeTab;

    useEffect(() => {
        let unsubs: any[] = [];
        
        const setup = async () => {
            const u1 = await listen('zyma:open-tab', (event: any) => {
                const { id, title, type } = event.payload;
                if (type === 'file') fmRef.current.handleFileSelect(id, title);
            });
            unsubs.push(u1);

            const u2 = await listen('zyma:close-tab', (event: any) => {
                const id = event.payload as string;
                if (typeof closeTabRef.current === 'function') closeTabRef.current(id);
            });
            unsubs.push(u2);
        };

        setup();
        return () => unsubs.forEach(u => typeof u === 'function' && u());
    }, []);
}

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
    const openCustomView = useCallback((request: CustomViewRequest) => {
        const { id, title, component } = request;
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

    // 5. 处理来自后端的全局事件 (碎片化提取)
    useRemoteTabHandler(fm, closeTab);

    return useMemo(() => ({
        activeTabs,
        activeTabId,
        activeTab,
        setActiveTabId,
        openCustomView,
        closeTab
    }), [activeTabs, activeTabId, activeTab, openCustomView, closeTab]);
}
