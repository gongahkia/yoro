import React from 'react';
import type { Note } from '../types';
import './styles/NoteCard.css';

interface NoteCardProps {
    note: Note;
    onClick: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick }) => {
    return (
        <div className="note-card" onClick={() => onClick(note.id)}>
            <h3 className="note-title">{note.title || 'Untitled'}</h3>
            <p className="note-preview">
                {note.content.slice(0, 100).replace(/[#*`_]/g, '') || 'No content'}
            </p>
            <div className="note-tags">
                {note.tags.map(tag => (
                    <span key={tag} className="note-tag">#{tag}</span>
                ))}
            </div>
            <div className="note-meta">
                {new Date(note.updatedAt).toLocaleDateString()}
            </div>
        </div>
    );
};
