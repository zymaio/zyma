import { useState, useCallback } from 'react';
import type { ChatMessage as IChatMessage } from '../components/Chat/types';
import { chatRegistry } from '../components/Chat/Registry/ChatRegistry';
import type { ChatResponseStream } from '../components/Chat/Registry/ChatRegistry';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useChatLogic(participantId?: string, getContext?: () => Promise<any>) {
    const [messages, setMessages] = useState<IChatMessage[]>([
        {
            id: 'welcome',
            role: 'agent',
            timestamp: Date.now(),
            parts: [{ type: 'markdown', content: `Hello! I am Zyma Assistant. How can I help you today?` }]
        }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSend = useCallback(async (text: string) => {
        const allParticipants = chatRegistry.getParticipants();
        const participant = participantId ? allParticipants.find(p => p.id === participantId) : allParticipants[0];

        if (!participant) {
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'agent',
                timestamp: Date.now(),
                parts: [{ type: 'markdown', content: `No handler found for **${participantId || 'default'}**. Please ensure the extension is enabled.` }]
            }]);
            return;
        }

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

        const ctx = getContext ? await getContext() : { filePath: null, selection: null, fileContent: null };
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
            markdown: (content) => {
                setMessages(prev => prev.map(m => {
                    if (m.id !== agentMsgId) return m;
                    const newParts = [...m.parts];
                    const lastPart = newParts[newParts.length - 1];
                    if (lastPart && lastPart.type === 'markdown') {
                        newParts[newParts.length - 1] = { ...lastPart, content: lastPart.content + content };
                    } else {
                        newParts.push({ type: 'markdown', content });
                    }
                    return { ...m, status: 'streaming', parts: newParts };
                }));
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
    }, [participantId, getContext, messages]);

    const handleClear = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        setMessages,
        isProcessing,
        handleSend,
        handleClear
    };
}
