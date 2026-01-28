import React, { useState, useRef, useEffect } from 'react';
import { Send, Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
    onSend: (text: string) => void;
    onClear: () => void;
    disabled?: boolean;
    suggestions?: { cmd: string, desc: string }[];
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onClear, disabled, suggestions = [] }) => {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (text.trim() && !disabled) {
            onSend(text);
            setText('');
            setShowSuggestions(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setText(val);
        setShowSuggestions(val.endsWith('/') && suggestions.length > 0);
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
        }
    }, [text]);

    return (
        <div style={{ padding: '10px', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
            {showSuggestions && (
                <div style={{ 
                    position: 'absolute', bottom: '100%', left: '10px', right: '10px',
                    backgroundColor: 'var(--bg-dropdown)', border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-main)', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden', zIndex: 100
                }}>
                    {suggestions.map((s, i) => (
                        <div 
                            key={i} 
                            onClick={() => { setText(text + s.cmd.substring(1) + ' '); setShowSuggestions(false); textareaRef.current?.focus(); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 'calc(var(--ui-font-size) - 1px)', borderBottom: i < suggestions.length-1 ? '1px solid var(--border-color)' : 'none' }}
                            className="file-item-hover"
                        >
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{s.cmd}</span>
                            <span style={{ marginLeft: '10px', opacity: 0.7 }}>{s.desc}</span>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--input-bg)', display: 'flex', flexDirection: 'column' }}>
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    disabled={disabled}
                    style={{
                        width: '100%', padding: '10px', border: 'none', background: 'transparent',
                        color: 'var(--text-primary)', resize: 'none', outline: 'none',
                        fontSize: 'var(--ui-font-size)', lineHeight: '1.5'
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px' }}>
                     <button onClick={onClear} title="Clear" style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }} className="icon-btn">
                        <Eraser size={16} />
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={!text.trim() || disabled}
                        style={{ 
                            background: text.trim() ? 'var(--accent-color)' : 'var(--active-bg)', 
                            color: text.trim() ? 'var(--accent-foreground)' : 'var(--text-muted)',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 12px',
                            fontWeight: 'bold', fontSize: 'calc(var(--ui-font-size) - 1px)'
                        }}
                    >
                        <Send size={14} style={{ marginRight: '6px' }} />
                        {t('Send', 'Send')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;