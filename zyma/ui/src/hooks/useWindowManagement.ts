import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * 集中管理 IDE 的窗口行为：标题同步、关闭拦截、退出流程
 */
export function useWindowManagement(
    rootPath: string, 
    isExiting: boolean, 
    openFiles: any[],
    handleAppExit: (saveAll: boolean) => void, 
    setIsClosingApp: (val: boolean) => void
) {
    // 所有的状态都使用 Ref 维护，确保监听器闭包永远不会过期
    const filesRef = useRef(openFiles);
    const exitingRef = useRef(isExiting);
    const exitHandlerRef = useRef(handleAppExit);
    const setClosingRef = useRef(setIsClosingApp);

    // 每次渲染都同步更新 Ref
    useEffect(() => { filesRef.current = openFiles; }, [openFiles]);
    useEffect(() => { exitingRef.current = isExiting; }, [isExiting]);
    useEffect(() => { exitHandlerRef.current = handleAppExit; }, [handleAppExit]);
    useEffect(() => { setClosingRef.current = setIsClosingApp; }, [setIsClosingApp]);

    // 标题更新独立处理
    useEffect(() => {
        const updateTitle = async () => {
            const win = getCurrentWindow();
            const displayPath = rootPath === '.' ? 'Zyma' : rootPath;
            await win.setTitle(`${displayPath} - 智码 (Zyma)`);
        };
        updateTitle();
    }, [rootPath]);

    // 核心拦截器：保证生命周期内只注册一次，且必须是同步函数
    useEffect(() => {
        const unlistenPromise = getCurrentWindow().onCloseRequested((e) => {
            // 如果已经在退出流程中，不再拦截
            if (exitingRef.current) return;

            // 检查脏数据 (通过 Ref 拿最新值)
            const hasDirty = filesRef.current.some((f: any) => f.isDirty);
            
            // 关键：必须在函数体内第一时间同步调用 preventDefault
            e.preventDefault();

            if (hasDirty) {
                // 通知 UI 弹出确认框
                setClosingRef.current(true);
            } else {
                // 没有脏文件，执行清理并彻底退出
                exitHandlerRef.current(false);
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []); // 严格空数组，防止重绑导致的监听真空期
}
