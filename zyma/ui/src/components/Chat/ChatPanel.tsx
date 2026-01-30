import React, { useState, useRef, useEffect, useMemo } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { chatRegistry } from './Registry/ChatRegistry';
import { useChatLogic } from '../../hooks/useChatLogic';

interface ChatPanelProps {
    participantId?: string; 
    title?: string;
    getContext?: () => Promise<{
        filePath: string | null;
        selection: string | null;
        fileContent: string | null;
    }>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ participantId, title, getContext }) => {
    const { messages, isProcessing, handleSend, handleClear } = useChatLogic(participantId, getContext);
    const [, forceUpdate] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 订阅逻辑变更
    useEffect(() => {
        return chatRegistry.subscribe(() => forceUpdate(n => n + 1));
    }, []);

    // 智能滚动逻辑
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        
        const container = scrollContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom || isProcessing) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isProcessing]);

    const currentParticipant = useMemo(() => {
        const all = chatRegistry.getParticipants();
        return participantId ? all.find(p => p.id === participantId) : all[0];
    }, [participantId, forceUpdate]);

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            backgroundColor: 'var(--bg-editor)',
            color: 'var(--text-primary)',
            fontSize: 'var(--ui-font-size)' 
        }}>
            <div 
                ref={scrollContainerRef}
                style={{ flex: 1, overflowY: 'auto', padding: '15px 15px 10px 15px' }} 
                className="no-scrollbar"
            >
                {messages.map(msg => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <ChatInput 
                onSend={handleSend} 
                onClear={handleClear} 
                disabled={isProcessing} 
                suggestions={currentParticipant?.commands?.map(c => ({ cmd: `/${c.name}`, desc: c.description }))}
            />
        </div>
    );
};

export default ChatPanel;