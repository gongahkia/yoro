import React from 'react';
import type { Note } from '../types';
import './styles/NoteCard.css';

interface NoteCardProps {
    note: Note;
    onClick: (id: string) => void;
    onDelete: (e: React.MouseEvent) => void;
    onDuplicate: (e: React.MouseEvent) => void;
    onRestore?: (e: React.MouseEvent) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete, onDuplicate, onRestore }) => {
    return (
        <div className="note-card" onClick={() => onClick(note.id)}>
            <div className="note-card-actions">
                {note.deletedAt ? (
                    <button className="action-btn" onClick={onRestore} title="Restore">
                        ref
                    </button>
                ) : (
                    <button className="action-btn" onClick={onDuplicate} title="Duplicate">
                        copy
                    </button>
                )}
                <button className="action-btn delete" onClick={onDelete} title={note.deletedAt ? "Delete Forever" : "Move to Bin"}>
                    {note.deletedAt ? 'kill' : 'del'}
                </button>
            </div>
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
                {new Date(note.updatedAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })}
            </div>
        </div>
    );
};
