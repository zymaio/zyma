import React from 'react';
import { User, Bot, Loader2 } from 'lucide-react';
import type { ChatMessage as IChatMessage } from './types';
import MarkdownPart from './MessageParts/MarkdownPart';
import CodeDiffPart from './MessageParts/CodeDiffPart';

interface ChatMessageProps {
    message: IChatMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';
    
    // 状态样式映射
    const getStatusColor = () => {
        switch (message.status) {
            case 'error': return 'var(--status-error)';
            case 'thinking':
            case 'streaming': return 'var(--accent-color)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '20px',
            opacity: message.status === 'thinking' ? 0.8 : 1,
            flexDirection: isUser ? 'row-reverse' : 'row'
        }}>
            <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%', 
                backgroundColor: isUser ? 'var(--user-bubble-bg)' : 'var(--ai-bubble-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isUser ? '#fff' : 'var(--text-primary)',
                flexShrink: 0,
                marginTop: '4px',
                border: '1px solid var(--border-color)'
            }}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div style={{ 
                flex: 1, 
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                overflow: 'hidden' 
            }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '4px',
                    padding: '0 4px'
                }}>
                    <span style={{ fontWeight: '600', fontSize: 'var(--ui-font-size)', color: 'var(--text-secondary)' }}>
                        {isUser ? 'You' : 'Agent'}
                    </span>
                    <span style={{ fontSize: 'calc(var(--ui-font-size) - 1px)', color: 'var(--text-muted)' }}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                
                <div className={`message-bubble ${isUser ? 'is-user' : ''}`} style={{ 
                    padding: '10px 14px',
                    borderRadius: '12px',
                    borderTopLeftRadius: isUser ? '12px' : '2px',
                    borderTopRightRadius: isUser ? '2px' : '12px',
                    backgroundColor: isUser ? 'var(--user-bubble-bg)' : 'var(--ai-bubble-bg)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-color)',
                    width: 'fit-content',
                    maxWidth: '95%',
                    lineHeight: '1.6',
                    userSelect: 'text' // 显式允许文本选择
                }}>
                    {/* 状态指示器 */}
                    {message.status && message.status !== 'done' && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            fontSize: 'var(--ui-font-size)',
                            color: getStatusColor(),
                            marginBottom: '8px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            borderRadius: '4px',
                            width: 'fit-content'
                        }}>
                            {(message.status === 'thinking' || message.status === 'streaming') && 
                                <Loader2 size={11} className="animate-spin" />
                            }
                            <span>
                                {message.status === 'thinking' ? 'Thinking...' : 
                                 message.status === 'streaming' ? 'Generating...' : 
                                 message.status === 'error' ? 'Failed' : ''}
                            </span>
                        </div>
                    )}

                    <div className="message-content" style={{ fontSize: 'inherit' }}>
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
                                        fontSize: 'var(--ui-font-size)',
                                        backgroundColor: 'var(--active-bg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: 'var(--text-primary)'
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: part.status === 'success' ? 'var(--status-success)' : 'var(--status-warning)' }} />
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
        </div>
    );
};

export default ChatMessage;
