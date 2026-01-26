import React, { useState, useRef, useEffect, useMemo } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import type { ChatMessage as IChatMessage, ChatMessagePart } from './types';
import { chatRegistry } from './Registry/ChatRegistry';
import type { ChatResponseStream } from './Registry/ChatRegistry';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface ChatPanelProps {
    getContext?: () => Promise<{
        filePath: string | null;
        selection: string | null;
        fileContent: string | null;
    }>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ getContext }) => {
    const [messages, setMessages] = useState<IChatMessage[]>([
        {
            id: 'welcome',
            role: 'agent',
            timestamp: Date.now(),
            parts: [{ type: 'markdown', content: 'Hello! I am Zyma Assistant. Install an AI extension to get started.' }]
        }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [, forceUpdate] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const participants = useMemo(() => chatRegistry.getParticipants(), [forceUpdate]);

    useEffect(() => {
        return chatRegistry.subscribe(() => forceUpdate(n => n + 1));
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (text: string) => {
        const participants = chatRegistry.getParticipants();
        if (participants.length === 0) {
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'agent',
                timestamp: Date.now(),
                parts: [{ type: 'markdown', content: 'No AI extension registered. Please install an extension like **shov-agent**.' }]
            }]);
            return;
        }

        // Simple routing: for now use the first participant
        const participant = participants[0];

        const userMsg: IChatMessage = {
            id: generateId(),
            role: 'user',
            timestamp: Date.now(),
            parts: [{ type: 'markdown', content: text }]
        };

        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        const agentMsgId = generateId();
        const initialAgentMsg: IChatMessage = {
            id: agentMsgId,
            role: 'agent',
            timestamp: Date.now(),
            parts: [],
            status: 'thinking'
        };
        setMessages(prev => [...prev, initialAgentMsg]);

        // Build request
        const ctx = getContext ? await getContext() : { filePath: null, selection: null, fileContent: null };
        
        // Extract history (convert complex parts to simple text for the agent)
        const history = messages.map(m => ({
            role: m.role,
            content: m.parts.filter(p => p.type === 'markdown').map(p => (p as any).content).join('\n')
        })).filter(h => h.content.trim() !== '');

        let command: string | undefined;
        let prompt = text;
        if (text.startsWith('/')) {
            const parts = text.split(' ');
            command = parts[0].substring(1);
            prompt = parts.slice(1).join(' ');
        }

        const stream: ChatResponseStream = {
            // ... (keep existing stream logic)
            markdown: (content) => {
                setMessages(prev => prev.map(m => m.id === agentMsgId ? {
                    ...m,
                    status: 'streaming',
                    parts: [...m.parts, { type: 'markdown', content }]
                } : m));
            },
            diff: (original, modified, language, path) => {
                setMessages(prev => prev.map(m => m.id === agentMsgId ? {
                    ...m,
                    parts: [...m.parts, { type: 'diff', original, modified, language, path }]
                } : m));
            },
            toolCall: (name, args, status, result) => {
                setMessages(prev => prev.map(m => m.id === agentMsgId ? {
                    ...m,
                    parts: [...m.parts, { type: 'tool_call', name, args, status, result }]
                } : m));
            },
            status: (type) => {
                setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, status: type } : m));
            },
            done: () => {
                setIsProcessing(false);
                setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, status: 'done' } : m));
            },
            error: (msg) => {
                setIsProcessing(false);
                setMessages(prev => prev.map(m => m.id === agentMsgId ? {
                    ...m,
                    status: 'error',
                    parts: [...m.parts, { type: 'markdown', content: `**Error**: ${msg}` }]
                } : m));
            }
        };

        try {
            await participant.handler({
                prompt,
                command,
                selection: ctx.selection || undefined,
                filePath: ctx.filePath || undefined,
                fileContent: ctx.fileContent || undefined,
                history
            }, stream);
        } catch (e) {
            stream.error(String(e));
        }
    };

    const handleClear = () => {
        setMessages([]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '10px' }}>
                {messages.map(msg => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <ChatInput 
                onSend={handleSend} 
                onClear={handleClear} 
                disabled={isProcessing} 
                suggestions={participants[0]?.commands?.map(c => ({ cmd: `/${c.name}`, desc: c.description }))}
            />
        </div>
    );
};

export default ChatPanel;