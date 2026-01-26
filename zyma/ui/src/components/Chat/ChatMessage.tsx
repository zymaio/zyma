import React, { useState } from 'react';
import { User, Bot, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ChatMessage as IChatMessage } from './types';
import MarkdownPart from './MessageParts/MarkdownPart';
import CodeDiffPart from './MessageParts/CodeDiffPart';

interface ChatMessageProps {
    message: IChatMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';
    const [showThought, setShowThought] = useState(false);
    
    // 状态样式映射
    const getStatusColor = () => {
        switch (message.status) {
            case 'error': return '#ef4444';
            case 'thinking':
            case 'streaming': return 'var(--accent-color)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            gap: '10px', 
            padding: '12px 15px', 
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: isUser ? 'rgba(0,0,0,0.015)' : 'transparent',
            opacity: message.status === 'thinking' ? 0.8 : 1
        }}>
            <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '6px', 
                backgroundColor: isUser ? 'var(--accent-color)' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
                marginTop: '2px'
            }}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '6px'
                }}>
                    <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-primary)' }}>
                        {isUser ? 'You' : 'Agent'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                
                {/* 状态指示器：模仿 VS Code 的 Progress */}
                {message.status && message.status !== 'done' && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '12px',
                        color: getStatusColor(),
                        marginBottom: '10px',
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        borderRadius: '4px',
                        width: 'fit-content'
                    }}>
                        {(message.status === 'thinking' || message.status === 'streaming') && 
                            <Loader2 size={12} className="animate-spin" />
                        }
                        <span>
                            {message.status === 'thinking' ? 'Thinking...' : 
                             message.status === 'streaming' ? 'Generating...' : 
                             message.status === 'error' ? 'Failed' : ''}
                        </span>
                    </div>
                )}

                <div className="message-content" style={{ lineHeight: '1.6' }}>
                    {message.parts.map((part, idx) => {
                        switch (part.type) {
                            case 'markdown':
                                return <MarkdownPart key={idx} content={part.content} />;
                            case 'diff':
                                return <CodeDiffPart 
                                    key={idx} 
                                    original={part.original} 
                                    modified={part.modified} 
                                    language={part.language} 
                                    path={part.path} 
                                />;
                            case 'tool_call':
                                return <div key={idx} style={{ 
                                    border: '1px solid var(--border-color)', 
                                    padding: '8px 12px', 
                                    borderRadius: '6px',
                                    margin: '8px 0',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: part.status === 'success' ? '#10b981' : '#f59e0b' }} />
                                    <span>Using tool: <b>{part.name}</b></span>
                                    {part.status === 'calling' && <Loader2 size={10} className="animate-spin" />}
                                </div>;
                            default:
                                return null;
                        }
                    })}
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;
