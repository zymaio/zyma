import React, { useState, useEffect, useRef } from 'react';
import { commands } from './CommandRegistry';
import type { Command } from './CommandRegistry';
import './CommandPalette.css';

interface CommandPaletteProps {
    visible: boolean;
    onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ visible, onClose }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);

    useEffect(() => {
        if (visible) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
            setFilteredCommands(commands.getCommands());
        }
    }, [visible]);

    useEffect(() => {
        const all = commands.getCommands();
        const filtered = all.filter(cmd => 
            cmd.title.toLowerCase().includes(query.toLowerCase()) ||
            cmd.category?.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredCommands(filtered);
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                execute(filteredCommands[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const execute = (cmd: Command) => {
        commands.executeCommand(cmd.id);
        onClose();
    };

    if (!visible) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette-container" onClick={e => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    className="command-palette-input"
                    placeholder="Type a command to run..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <div className="command-palette-list">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((cmd, index) => (
                            <div
                                key={cmd.id}
                                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => execute(cmd)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className="command-category">{cmd.category}: </span>
                                <span className="command-title">{cmd.title}</span>
                                <span className="command-id">{cmd.id}</span>
                            </div>
                        ))
                    ) : (
                        <div className="command-palette-no-results">No matching commands found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
