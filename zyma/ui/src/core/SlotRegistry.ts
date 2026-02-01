import React from 'react';

export type SlotLocation = 
    | 'STATUS_BAR_LEFT' 
    | 'STATUS_BAR_RIGHT' 
    | 'ACTIVITY_BAR_TOP' 
    | 'ACTIVITY_BAR_BOTTOM' 
    | 'EDITOR_TITLE_RIGHT'
    | 'SIDEBAR_HEADER_ACTIONS'
    | 'BOTTOM_PANEL';

export interface SlotContribution {
    id: string;
    component: React.ReactNode | React.ComponentType<any>;
    order?: number;
}

class SlotRegistry {
    private static instance: SlotRegistry;
    private slots: Map<SlotLocation, SlotContribution[]> = new Map();
    private listeners: (() => void)[] = [];

    private constructor() {}

    public static get(): SlotRegistry {
        if (!SlotRegistry.instance) {
            SlotRegistry.instance = new SlotRegistry();
        }
        return SlotRegistry.instance;
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    register(location: SlotLocation, contribution: SlotContribution) {
        const contributions = this.slots.get(location) || [];
        if (contributions.find(c => c.id === contribution.id)) return;
        
        contributions.push(contribution);
        contributions.sort((a, b) => (a.order || 100) - (b.order || 100));
        this.slots.set(location, contributions);
        this.notify();
    }

    getContributedComponents(location: SlotLocation): SlotContribution[] {
        return this.slots.get(location) || [];
    }
}

export const slotRegistry = SlotRegistry.get();
