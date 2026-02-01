import { useState, useCallback, useEffect } from 'react';

export function useBottomPanelResize() {
    const [panelHeight, setPanelHeight] = useState(() => {
        const saved = localStorage.getItem('bottom_panel_height');
        return saved ? parseInt(saved, 10) : 300;
    });
    const [isVisible, setIsVisible] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
        localStorage.setItem('bottom_panel_height', panelHeight.toString());
    }, [panelHeight]);

    const onResize = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        
        // 计算从底部向上的位移
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            setPanelHeight(newHeight);
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', onResize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', onResize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, onResize, stopResizing]);

    return {
        panelHeight,
        isVisible,
        setIsVisible,
        startResizing,
        isResizing
    };
}
