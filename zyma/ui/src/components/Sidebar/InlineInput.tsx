import React, { useState, useEffect, useRef } from 'react';
import { File, Folder } from 'lucide-react';

export interface InlineInputProps {
    initialValue: string;
    type: 'file' | 'dir' | 'rename';
    level: number;
    onSubmit: (val: string) => void;
    onCancel: () => void;
}

export const InlineInput: React.FC<InlineInputProps> = ({ 
    initialValue, 
    type, 
    level, 
    onSubmit, 
    onCancel 
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [val, setVal] = useState(initialValue);
    const isSubmitting = useRef(false);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            if (type === 'rename') {
                const lastDot = initialValue.lastIndexOf('.');
                inputRef.current.setSelectionRange(0, lastDot > 0 ? lastDot : initialValue.length);
            }
        }
    }, [type, initialValue]);

    const handleSubmit = () => {
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        onSubmit(val);
    };

    return (
        <div style={{
            display: 'flex', 
            alignItems: 'center', 
            padding: '3px 5px', 
            gap: '5px',
            paddingLeft: `${10 + level * 10}px`,
            backgroundColor: 'var(--bg-side)'
        }}>
            <span style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                {type === 'dir' ? <Folder size={14} /> : <File size={14} />}
            </span>
            <input
                ref={inputRef}
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancel();
                    }
                }}
                onBlur={() => {
                    setTimeout(() => {
                        if (!isSubmitting.current) {
                            handleSubmit();
                        }
                    }, 100);
                }}
                style={{
                    flex: 1, 
                    minWidth: 0, 
                    border: '1px solid var(--accent-color)',
                    backgroundColor: 'var(--bg-editor)', 
                    color: 'var(--text-primary)',
                    fontSize: 'var(--ui-font-size)', 
                    outline: 'none', 
                    padding: '1px 4px',
                    borderRadius: '2px'
                }}
            />
        </div>
    );
};
