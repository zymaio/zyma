import { useEffect } from 'react';
import { keybindings } from '../components/KeybindingSystem/KeybindingManager';

/**
 * 集中管理 IDE 的全局快捷键监听
 */
export function useKeybindings() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (keybindings.handleKeyEvent(e)) {
                e.stopPropagation();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);
}
