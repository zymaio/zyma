import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, CaseSensitive, WholeWord, Regex } from 'lucide-react';
import './EditorSearch.css';

interface EditorSearchProps {
    visible: boolean;
    onClose: () => void;
    onSearch: (query: string, options: SearchOptions) => void;
    onNext: () => void;
    onPrev: () => void;
}

export interface SearchOptions {
    matchCase: boolean;
    wholeWord: boolean;
    useRegex: boolean;
}

const EditorSearch: React.FC<EditorSearchProps> = ({ visible, onClose, onSearch, onNext, onPrev }) => {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<SearchOptions>({
        matchCase: false,
        wholeWord: false,
        useRegex: false
    });
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (visible) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [visible]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const toggleOption = (key: keyof SearchOptions) => {
        const newOptions = { ...options, [key]: !options[key] };
        setOptions(newOptions);
        onSearch(query, newOptions);
    };

    if (!visible) return null;

    return (
        <div className="editor-search-container">
            <div className="search-row">
                <div className="search-input-wrapper">
                    <input
                        ref={inputRef}
                        className="search-input"
                        placeholder="Find"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            onSearch(e.target.value, options);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="search-options">
                        <button 
                            className={`option-btn ${options.matchCase ? 'active' : ''}`}
                            onClick={() => toggleOption('matchCase')}
                            title="Match Case"
                        >
                            <CaseSensitive size={16} />
                        </button>
                        <button 
                            className={`option-btn ${options.wholeWord ? 'active' : ''}`}
                            onClick={() => toggleOption('wholeWord')}
                            title="Match Whole Word"
                        >
                            <WholeWord size={16} />
                        </button>
                        <button 
                            className={`option-btn ${options.useRegex ? 'active' : ''}`}
                            onClick={() => toggleOption('useRegex')}
                            title="Use Regular Expression"
                        >
                            <Regex size={16} />
                        </button>
                    </div>
                </div>
                
                <div className="search-nav-buttons">
                    <button className="nav-btn" onClick={onPrev} title="Previous Match (Shift+Enter)">
                        <ChevronUp size={18} />
                    </button>
                    <button className="nav-btn" onClick={onNext} title="Next Match (Enter)">
                        <ChevronDown size={18} />
                    </button>
                    <button className="nav-btn close" onClick={onClose} title="Close (Escape)">
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditorSearch;
