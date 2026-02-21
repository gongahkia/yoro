import React from 'react';
import type { Note } from '../types';
import { useSinglish } from '../contexts/SinglishContext';
import './styles/NoteCard.css';

interface NoteCardProps {
    note: Note;
    onClick: (id: string) => void;
    onDelete: (e: React.MouseEvent) => void;
    onDuplicate: (e: React.MouseEvent) => void;
    onPin?: (e: React.MouseEvent) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete, onDuplicate, onPin }) => {
    const sl = useSinglish();
    const cardStyle: React.CSSProperties = note.accentColor
        ? { borderTopColor: note.accentColor, borderTopWidth: 3 }
        : {};

    return (
        <div className={`note-card${note.isPinned ? ' pinned' : ''}`} style={cardStyle} onClick={() => onClick(note.id)}>
            {note.isPinned && <span className="pin-indicator" aria-label="Pinned" title="Pinned">📌</span>}
            <div className="note-card-actions">
                {onPin && (
                    <button
                        className={`action-btn pin${note.isPinned ? ' active' : ''}`}
                        onClick={onPin}
                        title={note.isPinned ? (sl ? 'Unpin lah' : 'Unpin') : (sl ? 'Pin lah' : 'Pin')}
                    >
                        {note.isPinned ? 'unpin' : 'pin'}
                    </button>
                )}
                <button className="action-btn" onClick={onDuplicate} title={sl ? 'Copy lah' : 'Duplicate'}>copy</button>
                <button className="action-btn delete" onClick={onDelete} title={sl ? 'Delete lah' : 'Delete'}>del</button>
            </div>
            <h3 className="note-title">
                {note.icon && <span className="note-icon" aria-hidden="true">{note.icon} </span>}
                {note.title || (sl ? 'No title' : 'Untitled')}
            </h3>
            <p className="note-preview">
                {note.content.slice(0, 100).replace(/[#*`_]/g, '') || (sl ? 'Nothing here leh' : 'No content')}
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
