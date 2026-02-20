import React, { useState, useEffect, useRef, useMemo } from 'react';
import { showToast } from './Toast';
import { useSinglish } from '../contexts/SinglishContext';
import { useFocusTrap } from '../utils/useFocusTrap';
import './styles/CommandPalette.css';

export interface CommandParameter {
    name: string;
    type: 'number' | 'text' | 'select' | 'boolean';
    label: string;
    placeholder?: string;
    defaultValue?: string | number;
    min?: number;
    max?: number;
    options?: { value: string; label: string }[];
}

export interface CommandGroup {
    id: string;
    label: string;
}

export interface Command {
    id: string;
    label: string;
    shortcut?: string;
    action: (params?: Record<string, string | number | boolean>) => void;
    category?: string;
    context?: 'home' | 'editor' | 'global';
    groupId?: string;
    parameters?: CommandParameter[];
    isGroupHeader?: boolean;
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
    currentContext?: 'home' | 'editor' | 'global';
    commandGroups?: CommandGroup[];
    onOpenParameterModal?: (command: Command) => void;
    initialQuery?: string;
    onInitialQueryConsumed?: () => void;
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
    allTags = [],
    currentContext = 'global',
    commandGroups = [],
    onOpenParameterModal,
    initialQuery = '',
    onInitialQueryConsumed
}) => {
    const sl = useSinglish();
    const [query, setQuery] = useState(initialQuery);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const trapRef = useFocusTrap(isOpen);

    const isSearchMode = query.startsWith('/');

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    // Build hierarchical command list
    const displayItems = useMemo(() => {
        if (isSearchMode) return [];

        // Filter by context first
        const contextFilteredCommands = commands.filter(cmd =>
            !cmd.context || cmd.context === 'global' || cmd.context === currentContext
        );

        // When searching, bypass hierarchy - show matching commands directly
        if (query) {
            const lowerQuery = query.toLowerCase();
            return contextFilteredCommands
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
        }

        // No query - show hierarchical view
        const items: Command[] = [];

        // Add recent commands first
        const recent = recentCommandIds
            .map(id => contextFilteredCommands.find(c => c.id === id))
            .filter((c): c is Command => !!c);
        const uniqueRecent = Array.from(new Set(recent));
        const recentIds = new Set(uniqueRecent.map(c => c.id));
        items.push(...uniqueRecent);

        // Group remaining commands
        const groupedCommands = new Map<string, Command[]>();
        const ungroupedCommands: Command[] = [];

        contextFilteredCommands.forEach(cmd => {
            if (recentIds.has(cmd.id)) return; // Skip already added recent
            if (cmd.groupId) {
                if (!groupedCommands.has(cmd.groupId)) {
                    groupedCommands.set(cmd.groupId, []);
                }
                groupedCommands.get(cmd.groupId)!.push(cmd);
            } else {
                ungroupedCommands.push(cmd);
            }
        });

        // Add grouped commands with headers
        commandGroups.forEach(group => {
            const groupCmds = groupedCommands.get(group.id);
            if (groupCmds && groupCmds.length > 0) {
                // Add group header
                items.push({
                    id: `group-header-${group.id}`,
                    label: group.label,
                    action: () => toggleGroup(group.id),
                    isGroupHeader: true,
                    groupId: group.id
                });

                // Add children if expanded
                if (expandedGroups.has(group.id)) {
                    items.push(...groupCmds);
                }
            }
        });

        // Add ungrouped commands at the end
        items.push(...ungroupedCommands);

        return items;
    }, [commands, query, recentCommandIds, isSearchMode, currentContext, commandGroups, expandedGroups]);

    // For backwards compatibility
    const filteredCommands = displayItems;

    useEffect(() => {
        if (isOpen) {
            // Use setTimeout to ensure focus happens after render and avoid synchronous setState warnings
            const timer = setTimeout(() => {
                setQuery(initialQuery);
                setSelectedIndex(0);
                inputRef.current?.focus();
                // Notify parent that initial query was consumed
                if (initialQuery && onInitialQueryConsumed) {
                    onInitialQueryConsumed();
                }
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialQuery, onInitialQueryConsumed]);

    // Update global search query when in search mode
    useEffect(() => {
        if (isSearchMode && onSearchChange) {
            onSearchChange(query.slice(1));
        }
    }, [query, isSearchMode, onSearchChange]);

    const executeCommand = (cmd: Command) => {
        // Handle group headers
        if (cmd.isGroupHeader && cmd.groupId) {
            toggleGroup(cmd.groupId);
            return;
        }

        // Handle parameterized commands
        if (cmd.parameters && cmd.parameters.length > 0 && onOpenParameterModal) {
            onOpenParameterModal(cmd);
            onClose();
            return;
        }

        try {
            cmd.action();
        } catch (err) {
            showToast(
                sl ? `Command siao liao: ${err instanceof Error ? err.message : 'dunno what happen'}` : `Command failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                'error'
            );
        }
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
            <div className="command-palette-modal" onClick={e => e.stopPropagation()} ref={trapRef as React.RefObject<HTMLDivElement>}>
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
                        placeholder={isSearchMode ? "Search notes..." : (sl ? "Type command lah, or / to search notes..." : "Type a command (or / to search notes)...")}
                        aria-label="Search commands"
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
                                <li className="command-palette-empty">{sl ? 'No tags leh' : 'No tags found'}</li>
                            )}
                        </ul>
                    </div>
                ) : (
                    <ul className="command-palette-list" ref={listRef}>
                        {filteredCommands.map((cmd, index) => {
                            const isGroupHeader = cmd.isGroupHeader;
                            const isExpanded = cmd.groupId ? expandedGroups.has(cmd.groupId) : false;
                            const isChildOfGroup = !isGroupHeader && cmd.groupId && expandedGroups.has(cmd.groupId);

                            return (
                                <li
                                    key={cmd.id}
                                    className={`command-palette-item ${index === selectedIndex ? 'selected' : ''} ${isGroupHeader ? 'group-header' : ''} ${isChildOfGroup ? 'group-child' : ''}`}
                                    onClick={() => executeCommand(cmd)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    aria-selected={index === selectedIndex}
                                >
                                    {isGroupHeader ? (
                                        <div className="group-header-content">
                                            <span className="group-toggle">{isExpanded ? '▾' : '▸'}</span>
                                            <span className="group-label">{cmd.label}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="command-label">{cmd.label}</span>
                                            <span className="command-right">
                                                {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
                                                {cmd.parameters && cmd.parameters.length > 0 && (
                                                    <span className="command-params-hint">...</span>
                                                )}
                                            </span>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                        {filteredCommands.length === 0 && (
                            <li className="command-palette-empty">{sl ? 'No such command leh' : 'No commands found'}</li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
};
