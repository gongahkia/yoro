import React, { useState, useMemo } from 'react';
import { Note } from '../types';
import { NoteCard } from './NoteCard';
import './styles/NoteList.css';

interface NoteListProps {
    notes: Note[];
    onSelectNote: (id: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({ notes, onSelectNote }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        notes.forEach(note => note.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }, [notes]);

    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesSearch = (note.title + note.content).toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
            return matchesSearch && matchesTag;
        });
    }, [notes, searchQuery, selectedTag]);

    return (
        <div className="note-list-container">
            <div className="note-list-header">
                <input
                    type="text"
                    placeholder="Search notes..."
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
                        <NoteCard key={note.id} note={note} onClick={onSelectNote} />
                    ))
                ) : (
                    <div className="empty-state">No notes found</div>
                )}
            </div>
        </div>
    );
};
