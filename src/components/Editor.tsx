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
import { createFocusModeExtension } from '../extensions/focus-mode';
import { inlineCode } from '../extensions/inline-code';
import { mermaidPreview } from '../extensions/mermaid';
import { tablePreview } from '../extensions/table-preview';
import { emacsMode as emacsModeExtension } from '../extensions/emacs-mode';
import { smartLists } from '../extensions/smart-lists';
import { syntaxErrors } from '../extensions/syntax-errors';
import { bracketPulse } from '../extensions/bracket-pulse';
import { DocumentStats } from './DocumentStats';
import { typewriterMode as typewriterModeExtension } from '../extensions/typewriter-mode';
import { HeadingBreadcrumb } from './HeadingBreadcrumb';
import { createWikilinkPreview } from '../extensions/wikilink-preview';
import { headingColors } from '../extensions/heading-colors';
import { multiCursorExtension } from '../extensions/multi-cursor';
import { codeBlockEnhancements } from '../extensions/code-block-enhancements';
import { markdownFolding } from '../extensions/markdown-folding';
import { lineMoveExtension } from '../extensions/line-move';
import { smartPaste } from '../extensions/smart-paste';
import { FindReplacePanel, createSearchHighlightExtension } from './FindReplacePanel';
import type { Note } from '../types';
import './styles/Editor.css';
import './styles/EditorThemeOverrides.css';

interface EditorProps {
    note: Note;
    notes: Note[];
    onChange: (content: string) => void;
    onTitleChange: (title: string) => void;
    onNavigate: (noteId: string) => void;
    onPositionChange?: (cursorPos: number, scrollPos: number) => void;
    vimMode: boolean;
    emacsMode: boolean;
    focusMode: boolean;
    focusModeBlur?: boolean;
    lineWrapping: boolean;
    showLineNumbers: boolean;
    editorAlignment: 'left' | 'center' | 'right';
    showDocumentStats: boolean;
    typewriterMode: boolean;
    cursorAnimations?: 'none' | 'subtle' | 'particles';
    findReplaceOpen?: boolean;
    onCloseFindReplace?: () => void;
}

export const Editor: React.FC<EditorProps> = ({ note, notes, onChange, onTitleChange, onNavigate, onPositionChange, vimMode, emacsMode, focusMode, focusModeBlur = true, lineWrapping, showLineNumbers, editorAlignment, showDocumentStats, typewriterMode, cursorAnimations = 'subtle', findReplaceOpen = false, onCloseFindReplace }) => {
    const editorRef = React.useRef<ReactCodeMirrorRef>(null);
    const navigate = useNavigate();
    const [cursorLine, setCursorLine] = React.useState(1);

    // Extension to track cursor line
    const cursorLineTracker = React.useMemo(() =>
        EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
                const line = update.state.doc.lineAt(update.state.selection.main.head);
                setCursorLine(line.number);
            }
        }),
        []
    );

    // Extension to track and save position (debounced)
    const positionSaveTimeoutRef = React.useRef<number | null>(null);
    const positionTracker = React.useMemo(() =>
        EditorView.updateListener.of((update) => {
            if ((update.selectionSet || update.viewportChanged) && onPositionChange) {
                // Debounce position saves
                if (positionSaveTimeoutRef.current) {
                    clearTimeout(positionSaveTimeoutRef.current);
                }
                positionSaveTimeoutRef.current = window.setTimeout(() => {
                    const cursorPos = update.state.selection.main.head;
                    const scrollPos = update.view.scrollDOM.scrollTop;
                    onPositionChange(cursorPos, scrollPos);
                }, 500);
            }
        }),
        [onPositionChange]
    );

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

    // Track previous note ID for position saving
    const prevNoteIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (editorRef.current?.view) {
            const view = editorRef.current.view;

            // Save position of previous note before switching
            if (prevNoteIdRef.current && prevNoteIdRef.current !== note.id && onPositionChange) {
                // Position was saved via beforeunload or the position tracker
            }

            // Restore position for the new note
            const cursorPos = note.lastCursorPosition ?? 0;
            const scrollPos = note.lastScrollPosition ?? 0;

            view.focus();

            // Ensure cursor position is within document bounds
            const maxPos = view.state.doc.length;
            const safeCursorPos = Math.min(cursorPos, maxPos);

            view.dispatch({
                selection: { anchor: safeCursorPos, head: safeCursorPos },
            });

            // Restore scroll position after a small delay to let the view settle
            setTimeout(() => {
                if (editorRef.current?.view) {
                    editorRef.current.view.scrollDOM.scrollTop = scrollPos;
                }
            }, 50);

            prevNoteIdRef.current = note.id;
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
            } else if (command === 'insert-heading-auto') {
                // Smart heading auto-level: find nearest heading above cursor and use level + 1
                const { from } = view.state.selection.main;
                const currentLine = view.state.doc.lineAt(from);

                // Scan backwards for nearest heading
                let headingLevel = 1;
                for (let lineNum = currentLine.number - 1; lineNum >= 1; lineNum--) {
                    const line = view.state.doc.line(lineNum);
                    const match = line.text.match(/^(#{1,6})\s/);
                    if (match) {
                        // Use level + 1, max 6
                        headingLevel = Math.min(match[1].length + 1, 6);
                        break;
                    }
                }

                const headingMarker = '#'.repeat(headingLevel) + ' ';
                const insert = '\n' + headingMarker;
                view.dispatch({
                    changes: { from, to: from, insert },
                    selection: { anchor: from + insert.length }
                });
            } else if (command === 'insert-template') {
                const { content } = e.detail;
                if (content) {
                    const filledContent = content.replace('{{date}}', new Date().toLocaleDateString());
                    view.dispatch(view.state.replaceSelection(filledContent));
                }
            } else if (command === 'insert-text') {
                const { text } = e.detail;
                if (text) {
                    view.dispatch(view.state.replaceSelection(text));
                }
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
            data-cursor-animation={cursorAnimations}
            onClick={handleContainerClick}
        >
            <FindReplacePanel
                isOpen={findReplaceOpen}
                onClose={onCloseFindReplace || (() => {})}
                editorView={editorRef.current?.view || null}
            />
            <div className="editor-content">
                <input
                    type="text"
                    className="editor-title"
                    value={note.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Untitled"
                />
                <HeadingBreadcrumb content={note.content} cursorLine={cursorLine} noteId={note.id} />
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
                        createWikilinkPreview(notes, onNavigate),
                        headingColors,
                        highlightActiveLine(),
                        focusMode ? createFocusModeExtension(focusModeBlur) : [],
                        smartLists,
                        syntaxErrors,
                        bracketPulse,
                        typewriterMode ? typewriterModeExtension : [],
                        cursorLineTracker,
                        positionTracker,
                        keymap.of(markdownKeymap),
                        createSearchHighlightExtension(),
                        multiCursorExtension,
                        codeBlockEnhancements,
                        markdownFolding,
                        lineMoveExtension,
                        smartPaste
                    ]}
                    onChange={onChange}
                    className="editor-cm-wrapper"
                    basicSetup={{
                        lineNumbers: showLineNumbers,
                        foldGutter: false, // We use our custom fold gutter
                    }}
                />
            </div>
            <DocumentStats content={note.content} visible={showDocumentStats} />
        </div>
    );
};
