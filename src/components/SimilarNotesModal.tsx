import React from 'react';
import { Note } from '../types';
import { SearchResult } from '../utils/similarity';
import './styles/SimilarNotesModal.css';

interface SimilarNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: SearchResult[];
    onLink: (note: Note) => void;
}

export const SimilarNotesModal: React.FC<SimilarNotesModalProps> = ({ isOpen, onClose, results, onLink }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content similar-notes-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Similar Notes</h3>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {results.length === 0 ? (
                        <p className="no-results">No similar notes found.</p>
                    ) : (
                        <ul className="similar-notes-list">
                            {results.map(({ note, score }) => (
                                <li key={note.id} className="similar-note-item">
                                    <div className="similar-note-info">
                                        <span className="similar-note-title">{note.title || 'Untitled'}</span>
                                        <span className="similar-note-score">{Math.round(score * 100)}% match</span>
                                    </div>
                                    <button onClick={() => onLink(note)}>Link</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
