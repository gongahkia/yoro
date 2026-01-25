import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { keymap, highlightActiveLine } from '@codemirror/view';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
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
import { focusModeExtension } from '../extensions/focus-mode';
import type { Note } from '../types';
import './styles/Editor.css';

interface EditorProps {
    note: Note;
    onChange: (content: string) => void;
    onTitleChange: (title: string) => void;
    vimMode: boolean;
    focusMode: boolean;
}

export const Editor: React.FC<EditorProps> = ({ note, onChange, onTitleChange, vimMode, focusMode }) => {
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
                // Move cursor inside?
                const cursor = view.state.selection.main.head;
                view.dispatch({ selection: { anchor: cursor - 4 } });
            } else if (command === 'insert-horizontal-rule') {
                view.dispatch(view.state.replaceSelection('\n---\n'));
            }
        };

        window.addEventListener('yoro-editor-cmd' as any, handleCommand);
        return () => window.removeEventListener('yoro-editor-cmd' as any, handleCommand);
    }, []);

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
                        autocompletion({ override: [emojiCompletion] }),
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
