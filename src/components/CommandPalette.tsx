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
    onSearchChange?: (query: string) => void;
    selectedTag?: string | null;
    onTagSelect?: (tag: string | null) => void;
    allTags?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    commands,
    recentCommandIds = [],
    onCommandExecuted,
    onSearchChange,
    selectedTag,
    onTagSelect,
    allTags = []
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const isSearchMode = query.startsWith('/');

    const filteredCommands = React.useMemo(() => {
        if (isSearchMode) return [];

        if (!query) {
            const recent = recentCommandIds
                .map(id => commands.find(c => c.id === id))
                .filter((c): c is Command => !!c);

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

                while (qIdx < lowerQuery.length && lIdx < label.length) {
                    if (lowerQuery[qIdx] === label[lIdx]) {
                        score += 10;
                        if (lIdx === 0 || label[lIdx - 1] === ' ') score += 5;
                        qIdx++;
                    } else {
                        score -= 1;
                    }
                    lIdx++;
                }

                if (qIdx < lowerQuery.length) return null;

                score -= (label.length - lowerQuery.length) * 0.1;

                return { cmd, score };
            })
            .filter((item): item is { cmd: Command, score: number } => item !== null)
            .sort((a, b) => b.score - a.score)
            .map(item => item.cmd);
    }, [commands, query, recentCommandIds, isSearchMode]);

    useEffect(() => {
        if (isOpen) {
            // Use setTimeout to ensure focus happens after render and avoid synchronous setState warnings
            const timer = setTimeout(() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Update global search query when in search mode
    useEffect(() => {
        if (isSearchMode && onSearchChange) {
            onSearchChange(query.slice(1));
        }
    }, [query, isSearchMode, onSearchChange]);

    const executeCommand = (cmd: Command) => {
        cmd.action();
        onCommandExecuted?.(cmd.id);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isSearchMode) {
            const totalOptions = 1 + allTags.length;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % totalOptions);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + totalOptions) % totalOptions);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (onTagSelect) {
                    if (selectedIndex === 0) onTagSelect(null);
                    else onTagSelect(allTags[selectedIndex - 1]);
                }
                onClose();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // Revert from search mode to default command mode
                setQuery('');
                if (onSearchChange) onSearchChange('');
            }
        } else {
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
                        onChange={e => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={isSearchMode ? "Search notes..." : "Type a command (or / to search notes)..."}
                    />
                </div>
                {isSearchMode ? (
                    <div className="command-palette-tags">
                        <div className="command-palette-tags-label">Filter by tag</div>
                        <ul className="command-palette-list" ref={listRef}>
                            <li
                                className={`command-palette-item ${selectedIndex === 0 ? 'selected' : ''}`}
                                onClick={() => {
                                    if (onTagSelect) onTagSelect(null);
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(0)}
                            >
                                <span className="tag-label">All</span>
                                {selectedTag === null && <span className="tag-active">Active</span>}
                            </li>
                            {allTags.map((tag, index) => (
                                <li
                                    key={tag}
                                    className={`command-palette-item ${selectedIndex === index + 1 ? 'selected' : ''}`}
                                    onClick={() => {
                                        if (onTagSelect) onTagSelect(tag);
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index + 1)}
                                >
                                    <span className="tag-label">#{tag}</span>
                                    {selectedTag === tag && <span className="tag-active">Active</span>}
                                </li>
                            ))}
                            {allTags.length === 0 && (
                                <li className="command-palette-empty">No tags found</li>
                            )}
                        </ul>
                    </div>
                ) : (
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
                )}
            </div>
        </div>
    );
};
