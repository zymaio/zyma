/**
 * CommandRegistry 是 Zyma 的中枢神经。
 * 所有功能（保存、打开文件、插件动作）都应注册在此。
 */

export interface Command {
    id: string;
    title: string;
    category?: string;
    callback: (...args: any[]) => void | Promise<void>;
    description?: string;
    keybinding?: string; // 可选，后续由 KeybindingManager 统一管理
}

export class CommandRegistry {
    private static instance: CommandRegistry;
    private commands: Map<string, Command> = new Map();
    private listeners: (() => void)[] = [];

    private constructor() {}

    public static getInstance(): CommandRegistry {
        if (!CommandRegistry.instance) {
            CommandRegistry.instance = new CommandRegistry();
        }
        return CommandRegistry.instance;
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

    /**
     * 注册一个命令
     */
    registerCommand(command: Command): void {
        const existing = this.commands.get(command.id);
        if (existing && 
            existing.title === command.title && 
            existing.category === command.category && 
            existing.callback === command.callback && 
            existing.description === command.description && 
            existing.keybinding === command.keybinding) {
            return;
        }
        if (existing) {
            // console.warn(`Command ${command.id} is already registered. Overwriting.`);
        }
        this.commands.set(command.id, command);
        this.notify();
    }

    /**
     * 注销一个命令
     */
    unregisterCommand(id: string): void {
        if (this.commands.delete(id)) {
            this.notify();
        }
    }

    /**
     * 执行一个命令
     */
    async executeCommand(id: string, ...args: any[]): Promise<any> {
        const command = this.commands.get(id);
        if (!command) {
            console.error(`Command ${id} not found`);
            return;
        }
        try {
            return await command.callback(...args);
        } catch (error) {
            console.error(`Error executing command ${id}:`, error);
        }
    }

    /**
     * 获取所有可用命令（用于命令面板展示）
     */
    getCommands(): Command[] {
        return Array.from(this.commands.values());
    }
}

export const commands = CommandRegistry.getInstance();