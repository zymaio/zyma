import React from 'react';

export interface View {
    id: string;
    title: string;
    icon: React.ReactNode | string;
    component: React.ReactNode | React.ComponentType<any>;
    order?: number;
}

export class ViewRegistry {
    private static instance: ViewRegistry;
    private views: Map<string, View> = new Map();
    private listeners: (() => void)[] = [];

    private constructor() {}

    public static get(): ViewRegistry {
        if (!ViewRegistry.instance) {
            ViewRegistry.instance = new ViewRegistry();
        }
        return ViewRegistry.instance;
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

    registerView(view: View): void {
        const existing = this.views.get(view.id);
        if (existing && 
            existing.title === view.title && 
            existing.icon === view.icon && 
            existing.component === view.component && 
            existing.order === view.order) {
            return;
        }
        this.views.set(view.id, view);
        this.notify();
    }

    unregisterView(id: string): void {
        if (this.views.delete(id)) {
            this.notify();
        }
    }

    getViews(): View[] {
        return Array.from(this.views.values()).sort((a, b) => {
            const orderA = a.order ?? 100;
            const orderB = b.order ?? 100;
            return orderA - orderB;
        });
    }

    getView(id: string): View | undefined {
        return this.views.get(id);
    }
}

export const views = ViewRegistry.get();