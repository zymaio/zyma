import React from 'react';

export interface View {
    id: string;
    title: string;
    icon: React.ReactNode;
    component: React.ReactNode;
    order?: number;
}

export class ViewRegistry {
    private static instance: ViewRegistry;
    private views: Map<string, View> = new Map();

    private constructor() {}

    public static getInstance(): ViewRegistry {
        if (!ViewRegistry.instance) {
            ViewRegistry.instance = new ViewRegistry();
        }
        return ViewRegistry.getInstance(); // 修正：应返回实例
    }

    // 刚才写快了，重新修一下单例实现
    public static get(): ViewRegistry {
        if (!ViewRegistry.instance) {
            ViewRegistry.instance = new ViewRegistry();
        }
        return ViewRegistry.instance;
    }

    registerView(view: View): void {
        this.views.set(view.id, view);
    }

    getViews(): View[] {
        return Array.from(this.views.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    getView(id: string): View | undefined {
        return this.views.get(id);
    }
}

export const views = ViewRegistry.get();
