import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EditorView } from '@codemirror/view';
import { SearchCursor } from '@codemirror/search';
import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { StateEffect, StateField, type Extension } from '@codemirror/state';
import './styles/FindReplacePanel.css';

interface FindReplacePanelProps {
    isOpen: boolean;
    onClose: () => void;
    editorView: EditorView | null;
}

// State effects for search highlighting
const setSearchQuery = StateEffect.define<{ query: string; caseSensitive: boolean; regex: boolean }>();
const clearSearch = StateEffect.define<null>();

// Decorations for search matches
const searchMatchDecoration = Decoration.mark({ class: 'cm-search-match' });

// Create search highlight extension
export function createSearchHighlightExtension(): Extension {
    const searchState = StateField.define<{ query: string; caseSensitive: boolean; regex: boolean; currentIndex: number }>({
        create() {
            return { query: '', caseSensitive: false, regex: false, currentIndex: 0 };
        },
        update(value, tr) {
            for (const effect of tr.effects) {
                if (effect.is(setSearchQuery)) {
                    return { ...effect.value, currentIndex: value.currentIndex };
                }
                if (effect.is(clearSearch)) {
                    return { query: '', caseSensitive: false, regex: false, currentIndex: 0 };
                }
            }
            return value;
        }
    });

    const searchHighlightPlugin = ViewPlugin.fromClass(class {
        decorations: DecorationSet;
        searchState: { query: string; caseSensitive: boolean; regex: boolean; currentIndex: number };

        constructor(view: EditorView) {
            this.searchState = view.state.field(searchState);
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            const newState = update.state.field(searchState);
            if (newState.query !== this.searchState.query ||
                newState.caseSensitive !== this.searchState.caseSensitive ||
                newState.regex !== this.searchState.regex ||
                update.docChanged) {
                this.searchState = newState;
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const { query, caseSensitive, regex } = this.searchState;
            if (!query) return Decoration.none;

            const decorations: { from: number; to: number }[] = [];

            try {
                if (regex) {
                    const flags = caseSensitive ? 'g' : 'gi';
                    const re = new RegExp(query, flags);
                    const text = view.state.doc.toString();
                    let match;
                    while ((match = re.exec(text)) !== null) {
                        if (match[0].length === 0) break; // Prevent infinite loop on empty matches
                        decorations.push({ from: match.index, to: match.index + match[0].length });
                    }
                } else {
                    const searchQuery = caseSensitive ? query : query.toLowerCase();
                    const text = view.state.doc.toString();
                    const searchText = caseSensitive ? text : text.toLowerCase();
                    let pos = 0;
                    while ((pos = searchText.indexOf(searchQuery, pos)) !== -1) {
                        decorations.push({ from: pos, to: pos + query.length });
                        pos += query.length;
                    }
                }
            } catch {
                // Invalid regex, return no decorations
                return Decoration.none;
            }

            return Decoration.set(
                decorations.map(d => searchMatchDecoration.range(d.from, d.to)),
                true
            );
        }
    }, {
        decorations: v => v.decorations
    });

    return [searchState, searchHighlightPlugin];
}

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({ isOpen, onClose, editorView }) => {
    const [findValue, setFindValue] = useState('');
    const [replaceValue, setReplaceValue] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [matches, setMatches] = useState<{ from: number; to: number }[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const findInputRef = useRef<HTMLInputElement>(null);

    // Find all matches
    const findMatches = useCallback(() => {
        if (!editorView || !findValue) {
            setMatches([]);
            return [];
        }

        const results: { from: number; to: number }[] = [];

        try {
            if (useRegex) {
                const flags = caseSensitive ? 'g' : 'gi';
                const re = new RegExp(findValue, flags);
                const text = editorView.state.doc.toString();
                let match;
                while ((match = re.exec(text)) !== null) {
                    if (match[0].length === 0) break;
                    results.push({ from: match.index, to: match.index + match[0].length });
                }
            } else {
                const cursor = new SearchCursor(
                    editorView.state.doc,
                    findValue,
                    0,
                    editorView.state.doc.length,
                    caseSensitive ? (x) => x : (x) => x.toLowerCase()
                );
                while (!cursor.next().done) {
                    results.push({ from: cursor.value.from, to: cursor.value.to });
                }
            }
        } catch {
            // Invalid regex
        }

        setMatches(results);
        return results;
    }, [editorView, findValue, caseSensitive, useRegex]);

    // Update search highlighting (debounced 150ms)
    useEffect(() => {
        if (!editorView) return;

        const timer = setTimeout(() => {
            editorView.dispatch({
                effects: findValue
                    ? setSearchQuery.of({ query: findValue, caseSensitive, regex: useRegex })
                    : clearSearch.of(null)
            });

            const results = findMatches();
            if (results.length > 0 && currentMatchIndex >= results.length) {
                setCurrentMatchIndex(0);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [findValue, caseSensitive, useRegex, editorView, findMatches, currentMatchIndex]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen && findInputRef.current) {
            findInputRef.current.focus();
            findInputRef.current.select();
        }
    }, [isOpen]);

    // Clear search on close
    useEffect(() => {
        if (!isOpen && editorView) {
            editorView.dispatch({ effects: clearSearch.of(null) });
        }
    }, [isOpen, editorView]);

    // Navigate to match
    const goToMatch = useCallback((index: number) => {
        if (!editorView || matches.length === 0) return;

        const match = matches[index];
        editorView.dispatch({
            selection: { anchor: match.from, head: match.to },
            scrollIntoView: true
        });
        editorView.focus();
        setCurrentMatchIndex(index);
    }, [editorView, matches]);

    // Navigate to next/prev match
    const goToNextMatch = useCallback(() => {
        if (matches.length === 0) return;
        const nextIndex = (currentMatchIndex + 1) % matches.length;
        goToMatch(nextIndex);
    }, [currentMatchIndex, matches.length, goToMatch]);

    const goToPrevMatch = useCallback(() => {
        if (matches.length === 0) return;
        const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
        goToMatch(prevIndex);
    }, [currentMatchIndex, matches.length, goToMatch]);

    // Replace current match
    const replaceCurrentMatch = useCallback(() => {
        if (!editorView || matches.length === 0) return;

        const match = matches[currentMatchIndex];
        editorView.dispatch({
            changes: { from: match.from, to: match.to, insert: replaceValue }
        });

        // Re-find matches after replace
        setTimeout(() => {
            const newMatches = findMatches();
            if (newMatches.length > 0) {
                const newIndex = Math.min(currentMatchIndex, newMatches.length - 1);
                goToMatch(newIndex);
            }
        }, 0);
    }, [editorView, matches, currentMatchIndex, replaceValue, findMatches, goToMatch]);

    // Replace all matches
    const replaceAllMatches = useCallback(() => {
        if (!editorView || matches.length === 0) return;

        // Replace from end to beginning to preserve positions
        const changes = [...matches].reverse().map(match => ({
            from: match.from,
            to: match.to,
            insert: replaceValue
        }));

        editorView.dispatch({ changes });
        setMatches([]);
        setCurrentMatchIndex(0);
    }, [editorView, matches, replaceValue]);

    // Keyboard handlers
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            goToNextMatch();
        } else if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            goToPrevMatch();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="find-replace-panel" onKeyDown={handleKeyDown}>
            <div className="find-replace-header">
                <h4 className="find-replace-title">Find and Replace</h4>
                <button className="find-replace-close" onClick={onClose} title="Close (Escape)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="find-replace-row">
                <input
                    ref={findInputRef}
                    type="text"
                    className="find-replace-input"
                    placeholder="Find..."
                    value={findValue}
                    onChange={(e) => setFindValue(e.target.value)}
                    aria-label="Find"
                />
                <div className="find-replace-toggles">
                    <button
                        className={`find-replace-toggle ${caseSensitive ? 'active' : ''}`}
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        title="Match Case"
                    >
                        Aa
                    </button>
                    <button
                        className={`find-replace-toggle ${useRegex ? 'active' : ''}`}
                        onClick={() => setUseRegex(!useRegex)}
                        title="Use Regular Expression"
                    >
                        .*
                    </button>
                </div>
            </div>

            <div className="find-replace-row">
                <input
                    type="text"
                    className="find-replace-input"
                    placeholder="Replace..."
                    value={replaceValue}
                    onChange={(e) => setReplaceValue(e.target.value)}
                    aria-label="Replace"
                />
                <div className="find-replace-nav">
                    <button
                        className="find-replace-nav-btn"
                        onClick={goToPrevMatch}
                        disabled={matches.length === 0}
                        title="Previous Match (Shift+Enter)"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 15l-6-6-6 6" />
                        </svg>
                    </button>
                    <button
                        className="find-replace-nav-btn"
                        onClick={goToNextMatch}
                        disabled={matches.length === 0}
                        title="Next Match (Enter)"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="find-replace-row">
                <span className={`find-replace-match-count ${findValue && matches.length === 0 ? 'no-matches' : ''}`} aria-live="polite">
                    {findValue ? (
                        matches.length > 0
                            ? `${currentMatchIndex + 1} of ${matches.length}`
                            : 'No matches'
                    ) : (
                        '\u00A0'
                    )}
                </span>
            </div>

            <div className="find-replace-actions">
                <button
                    className="find-replace-btn"
                    onClick={replaceCurrentMatch}
                    disabled={matches.length === 0}
                >
                    Replace
                </button>
                <button
                    className="find-replace-btn primary"
                    onClick={replaceAllMatches}
                    disabled={matches.length === 0}
                >
                    Replace All
                </button>
            </div>
        </div>
    );
};
