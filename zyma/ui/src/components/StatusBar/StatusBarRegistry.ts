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

    private constructor() {}

    public static get(): StatusBarRegistry {
        if (!StatusBarRegistry.instance) {
            StatusBarRegistry.instance = new StatusBarRegistry();
        }
        return StatusBarRegistry.instance;
    }

    registerItem(item: StatusBarItem): void {
        this.items.set(item.id, item);
    }

    getItems(alignment: 'left' | 'right'): StatusBarItem[] {
        return Array.from(this.items.values())
            .filter(item => item.alignment === alignment)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
}

export const statusBar = StatusBarRegistry.get();
