import { useState, useEffect, useCallback, useRef } from 'react';

export function useSidebarResize(initialWidth: number = 250) {
    const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
    const isResizingRef = useRef(false);

    const startResizing = useCallback(() => {
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; 
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingRef.current) {
                // 48px 是 ActivityBar 的宽度
                setSidebarWidth(Math.min(Math.max(100, e.clientX - 48), 600));
            }
        };
        const handleMouseUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return { sidebarWidth, startResizing };
}
