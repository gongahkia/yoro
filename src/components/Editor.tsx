import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
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
                <CodeMirror
                    value={note.content}
                    height="100%"
                    extensions={[markdown()]}
                    onChange={onChange}
                    className="editor-cm-wrapper"
                    basicSetup={{
                        lineNumbers: false,
                        foldGutter: false,
                    }}
                />
            </div>
        </div>
    );
};
