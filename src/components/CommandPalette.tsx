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
    recentCommandIds?: string[];
    onCommandExecuted?: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands, recentCommandIds = [], onCommandExecuted }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const filteredCommands = React.useMemo(() => {
        if (!query) {
            // Show recent commands first, then the rest
            const recent = recentCommandIds
                .map(id => commands.find(c => c.id === id))
                .filter((c): c is Command => !!c);
            
            // Deduplicate: Filter out recent commands from the main list if desired, 
            // or just show them at the top. 
            // Let's just show recent at top, then all commands. 
            // To avoid visual duplicates if the list is short, we could filter.
            // But having a dedicated "Recent" section logic is complex without section headers.
            // Let's just prepend recent ones.
            const uniqueRecent = Array.from(new Set(recent));
            const recentIds = new Set(uniqueRecent.map(c => c.id));
            
            const others = commands.filter(c => !recentIds.has(c.id));
            return [...uniqueRecent, ...others];
        }
        
        const lowerQuery = query.toLowerCase();
        return commands
            .map(cmd => {
                const label = cmd.label.toLowerCase();
                let score = 0;
                let qIdx = 0;
                let lIdx = 0;
                
                // Simple subsequence matching
                while (qIdx < lowerQuery.length && lIdx < label.length) {
                    if (lowerQuery[qIdx] === label[lIdx]) {
                        score += 10; // Match
                        // Bonus for consecutive matches? 
                        // Bonus for start of word?
                        if (lIdx === 0 || label[lIdx - 1] === ' ') score += 5;
                        qIdx++;
                    } else {
                        score -= 1; // Penalty for gap
                    }
                    lIdx++;
                }
                
                // If we didn't match the whole query, reject
                if (qIdx < lowerQuery.length) return null;
                
                // Adjust score by length difference (penalty for long unused strings)
                score -= (label.length - lowerQuery.length) * 0.1;

                return { cmd, score };
            })
            .filter((item): item is { cmd: Command, score: number } => item !== null)
            .sort((a, b) => b.score - a.score)
            .map(item => item.cmd);
    }, [commands, query, recentCommandIds]);

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

    const executeCommand = (cmd: Command) => {
        cmd.action();
        onCommandExecuted?.(cmd.id);
        onClose();
    };

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
                executeCommand(filteredCommands[selectedIndex]);
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
                            onClick={() => executeCommand(cmd)}
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
