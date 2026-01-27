import React from 'react';

export interface StatusBarItem {
    id: string;
    text: string | React.ReactNode;
    alignment: 'left' | 'right';
    priority?: number;
    tooltip?: string;
    onClick?: () => void;
}

export class StatusBarRegistry {
    private static instance: StatusBarRegistry;
    private items: Map<string, StatusBarItem> = new Map();
    private listeners: (() => void)[] = [];

    private constructor() {}

    public static get(): StatusBarRegistry {
        if (!StatusBarRegistry.instance) {
            StatusBarRegistry.instance = new StatusBarRegistry();
        }
        return StatusBarRegistry.instance;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    registerItem(item: StatusBarItem): void {
        const existing = this.items.get(item.id);
        if (existing && 
            existing.text === item.text && 
            existing.alignment === item.alignment && 
            existing.priority === item.priority && 
            existing.tooltip === item.tooltip && 
            existing.onClick === item.onClick) {
            return;
        }
        this.items.set(item.id, item);
        this.notify();
    }

    unregisterItem(id: string): void {
        if (this.items.delete(id)) {
            this.notify();
        }
    }

    getItems(alignment: 'left' | 'right'): StatusBarItem[] {
        return Array.from(this.items.values())
            .filter(item => item.alignment === alignment)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
}

export const statusBar = StatusBarRegistry.get();