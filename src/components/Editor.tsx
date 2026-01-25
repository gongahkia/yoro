import React from 'react';
import { useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { keymap, highlightActiveLine, EditorView } from '@codemirror/view';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { GFM, Subscript, Superscript, Strikethrough, Table, TaskList } from '@lezer/markdown';
import { autocompletion } from '@codemirror/autocomplete';
import { vim, Vim } from '@replit/codemirror-vim';
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
import './styles/EditorThemeOverrides.css';

interface EditorProps {
    note: Note;
    notes: Note[];
    onChange: (content: string) => void;
    onTitleChange: (title: string) => void;
    onNavigate: (noteId: string) => void;
    vimMode: boolean;
    focusMode: boolean;
    lineWrapping: boolean;
    showLineNumbers: boolean;
    editorAlignment: 'left' | 'center' | 'right';
}

export const Editor: React.FC<EditorProps> = ({ note, notes, onChange, onTitleChange, onNavigate, vimMode, focusMode, lineWrapping, showLineNumbers, editorAlignment }) => {
    const editorRef = React.useRef<any>(null);
    const navigate = useNavigate();

    React.useEffect(() => {
        if (vimMode) {
            // Define :q, :wq, :x to navigate home
            const goHome = () => navigate('/');
            Vim.defineEx('q', 'q', goHome);
            Vim.defineEx('wq', 'wq', goHome);
            Vim.defineEx('x', 'x', goHome);
        }
    }, [vimMode, navigate]);

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
            } else if (['bold', 'italic', 'strikethrough', 'code', 'link', 'blockquote', 'list-ul', 'list-ol', 'checklist', 'h1', 'h2', 'h3'].includes(command)) {
                handleFormatting(view, command);
            }
        };

        window.addEventListener('yoro-editor-cmd' as any, handleCommand);
        return () => window.removeEventListener('yoro-editor-cmd' as any, handleCommand);
    }, []);

    const handleFormatting = (view: any, type: string) => {
        const { from, to } = view.state.selection.main;
        const text = view.state.sliceDoc(from, to);
        let insert = text;
        let setSelection = false;
        let selectionOffset = 0;

        switch (type) {
            case 'bold':
                insert = `**${text}**`;
                selectionOffset = 2;
                break;
            case 'italic':
                insert = `*${text}*`;
                selectionOffset = 1;
                break;
            case 'strikethrough':
                insert = `~~${text}~~`;
                selectionOffset = 2;
                break;
            case 'code':
                insert = `\`${text}\``;
                selectionOffset = 1;
                break;
            case 'link':
                insert = `[${text}](url)`;
                selectionOffset = 1; // Position cursor inside brackets if empty, or at url? Let's just wrap.
                break;
            case 'blockquote':
                insert = `> ${text}`;
                break;
            case 'list-ul':
                insert = `- ${text}`;
                break;
            case 'list-ol':
                insert = `1. ${text}`;
                break;
            case 'checklist':
                insert = `- [ ] ${text}`;
                break;
            case 'h1':
                insert = `# ${text}`;
                break;
            case 'h2':
                insert = `## ${text}`;
                break;
            case 'h3':
                insert = `### ${text}`;
                break;
        }

        view.dispatch(view.state.replaceSelection(insert));

        // If no text was selected, place cursor inside the markers
        if (from === to && selectionOffset > 0) {
            const newPos = from + selectionOffset;
            view.dispatch({ selection: { anchor: newPos } });
        }
    };

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

    const handleContainerClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('editor-content')) {
            editorRef.current?.view?.focus();
        }
    };

    return (
        <div
            className={`editor-container ${focusMode ? 'focus-mode' : ''} editor-align-${editorAlignment}`}
            onClick={handleContainerClick}
        >
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
                        lineNumbers: showLineNumbers,
                        foldGutter: false,
                    }}
                />
            </div>
        </div>
    );
};
