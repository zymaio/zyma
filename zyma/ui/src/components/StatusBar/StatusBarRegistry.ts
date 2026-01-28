export interface StatusBarItem {
    id: string;
    text: string;
    alignment: 'left' | 'right';
    priority: number;
    tooltip?: string;
    onClick?: () => void;
}

export class StatusBarRegistry {
    private static instance: StatusBarRegistry;
    private items: Map<string, StatusBarItem> = new Map();
    private listeners: (() => void)[] = [];
    
    // 光标位置状态（高频，独立存储）
    private cursorPosition: { line: number, col: number } = { line: 1, col: 1 };
    private cursorListeners: ((pos: { line: number, col: number }) => void)[] = [];

    private constructor() {}

    public static getInstance(): StatusBarRegistry {
        if (!StatusBarRegistry.instance) {
            StatusBarRegistry.instance = new StatusBarRegistry();
        }
        return StatusBarRegistry.instance;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    // 光标专用订阅
    subscribeCursor(listener: (pos: { line: number, col: number }) => void): () => void {
        this.cursorListeners.push(listener);
        return () => { this.cursorListeners = this.cursorListeners.filter(l => l !== listener); };
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    private notifyCursor(): void {
        this.cursorListeners.forEach(l => l(this.cursorPosition));
    }

    registerItem(item: StatusBarItem): void {
        this.items.set(item.id, item);
        this.notify();
    }

    unregisterItem(id: string): void {
        if (this.items.delete(id)) this.notify();
    }

    // 设置位置，直接触发局部监听
    setCursorPosition(line: number, col: number): void {
        this.cursorPosition = { line, col };
        this.notifyCursor();
    }

    getCursorPosition() { return this.cursorPosition; }

    getItems(alignment: 'left' | 'right'): StatusBarItem[] {
        return Array.from(this.items.values())
            .filter(item => item.alignment === alignment)
            .sort((a, b) => b.priority - a.priority);
    }
}

export const statusBar = StatusBarRegistry.getInstance();
