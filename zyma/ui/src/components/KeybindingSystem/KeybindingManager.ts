import { commands } from '../CommandSystem/CommandRegistry';

export interface Keybinding {
    key: string;
    command: string;
    when?: string; // 暂时简单处理
}

export class KeybindingManager {
    private static instance: KeybindingManager;
    private keybindings: Keybinding[] = [];

    private constructor() {
        // 默认快捷键配置
        this.keybindings = [
            { key: 'ctrl+s', command: 'file.save' },
            { key: 'ctrl+shift+s', command: 'file.saveAs' },
            { key: 'ctrl+n', command: 'file.new' },
            { key: 'ctrl+shift+p', command: 'workbench.action.showCommands' },
            { key: 'ctrl+shift+f', command: 'workbench.action.showAllSymbols' },
            { key: 'ctrl+b', command: 'workbench.action.toggleSidebarVisibility' },
            { key: 'ctrl+f', command: 'actions.find' },
            { key: 'ctrl+=', command: 'editor.zoomIn' },
            { key: 'ctrl++', command: 'editor.zoomIn' }, 
            { key: 'ctrl+shift+=', command: 'editor.zoomIn' }, 
            { key: 'ctrl+-', command: 'editor.zoomOut' },
            { key: 'ctrl+0', command: 'editor.zoomReset' },
        ];
    }

    public static get(): KeybindingManager {
        if (!KeybindingManager.instance) {
            KeybindingManager.instance = new KeybindingManager();
        }
        return KeybindingManager.instance;
    }

    handleKeyEvent(e: KeyboardEvent): boolean {
        if (!e) return false;
        const parts = [];
        
        // 顺序必须固定：ctrl -> shift -> alt
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        
        // 获取实际按键名，统一转小写
        const key = e.key.toLowerCase();
        
        // 过滤掉单独的修饰键本身
        if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
            parts.push(key);
        }

        const combo = parts.join('+');
        const match = this.keybindings.find(kb => kb.key === combo);

        if (match) {
            e.preventDefault();
            commands.executeCommand(match.command);
            return true;
        }
        return false;
    }
}

export const keybindings = KeybindingManager.get();
