import React, { useState, useMemo, useEffect } from 'react';
import type { Note } from '../types';
import { NoteCard } from './NoteCard';
import './styles/NoteList.css';

interface NoteListProps {
    notes: Note[];
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    onDuplicateNote: (id: string, e: React.MouseEvent) => void;
    onRestoreNote?: (id: string, e: React.MouseEvent) => void;
}

export const NoteList: React.FC<NoteListProps> = ({ notes, onSelectNote, onDeleteNote, onDuplicateNote, onRestoreNote }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K to focus search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Slash to focus search (only if not already focused)
            if (e.key === '/' && document.activeElement !== searchInputRef.current) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        const handleOpenBin = () => setSelectedTag('bin');
        window.addEventListener('yoro-open-bin', handleOpenBin);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('yoro-open-bin', handleOpenBin);
        };
    }, []);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        let hasDeleted = false;
        notes.forEach(note => {
            if (note.deletedAt) {
                hasDeleted = true;
            } else {
                note.tags.forEach(tag => tags.add(tag));
            }
        });
        const sorted = Array.from(tags).sort();
        if (hasDeleted) {
            sorted.push('bin'); // Add phantom tag for bin
        }
        return sorted;
    }, [notes]);

    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            if (selectedTag === 'bin') {
                // Bin View: Only show deleted notes
                if (!note.deletedAt) return false;
            } else {
                // Normal View: Hide deleted notes
                if (note.deletedAt) return false;
            }

            const matchesSearch = (note.title + note.content).toLowerCase().includes(searchQuery.toLowerCase());
            // Filter by tag if selected and not 'bin' (bin is handled above as a mode)
            const matchesTag = (selectedTag && selectedTag !== 'bin') ? note.tags.includes(selectedTag) : true;

            return matchesSearch && matchesTag;
        });
    }, [notes, searchQuery, selectedTag]);

    return (
        <div className="note-list-container">
            <div className="note-list-header">
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="/ to search notes"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
                <div className="tags-filter">
                    <span
                        className={`filter-tag ${selectedTag === null ? 'active' : ''}`}
                        onClick={() => setSelectedTag(null)}
                    >
                        All
                    </span>
                    {allTags.map(tag => (
                        <span
                            key={tag}
                            className={`filter-tag ${selectedTag === tag ? 'active' : ''}`}
                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>

            <div className="notes-grid">
                {filteredNotes.length > 0 ? (
                    filteredNotes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onClick={onSelectNote}
                            onDelete={(e) => onDeleteNote(note.id, e)}
                            onDuplicate={(e) => onDuplicateNote(note.id, e)}
                            onRestore={(e) => onRestoreNote?.(note.id, e)}
                        />
                    ))
                ) : (
                    <div className="empty-state">No notes found</div>
                )}
            </div>
        </div>
    );
};
