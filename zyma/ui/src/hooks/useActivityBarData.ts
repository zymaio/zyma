import { useState, useEffect, useReducer } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { views } from '../components/ViewSystem/ViewRegistry';
import { authRegistry } from '../components/PluginSystem/AuthRegistry';
import { commands } from '../components/CommandSystem/CommandRegistry';
import { slotRegistry } from '../core/SlotRegistry';

export interface NativeSidebarItem {
    id: string;
    title: string;
    icon: string;
    command: string;
    color?: string;
    params?: Record<string, any> & { position?: string; channel?: string };
}

export interface UseActivityBarDataReturn {
    authProviders: any[];
    activeViews: any[];
    isAIChatEnabled: boolean;
    nativeSidebarItems: NativeSidebarItem[];
}

export function useActivityBarData(): UseActivityBarDataReturn {
    const [authProviders, setAuthProviders] = useState(authRegistry.getProviders());
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const [activeViews, setActiveViews] = useState(views.getViews());
    const [isAIChatEnabled, setIsAIChatEnabled] = useState(false);
    const [nativeSidebarItems, setNativeSidebarItems] = useState<NativeSidebarItem[]>([]);

    useEffect(() => {
        const sync = () => {
            const allViews = views.getViews();
            setActiveViews([...allViews]);
            setAuthProviders([...authRegistry.getProviders()]);
            setIsAIChatEnabled(commands.getCommands().some(c => c.id === 'ai.chat.open'));

            invoke<any>('get_native_extensions').then(native => {
                if (native && native.sidebar_items) {
                    setNativeSidebarItems(native.sidebar_items);
                }
            }).catch(() => {});

            forceUpdate();
        };

        let unlistenSidebar: any = null;
        listen('zyma:sidebar-updated', (e: any) => {
            setNativeSidebarItems(e.payload || []);
        }).then(u => unlistenSidebar = u);

        const unsubViews = views.subscribe(sync);
        const unsubAuth = authRegistry.subscribe(sync);
        const unsubCmds = commands.subscribe(sync);
        const unsubSlots = slotRegistry.subscribe(sync);
        sync();
        return () => {
            unsubViews();
            unsubAuth();
            unsubCmds();
            unsubSlots();
            if (unlistenSidebar) unlistenSidebar();
        };
    }, []);

    return { authProviders, activeViews, isAIChatEnabled, nativeSidebarItems };
}
