import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import './styles/HelpManual.css';

interface HelpManualProps {
    isOpen: boolean;
    onClose: () => void;
    vimMode: boolean;
    emacsMode: boolean;
}

type HelpSection = 'shortcuts' | 'markdown' | 'features';

const keyboardShortcuts = {
    general: [
        { keys: 'Cmd/Ctrl + Shift + P', description: 'Open command palette lah' },
        { keys: 'Cmd/Ctrl + Shift + I', description: 'Quick capture note' },
        { keys: 'Cmd/Ctrl + Click', description: 'Follow link (wikilink or URL)' },
        { keys: 'Escape', description: 'Close modal / get out lah' },
    ],
    editor: [
        { keys: 'Cmd/Ctrl + H', description: 'Find and replace' },
        { keys: 'Cmd/Ctrl + B', description: 'Bold lah' },
        { keys: 'Cmd/Ctrl + I', description: 'Italic lah' },
        { keys: 'Tab', description: 'Indent / add child node' },
        { keys: 'Shift + Tab', description: 'Outdent' },
        { keys: 'Delete/Backspace', description: 'Remove selected node' },
        { keys: 'Alt + Up/Down', description: 'Move line up/down' },
    ],
    vim: [
        { keys: ':q', description: 'Go home lah' },
        { keys: ':wq', description: 'Save and go home' },
        { keys: 'i', description: 'Enter insert mode' },
        { keys: 'Esc', description: 'Exit insert mode' },
        { keys: 'dd', description: 'Delete line liao' },
        { keys: 'yy', description: 'Yank (copy) line' },
        { keys: 'p', description: 'Paste' },
        { keys: '/', description: 'Search forward' },
        { keys: 'n', description: 'Next result' },
        { keys: 'u', description: 'Undo lah' },
        { keys: 'Ctrl + r', description: 'Redo' },
    ],
    emacs: [
        { keys: 'C-f', description: 'Move forward' },
        { keys: 'C-b', description: 'Move backward' },
        { keys: 'C-n', description: 'Next line' },
        { keys: 'C-p', description: 'Previous line' },
        { keys: 'C-a', description: 'Start of line' },
        { keys: 'C-e', description: 'End of line' },
        { keys: 'C-k', description: 'Kill to end of line' },
        { keys: 'C-y', description: 'Yank (paste)' },
        { keys: 'C-w', description: 'Kill selection' },
        { keys: 'M-w', description: 'Copy region' },
        { keys: 'C-s', description: 'Search forward' },
        { keys: 'C-r', description: 'Search backward' },
        { keys: 'C-g', description: 'Cancel lah' },
        { keys: 'C-/', description: 'Undo' },
    ],
};

const markdownSyntax = [
    { syntax: '# Heading 1', description: 'Big heading lah' },
    { syntax: '## Heading 2', description: 'Medium heading' },
    { syntax: '### Heading 3', description: 'Small heading' },
    { syntax: '**bold**', description: 'Bold lah' },
    { syntax: '*italic*', description: 'Italic lah' },
    { syntax: '***bold italic***', description: 'Bold and italic sia' },
    { syntax: '~~strikethrough~~', description: 'Strike out liao' },
    { syntax: '`code`', description: 'Inline code' },
    { syntax: '```lang\\ncode\\n```', description: 'Code block with highlighting' },
    { syntax: '```mermaid\\n...\\n```', description: 'Mermaid diagram lah' },
    { syntax: '[[Note Title]]', description: 'Wikilink to another note' },
    { syntax: '[text](url)', description: 'Hyperlink' },
    { syntax: '![alt](url)', description: 'Image' },
    { syntax: '- item', description: 'Bullet point' },
    { syntax: '1. item', description: 'Numbered list' },
    { syntax: '- [ ] task', description: 'Task (not done yet)' },
    { syntax: '- [x] task', description: 'Task (done liao)' },
    { syntax: '> quote', description: 'Blockquote' },
    { syntax: '> [!note]', description: 'Note callout' },
    { syntax: '> [!warning]', description: 'Warning callout' },
    { syntax: '> [!tip]', description: 'Tip callout' },
    { syntax: '| Col1 | Col2 |', description: 'Table header' },
    { syntax: '|---|---|', description: 'Table separator' },
    { syntax: '---', description: 'Horizontal line' },
    { syntax: '$math$', description: 'Inline math' },
    { syntax: '$$math$$', description: 'Block math' },
    { syntax: '==highlight==', description: 'Highlight lah' },
    { syntax: ':emoji:', description: 'Emoji (e.g., :smile:)' },
    { syntax: '[^1]', description: 'Footnote reference' },
    { syntax: '[^1]: text', description: 'Footnote definition' },
];

const featuresMarkdown = `
## Editor
- **Live Preview** — Markdown render inline as you type, shiok one
- **Syntax Highlighting** — Got colors for 100+ languages
- **Vim Mode** — :q, :wq, search, full vim lah
- **Emacs Mode** — C-f, C-b, C-k, C-y and all that
- **Focus Mode** — Dim other lines, shiok for focus
- **Find & Replace** — Cmd/Ctrl+H lah
- **Multi-cursor** — Edit many lines same time
- **Smart Lists** — Auto-continue bullets and checkboxes
- **Line Wrapping** — Soft wrap or hard wrap at 80 cols
- **Line Move** — Alt+Arrow to move lines up/down

## Linking & Navigation
- **Wikilinks** — Link notes with [[Note Title]] lah
- **Backlinks** — See who link to this note
- **Knowledge Graph** — See all connections, shiok to look at
- **Outline Panel** — Navigate headings via command palette

## Rich Content
- **Math (KaTeX)** — Inline $x^2$ and block $$\\sum_{i=1}^n$$ equations
- **Mermaid Diagrams** — Flowcharts, mindmaps, sequence diagrams
- **Visual Builders** — Drag-drop flowchart and state diagram editors
- **Tables** — Insert table with alignment support
- **Callouts** — Styled blocks: > [!note], > [!warning], > [!tip]
- **Code Blocks** — Fenced blocks with language highlighting
- **Images** — Inline preview, click to lightbox
- **Footnotes** — Hover to preview footnotes
- **Highlighting** — ==text== to highlight lah

## Organisation
- **Tags** — Use #tags, filter in command palette
- **Favourites** — Star important notes
- **Sorting** — By date updated, created, or title

## Capture & Export
- **Quick Capture** — Cmd/Ctrl+Shift+I for fast note capture
- **Presentation Mode** — Present notes as slides (headings = slides)
- **Export** — Markdown, PDF, Word (.docx)
- **Share** — Compressed URL link to share notes
- **ZIP Export** — Backup all notes at once

## Customisation
- **20+ Themes** — Nord, Dracula, Gruvbox, Catppuccin, Solarized, Tokyo Night, Kanagawa, Rose Pine, Everforest, and more
- **Font Family** — Sans, Serif, Mono, or Comic Sans
- **Font Size** — 10px to 32px, adjust as you like
- **Editor Alignment** — Left, center, or right
- **Cursor Animations** — None, subtle, or particles
- **Line Numbers** — Toggle on/off
- **Document Stats** — Word count and reading time
- **Home View** — 2D or 3D carousel
- **config.toml** — All settings in one file

## Command Palette
Press Cmd/Ctrl+Shift+P lah:
- **General** — New note, help, about, config
- **View** — Knowledge graph, backlinks, outline, presentation, focus mode
- **Editor** — Vim/Emacs mode, line wrapping, document stats
- **Font** — Family (Sans/Serif/Mono/Comic), size
- **Theme** — 20+ themes (light and dark)
- **Sort** — By date, title (A-Z/Z-A)
- **Export** — PDF, DOCX, Markdown, ZIP
- **Navigation** — Go to note, go home
`;

export const HelpManual: React.FC<HelpManualProps> = ({ isOpen, onClose, vimMode, emacsMode }) => {
    const [activeSection, setActiveSection] = useState<HelpSection>('shortcuts');

    if (!isOpen) return null;

    return (
        <div className="help-manual-overlay" onClick={onClose}>
            <div className="help-manual-modal" onClick={e => e.stopPropagation()}>
                <div className="help-manual-header">
                    <h2>Help lah</h2>
                    <button className="help-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="help-manual-nav">
                    <button
                        className={activeSection === 'shortcuts' ? 'active' : ''}
                        onClick={() => setActiveSection('shortcuts')}
                    >
                        Shortcuts
                    </button>
                    <button
                        className={activeSection === 'markdown' ? 'active' : ''}
                        onClick={() => setActiveSection('markdown')}
                    >
                        Markdown
                    </button>
                    <button
                        className={activeSection === 'features' ? 'active' : ''}
                        onClick={() => setActiveSection('features')}
                    >
                        Features
                    </button>
                </div>

                <div className="help-manual-content">
                    {activeSection === 'shortcuts' && (
                        <div className="help-section">
                            <h3>General</h3>
                            <table className="help-table">
                                <tbody>
                                    {keyboardShortcuts.general.map(s => (
                                        <tr key={s.keys}>
                                            <td><kbd>{s.keys}</kbd></td>
                                            <td>{s.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <h3>Editor</h3>
                            <table className="help-table">
                                <tbody>
                                    {keyboardShortcuts.editor.map(s => (
                                        <tr key={s.keys}>
                                            <td><kbd>{s.keys}</kbd></td>
                                            <td>{s.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {vimMode && (
                                <>
                                    <h3>Vim Mode (On liao)</h3>
                                    <table className="help-table">
                                        <tbody>
                                            {keyboardShortcuts.vim.map(s => (
                                                <tr key={s.keys}>
                                                    <td><kbd>{s.keys}</kbd></td>
                                                    <td>{s.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {emacsMode && (
                                <>
                                    <h3>Emacs Mode (On liao)</h3>
                                    <p className="help-note">C = Ctrl, M = Alt/Option lah</p>
                                    <table className="help-table">
                                        <tbody>
                                            {keyboardShortcuts.emacs.map(s => (
                                                <tr key={s.keys}>
                                                    <td><kbd>{s.keys}</kbd></td>
                                                    <td>{s.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {!vimMode && !emacsMode && (
                                <p className="help-note">
                                    Enable Vim or Emacs mode via command palette lah, got more shortcuts one.
                                </p>
                            )}
                        </div>
                    )}

                    {activeSection === 'markdown' && (
                        <div className="help-section">
                            <h3>Markdown Syntax</h3>
                            <table className="help-table">
                                <thead>
                                    <tr>
                                        <th>Syntax</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {markdownSyntax.map(s => (
                                        <tr key={s.syntax}>
                                            <td><code>{s.syntax}</code></td>
                                            <td>{s.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeSection === 'features' && (
                        <div className="help-section help-features-section">
                            <div
                                className="features-markdown"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(featuresMarkdown
                                    .replace(/## (.+)/g, '<h3>$1</h3>')
                                    .replace(/- \*\*(.+?)\*\* — (.+)/g, '<li><strong>$1</strong> <span class="feature-desc">$2</span></li>')
                                    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
                                ) }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
