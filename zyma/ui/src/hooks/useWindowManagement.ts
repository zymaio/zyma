import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * 集中管理 IDE 的窗口行为：标题同步、关闭拦截、退出流程
 */
export function useWindowManagement(
    rootPath: string, 
    isExiting: boolean, 
    fm: any, 
    handleAppExit: (saveAll: boolean) => void, 
    setIsClosingApp: (val: boolean) => void
) {
    // 1. 同步窗口标题
    useEffect(() => {
        const updateTitle = async () => {
            const win = getCurrentWindow();
            const displayPath = rootPath === '.' ? 'Zyma' : rootPath;
            await win.setTitle(`${displayPath} - 智码 (Zyma)`);
        };
        updateTitle();
    }, [rootPath]);

    // 2. 拦截关闭请求
    useEffect(() => {
        const unlistenClose = getCurrentWindow().onCloseRequested(async (e) => {
            if (isExiting) return;
            
            e.preventDefault();
            
            // 检查是否有未保存文件
            const hasDirty = fm.stateRef.current.openFiles.some((f: any) => f.content !== f.originalContent);
            
            if (hasDirty) {
                setIsClosingApp(true); // 弹出确认框
            } else {
                handleAppExit(false); // 直接退出
            }
        });

        return () => { unlistenClose.then(f => f()); };
    }, [isExiting, handleAppExit, fm.stateRef, setIsClosingApp]);
}
