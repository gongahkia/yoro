import React, { useMemo } from 'react';
import type { Note } from '../types';
import { useSinglish } from '../contexts/SinglishContext';
import './styles/BacklinksPanel.css';

interface BacklinksPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentNote: Note | null;
    notes: Note[];
    onNavigate: (noteId: string) => void;
}

interface Backlink {
    note: Note;
    lineNumber: number;
    lineContent: string;
    matchType: 'wikilink' | 'mention' | 'url';
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
    isOpen,
    onClose,
    currentNote,
    notes,
    onNavigate,
}) => {
    const sl = useSinglish();
    // Find all backlinks to the current note
    const backlinks = useMemo(() => {
        if (!currentNote) return [];

        const results: Backlink[] = [];
        const currentTitle = currentNote.title.toLowerCase();
        const currentId = currentNote.id;

        // Skip empty titles
        if (!currentTitle.trim()) return [];

        for (const note of notes) {
            // Don't include the current note itself
            if (note.id === currentId) continue;
            // Skip config note
            if (note.title === 'config.toml') continue;

            const lines = note.content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNumber = i + 1;

                // Check for wikilinks: [[Note Title]] or [[Note Title|alias]]
                const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
                let match;
                while ((match = wikilinkRegex.exec(line)) !== null) {
                    const linkedTitle = match[1].trim().toLowerCase();
                    if (linkedTitle === currentTitle) {
                        results.push({
                            note,
                            lineNumber,
                            lineContent: line.trim(),
                            matchType: 'wikilink',
                        });
                        break; // Only count one match per line
                    }
                }

                // Check for @mentions: @note-title or @"note title"
                const mentionRegex = /@(?:"([^"]+)"|(\S+))/g;
                while ((match = mentionRegex.exec(line)) !== null) {
                    const mentionedTitle = (match[1] || match[2]).trim().toLowerCase();
                    if (mentionedTitle === currentTitle) {
                        results.push({
                            note,
                            lineNumber,
                            lineContent: line.trim(),
                            matchType: 'mention',
                        });
                        break;
                    }
                }
            }
        }

        // Sort by note title
        results.sort((a, b) => a.note.title.localeCompare(b.note.title));

        return results;
    }, [currentNote, notes]);

    // Group backlinks by note
    const groupedBacklinks = useMemo(() => {
        const groups = new Map<string, Backlink[]>();

        for (const backlink of backlinks) {
            const existing = groups.get(backlink.note.id) || [];
            existing.push(backlink);
            groups.set(backlink.note.id, existing);
        }

        return Array.from(groups.values()).map(links => ({
            note: links[0].note,
            links,
        }));
    }, [backlinks]);

    const handleNavigate = (targetNoteId: string, lineNumber?: number) => {
        onNavigate(targetNoteId);
        onClose();

        // Scroll to line after navigation
        if (lineNumber) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('yoro-navigate-line', {
                    detail: { noteId: targetNoteId, lineNumber }
                }));
            }, 100);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="backlinks-panel">
            <div className="backlinks-header">
                <h3 className="backlinks-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Backlinks
                </h3>
                <button className="backlinks-close" onClick={onClose} title="Close" aria-label="Close backlinks panel">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="backlinks-content">
                {!currentNote ? (
                    <div className="backlinks-empty">
                        {sl ? 'No note selected leh' : 'No note selected'}
                    </div>
                ) : groupedBacklinks.length === 0 ? (
                    <div className="backlinks-empty">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6M12 15v1.5" />
                        </svg>
                        <span>{sl ? 'No backlinks leh' : 'No backlinks found'}</span>
                        <span className="backlinks-empty-hint">
                            {sl ? `Use [[${currentNote.title || 'note title'}]] to link here lah` : `Link to this note using [[${currentNote.title || 'note title'}]]`}
                        </span>
                    </div>
                ) : (
                    <div className="backlinks-list">
                        {groupedBacklinks.map(({ note, links }) => (
                            <div key={note.id} className="backlink-group">
                                <button
                                    className="backlink-note-title"
                                    onClick={() => handleNavigate(note.id)}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    {note.title || 'Untitled'}
                                    <span className="backlink-count">{links.length}</span>
                                </button>
                                <div className="backlink-references">
                                    {links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            className="backlink-reference"
                                            onClick={() => handleNavigate(note.id, link.lineNumber)}
                                        >
                                            <span className="backlink-line-number">
                                                {link.lineNumber}
                                            </span>
                                            <span className="backlink-line-content">
                                                {truncateContent(link.lineContent, 100)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="backlinks-footer">
                <span className="backlinks-stats">
                    {sl ? `${backlinks.length} ref from ${groupedBacklinks.length} note` : `${backlinks.length} reference${backlinks.length !== 1 ? 's' : ''} from ${groupedBacklinks.length} note${groupedBacklinks.length !== 1 ? 's' : ''}`}
                </span>
            </div>
        </div>
    );
};

function truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + '...';
}
