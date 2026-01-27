export interface AuthProvider {
    id: string;
    label: string;
    accountName?: string;
    onLogin: () => Promise<void>;
    onLogout: () => Promise<void>;
}

export class AuthRegistry {
    private static instance: AuthRegistry;
    private providers: Map<string, AuthProvider> = new Map();
    private listeners: (() => void)[] = [];

    private constructor() {}

    public static get(): AuthRegistry {
        if (!AuthRegistry.instance) AuthRegistry.instance = new AuthRegistry();
        return AuthRegistry.instance;
    }

    subscribe(l: () => void) {
        this.listeners.push(l);
        return () => { this.listeners = this.listeners.filter(x => x !== l); };
    }

    registerProvider(p: AuthProvider) {
        const existing = this.providers.get(p.id);
        if (existing && 
            existing.label === p.label && 
            existing.accountName === p.accountName && 
            existing.onLogin === p.onLogin && 
            existing.onLogout === p.onLogout) {
            return;
        }
        this.providers.set(p.id, p);
        this.notify();
    }

    unregisterProvider(id: string) {
        this.providers.delete(id);
        this.notify();
    }

    getProviders() {
        return Array.from(this.providers.values());
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

export const authRegistry = AuthRegistry.get();
