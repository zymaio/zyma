export interface ChatRequest {
    prompt: string;
    command?: string;
    selection?: string;
    filePath?: string;
    fileContent?: string;
    history: { role: 'user' | 'agent', content: string }[];
}

export interface ChatResponseStream {
    markdown: (content: string) => void;
    diff: (original: string, modified: string, language: string, path?: string) => void;
    toolCall: (name: string, args: any, status: 'calling' | 'success' | 'error', result?: string) => void;
    done: () => void;
    error: (msg: string) => void;
}

export type ChatHandler = (request: ChatRequest, stream: ChatResponseStream) => Promise<void>;

export interface ChatParticipant {
    id: string;
    name: string;
    fullName: string;
    description?: string;
    icon?: string;
    commands?: { name: string, description: string }[];
    handler: ChatHandler;
}

export class ChatRegistry {
    private static instance: ChatRegistry;
    private participants: Map<string, ChatParticipant> = new Map();
    private listeners: (() => void)[] = [];

    private constructor() {}

    public static get(): ChatRegistry {
        if (!ChatRegistry.instance) {
            ChatRegistry.instance = new ChatRegistry();
        }
        return ChatRegistry.instance;
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    registerParticipant(participant: ChatParticipant) {
        this.participants.set(participant.id, participant);
        this.notify();
    }

    unregisterParticipant(id: string) {
        this.participants.delete(id);
        this.notify();
    }

    getParticipants(): ChatParticipant[] {
        return Array.from(this.participants.values());
    }

    getParticipant(id: string): ChatParticipant | undefined {
        return this.participants.get(id);
    }
}

export const chatRegistry = ChatRegistry.get();
