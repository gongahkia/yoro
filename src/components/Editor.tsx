import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { keymap, highlightActiveLine, EditorView } from '@codemirror/view';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { GFM, Subscript, Superscript, Strikethrough, Table, TaskList } from '@lezer/markdown';
import { autocompletion } from '@codemirror/autocomplete';
import { vim } from '@replit/codemirror-vim';
import { livePreview } from '../extensions/live-preview';
import { handleImageEvents } from '../extensions/images';
import { frontmatterFold } from '../extensions/frontmatter';
import { mathPreview } from '../extensions/math';
import { markdownPairs } from '../extensions/markdown-pairs';
import { footnoteTooltip } from '../extensions/footnotes';
import { FootnoteExtension } from '../extensions/markdown-footnotes';
import { textHighlight } from '../extensions/text-highlight';
import { callouts } from '../extensions/callouts';
import { emojiCompletion } from '../extensions/emojis';
import { createWikilinkPlugin, getWikilinkCompletion } from '../extensions/wikilinks';
import { focusModeExtension } from '../extensions/focus-mode';
import type { Note } from '../types';
import './styles/Editor.css';

interface EditorProps {
    note: Note;
    notes: Note[];
    onChange: (content: string) => void;
    onTitleChange: (title: string) => void;
    onNavigate: (noteId: string) => void;
    vimMode: boolean;
    focusMode: boolean;
    lineWrapping: boolean;
}

export const Editor: React.FC<EditorProps> = ({ note, notes, onChange, onTitleChange, onNavigate, vimMode, focusMode, lineWrapping }) => {
    const editorRef = React.useRef<any>(null);

    React.useEffect(() => {
        const handleCommand = (e: CustomEvent) => {
            if (!editorRef.current?.view) return;
            const view = editorRef.current.view;
            const { command } = e.detail;

            if (command === 'insert-table') {
                const tableTemplate = `
| Header 1 | Header 2 |
| :--- | :--- |
| Cell 1 | Cell 2 |
`;
                view.dispatch(view.state.replaceSelection(tableTemplate));
            } else if (command === 'insert-code-block') {
                const codeBlock = "```language\n\n```";
                view.dispatch(view.state.replaceSelection(codeBlock));
                const cursor = view.state.selection.main.head;
                view.dispatch({ selection: { anchor: cursor - 4 } });
            } else if (command === 'insert-horizontal-rule') {
                view.dispatch(view.state.replaceSelection('\n---\n'));
            } else if (command === 'hard-wrap') {
                // Basic hard wrap at 80 chars
                // Wraps current selection or current line
                const { from, to } = view.state.selection.main;
                let text = view.state.sliceDoc(from, to);
                if (from === to) {
                    // Select current line
                    const line = view.state.doc.lineAt(from);
                    text = line.text;
                    const wrapped = wrapText(text, 80);
                    view.dispatch({
                        changes: { from: line.from, to: line.to, insert: wrapped }
                    });
                } else {
                    const wrapped = wrapText(text, 80);
                    view.dispatch(view.state.replaceSelection(wrapped));
                }
            }
        };

        window.addEventListener('yoro-editor-cmd' as any, handleCommand);
        return () => window.removeEventListener('yoro-editor-cmd' as any, handleCommand);
    }, []);

    const wrapText = (text: string, width: number): string => {
        // Very basic wrapper preserving paragraphs
        return text.split('\n').map(line => {
            if (line.length <= width) return line;
            const words = line.split(' ');
            let currentLine = '';
            let result = '';
            
            words.forEach(word => {
                if ((currentLine + word).length > width) {
                    result += currentLine.trim() + '\n';
                    currentLine = '';
                }
                currentLine += word + ' ';
            });
            result += currentLine.trim();
            return result;
        }).join('\n');
    };

    return (
        <div className={`editor-container ${focusMode ? 'focus-mode' : ''}`}>
            <div className="editor-content">
                <input
                    type="text"
                    className="editor-title"
                    value={note.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Untitled"
                />
                <CodeMirror
                    ref={editorRef}
                    value={note.content}
                    height="100%"
                    extensions={[
                        vimMode ? vim() : [],
                        lineWrapping ? EditorView.lineWrapping : [],
                        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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
                        callouts,
                        autocompletion({ override: [emojiCompletion, getWikilinkCompletion(notes)] }),
                        createWikilinkPlugin(notes, onNavigate),
                        highlightActiveLine(),
                        focusMode ? focusModeExtension : [],
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
