export interface MarkdownPart {
    type: 'markdown';
    content: string;
}

export interface CodeDiffPart {
    type: 'diff';
    original: string;
    modified: string;
    language: string;
    path?: string;
}

export interface ToolCallPart {
    type: 'tool_call';
    name: string;
    args: any;
    status: 'calling' | 'success' | 'error';
    result?: string;
}

export type ChatMessagePart = MarkdownPart | CodeDiffPart | ToolCallPart;

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    parts: ChatMessagePart[];
    timestamp: number;
    status?: 'thinking' | 'streaming' | 'done' | 'error';
}
