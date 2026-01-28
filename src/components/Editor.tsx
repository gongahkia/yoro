import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { keymap, highlightActiveLine, EditorView } from '@codemirror/view';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
import { themeSyntaxHighlighting } from '../extensions/theme-highlighting';
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
import { createWikilinkPlugin, getWikilinkCompletion, getMentionCompletion } from '../extensions/wikilinks';
import { focusModeExtension } from '../extensions/focus-mode';
import { inlineCode } from '../extensions/inline-code';
import { mermaidPreview } from '../extensions/mermaid';
import { tablePreview } from '../extensions/table-preview';
import { emacsMode as emacsModeExtension } from '../extensions/emacs-mode';
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
    emacsMode: boolean;
    focusMode: boolean;
    lineWrapping: boolean;
    showLineNumbers: boolean;
    editorAlignment: 'left' | 'center' | 'right';
}

export const Editor: React.FC<EditorProps> = ({ note, notes, onChange, onTitleChange, onNavigate, vimMode, emacsMode, focusMode, lineWrapping, showLineNumbers, editorAlignment }) => {
    const editorRef = React.useRef<ReactCodeMirrorRef>(null);
    const navigate = useNavigate();

    const handleFormatting = useCallback((view: EditorView, type: string) => {
        const { from, to } = view.state.selection.main;
        const text = view.state.sliceDoc(from, to);
        let insert = text;
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
                selectionOffset = 1; 
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

        if (from === to && selectionOffset > 0) {
            const newPos = from + selectionOffset;
            view.dispatch({ selection: { anchor: newPos } });
        }
    }, []);

    const wrapText = useCallback((text: string, width: number): string => {
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
    }, []);

    React.useEffect(() => {
        if (vimMode) {
            const goHome = () => navigate('/');
            Vim.defineEx('q', 'q', goHome);
            Vim.defineEx('wq', 'wq', goHome);
            Vim.defineEx('x', 'x', goHome);
        }
    }, [vimMode, navigate]);

    React.useEffect(() => {
        if (editorRef.current?.view) {
            const view = editorRef.current.view;
            view.focus();
            view.dispatch({
                selection: { anchor: 0, head: 0 },
                scrollIntoView: true
            });
        }
    }, [note.id]);

    React.useEffect(() => {
        const handleCommand = (e: CustomEvent) => {
            if (!editorRef.current?.view) return;
            const view = editorRef.current.view;
            const { command } = e.detail;

            if (command === 'insert-table') {
                const rows = e.detail.rows || 3;
                const cols = e.detail.cols || 2;
                const generateTable = (r: number, c: number) => {
                    const header = '| ' + Array(c).fill('Header').map((h, i) => `${h} ${i + 1}`).join(' | ') + ' |';
                    const separator = '| ' + Array(c).fill(':---').join(' | ') + ' |';
                    const dataRows = Array(r - 1).fill(null).map((_, ri) =>
                        '| ' + Array(c).fill('Cell').map((_, ci) => `Cell ${ri + 1}-${ci + 1}`).join(' | ') + ' |'
                    );
                    return [header, separator, ...dataRows].join('\n');
                };
                const tableTemplate = '\n' + generateTable(rows, cols) + '\n';
                view.dispatch(view.state.replaceSelection(tableTemplate));
            } else if (command === 'insert-code-block') {
                const codeBlock = "```language\n\n```";
                view.dispatch(view.state.replaceSelection(codeBlock));
                const cursor = view.state.selection.main.head;
                view.dispatch({ selection: { anchor: cursor - 4 } });
            } else if (command === 'insert-horizontal-rule') {
                view.dispatch(view.state.replaceSelection('\n---\n'));
            } else if (command === 'hard-wrap') {
                const { from, to } = view.state.selection.main;
                let text = view.state.sliceDoc(from, to);
                if (from === to) {
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
            } else if (command === 'insert-mermaid-flowchart') {
                const template = `\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it?}
    B -- Yes --> C[OK]
    C --> D[Rethink]
    D --> B
    B -- No --> E[End]
\`\`\`
`;
                view.dispatch(view.state.replaceSelection(template));
            } else if (command === 'insert-mermaid-state-diagram') {
                const template = `\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\`
`;
                view.dispatch(view.state.replaceSelection(template));
            } else if (['bold', 'italic', 'strikethrough', 'code', 'link', 'blockquote', 'list-ul', 'list-ol', 'checklist', 'h1', 'h2', 'h3'].includes(command)) {
                handleFormatting(view, command);
            }
        };

        const handleNavigateLine = (e: CustomEvent) => {
            if (!editorRef.current?.view) return;
            const view = editorRef.current.view;
            const { noteId, lineNumber } = e.detail;

            if (noteId && noteId !== note.id) return;

            if (lineNumber) {
                try {
                    const line = view.state.doc.line(lineNumber);
                    view.dispatch({
                        selection: { anchor: line.from },
                        scrollIntoView: true,
                        effects: EditorView.scrollIntoView(line.from, { y: 'center' })
                    });
                    view.focus();
                } catch (err) {
                    console.error('Failed to navigate to line:', lineNumber, err);
                }
            }
        };

        window.addEventListener('yoro-editor-cmd', handleCommand as EventListener);
        window.addEventListener('yoro-navigate-line', handleNavigateLine as EventListener);
        return () => {
            window.removeEventListener('yoro-editor-cmd', handleCommand as EventListener);
            window.removeEventListener('yoro-navigate-line', handleNavigateLine as EventListener);
        };
    }, [note.id, handleFormatting, wrapText]);

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
                        emacsMode && !vimMode ? emacsModeExtension : [],
                        lineWrapping ? EditorView.lineWrapping : [],
                        themeSyntaxHighlighting,
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
                        inlineCode,
                        mermaidPreview,
                        tablePreview,
                        autocompletion({ override: [emojiCompletion, getWikilinkCompletion(notes), getMentionCompletion(notes)] }),
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
