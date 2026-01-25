import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { keymap } from '@codemirror/view';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { GFM, Subscript, Superscript, Strikethrough, Table, TaskList } from '@lezer/markdown';
import { livePreview } from '../extensions/live-preview';
import { handleImageEvents } from '../extensions/images';
import { frontmatterFold } from '../extensions/frontmatter';
import { mathPreview } from '../extensions/math';
import { markdownPairs } from '../extensions/markdown-pairs';
import { footnoteTooltip } from '../extensions/footnotes';
import { FootnoteExtension } from '../extensions/markdown-footnotes';
import { textHighlight } from '../extensions/text-highlight';
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
                    extensions={[
                        yamlFrontmatter({
                            content: markdown({
                                base: markdownLanguage,
                                codeLanguages: languages,
                                extensions: [GFM, Subscript, Superscript, Strikethrough, Table, TaskList, FootnoteExtension]
                            })
                        }),
                        livePreview,
                        handleImageEvents,
                        frontmatterFold,
                        mathPreview,
                        markdownPairs,
                        footnoteTooltip,
                        textHighlight,
                        keymap.of(markdownKeymap)
                    ]}
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
