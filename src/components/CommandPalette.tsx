import React, { useState, useEffect, useRef } from 'react';
import './styles/CommandPalette.css';

export interface Command {
    id: string;
    label: string;
    shortcut?: string;
    action: () => void;
    category?: string;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const filteredCommands = commands.filter(cmd => 
        cmd.label.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
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
                filteredCommands[selectedIndex].action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
                <div className="command-palette-search">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                    />
                </div>
                <ul className="command-palette-list" ref={listRef}>
                    {filteredCommands.map((cmd, index) => (
                        <li
                            key={cmd.id}
                            className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={() => {
                                cmd.action();
                                onClose();
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <span className="command-label">{cmd.label}</span>
                            {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
                        </li>
                    ))}
                    {filteredCommands.length === 0 && (
                        <li className="command-palette-empty">No commands found</li>
                    )}
                </ul>
            </div>
        </div>
    );
};
