import React from 'react';
import type { Note } from '../types';
import './styles/Editor.css';

interface EditorProps {
    note: Note;
    onChange: (content: string) => void;
    onTitleChange: (title: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ note, onChange, onTitleChange }) => {
    return (
        <div className="editor-container">
            <div className="editor-content">
                <input
                    type="text"
                    className="editor-title"
                    value={note.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Untitled"
                />
                <textarea
                    className="editor-textarea"
                    value={note.content}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Start writing..."
                    spellCheck={false}
                />
            </div>
        </div>
    );
};
