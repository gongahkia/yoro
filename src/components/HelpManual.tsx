import React, { useState } from 'react';
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
        { keys: 'Cmd/Ctrl + Shift + P', description: 'Open command palette' },
        { keys: 'Cmd/Ctrl + Shift + I', description: 'Quick capture note' },
        { keys: 'Cmd/Ctrl + Click', description: 'Follow link (wikilink or URL)' },
    ],
    editor: [
        { keys: 'Cmd/Ctrl + H', description: 'Find and replace' },
        { keys: 'Cmd/Ctrl + B', description: 'Bold text' },
        { keys: 'Cmd/Ctrl + I', description: 'Italic text' },
        { keys: 'Tab', description: 'Indent / Add child node (in visual editors)' },
        { keys: 'Delete/Backspace', description: 'Remove selected node (in visual editors)' },
    ],
    vim: [
        { keys: ':q', description: 'Return to home' },
        { keys: ':wq', description: 'Save and return to home' },
        { keys: 'i', description: 'Enter insert mode' },
        { keys: 'Esc', description: 'Exit insert mode' },
        { keys: 'dd', description: 'Delete line' },
        { keys: 'yy', description: 'Yank (copy) line' },
        { keys: 'p', description: 'Paste' },
        { keys: '/', description: 'Search forward' },
        { keys: 'n', description: 'Next search result' },
        { keys: 'u', description: 'Undo' },
        { keys: 'Ctrl + r', description: 'Redo' },
    ],
    emacs: [
        { keys: 'C-f', description: 'Move forward one character' },
        { keys: 'C-b', description: 'Move backward one character' },
        { keys: 'C-n', description: 'Move to next line' },
        { keys: 'C-p', description: 'Move to previous line' },
        { keys: 'C-a', description: 'Move to beginning of line' },
        { keys: 'C-e', description: 'Move to end of line' },
        { keys: 'C-k', description: 'Kill (cut) to end of line' },
        { keys: 'C-y', description: 'Yank (paste)' },
        { keys: 'C-w', description: 'Kill region (cut selection)' },
        { keys: 'M-w', description: 'Copy region' },
        { keys: 'C-s', description: 'Incremental search forward' },
        { keys: 'C-r', description: 'Incremental search backward' },
        { keys: 'C-g', description: 'Cancel current command' },
        { keys: 'C-/', description: 'Undo' },
    ],
};

const markdownSyntax = [
    { syntax: '# Heading 1', description: 'First-level heading' },
    { syntax: '## Heading 2', description: 'Second-level heading' },
    { syntax: '### Heading 3', description: 'Third-level heading' },
    { syntax: '**bold**', description: 'Bold text' },
    { syntax: '*italic*', description: 'Italic text' },
    { syntax: '~~strikethrough~~', description: 'Strikethrough text' },
    { syntax: '`code`', description: 'Inline code' },
    { syntax: '```lang\\ncode\\n```', description: 'Code block with syntax highlighting' },
    { syntax: '[[Note Title]]', description: 'Wikilink to another note' },
    { syntax: '[text](url)', description: 'Hyperlink' },
    { syntax: '- item', description: 'Bullet list item' },
    { syntax: '1. item', description: 'Numbered list item' },
    { syntax: '- [ ] task', description: 'Task list item (unchecked)' },
    { syntax: '- [x] task', description: 'Task list item (checked)' },
    { syntax: '> quote', description: 'Blockquote' },
    { syntax: '> [!note]', description: 'Note callout' },
    { syntax: '> [!warning]', description: 'Warning callout' },
    { syntax: '> [!tip]', description: 'Tip callout' },
    { syntax: '---', description: 'Horizontal rule' },
    { syntax: '$math$', description: 'Inline LaTeX math' },
    { syntax: '$$math$$', description: 'Block LaTeX math' },
    { syntax: '==highlight==', description: 'Highlighted text' },
    { syntax: ':emoji:', description: 'Emoji (e.g., :smile:)' },
    { syntax: '[^1]', description: 'Footnote reference' },
    { syntax: '[^1]: text', description: 'Footnote definition' },
];

const featuresMarkdown = `
## Editor
- **Live Preview** — Formatted markdown rendered inline as you type
- **Syntax Highlighting** — Theme-specific colors for 100+ programming languages
- **Vim Mode** — Modal editing with :q, :wq, search, and full vim keybindings
- **Emacs Mode** — C-f, C-b, C-k, C-y and familiar emacs navigation
- **Focus Mode** — Dim non-active lines with optional blur effect
- **Find & Replace** — Search and replace with Cmd/Ctrl+H
- **Multi-cursor** — Edit multiple lines simultaneously
- **Smart Lists** — Auto-continue bullets, numbers, and checkboxes
- **Line Wrapping** — Soft wrap or hard wrap at 80 columns

## Linking & Navigation
- **Wikilinks** — Link notes with [[Note Title]] syntax
- **Backlinks** — See all notes that reference the current note
- **Knowledge Graph** — Interactive visualization of note connections
- **Similar Notes** — Discover related content automatically
- **Outline Panel** — Navigate headings in long documents

## Rich Content
- **Math (KaTeX)** — Inline $x^2$ and block $$\\sum_{i=1}^n$$ equations
- **Mermaid Diagrams** — Flowcharts, mindmaps, sequence diagrams
- **Visual Builders** — Drag-and-drop flowchart and state diagram editors
- **Tables** — Visual table insertion with alignment support
- **Callouts** — Styled blocks with > [!note], > [!warning], > [!tip]
- **Code Blocks** — Fenced blocks with language-specific highlighting
- **Images** — Inline preview with lightbox on click
- **Footnotes** — Reference-style footnotes with hover preview

## Organization
- **Tags** — Organize with #tags, filter via command palette
- **Favorites** — Star important notes for quick access
- **Bin** — 30-day recovery period for deleted notes
- **Sorting** — By date updated, created, or title (A-Z/Z-A)

## Capture & Export
- **Quick Capture** — Cmd/Ctrl+Shift+I for instant note capture
- **Presentation Mode** — Present notes as slides (headings = slides)
- **Export** — Markdown, PDF (with diagrams), Word (.docx)
- **Share** — Compressed URL links for sharing notes
- **ZIP Export** — Backup all notes at once

## Customization
- **20+ Themes** — Nord, Dracula, Gruvbox, Catppuccin, Solarized, Tokyo Night, Kanagawa, Rose Pine, Everforest, and more
- **Font Family** — Sans, Serif, Mono, or Comic Sans
- **Font Size** — Adjustable from 10px to 32px
- **Editor Alignment** — Left, center, or right
- **Cursor Animations** — None, subtle, or particles
- **Line Numbers** — Toggle visibility
- **Document Stats** — Word/character count and reading time
- **Home View** — 2D or 3D carousel for note list
- **config.toml** — All settings in one editable file
`;

export const HelpManual: React.FC<HelpManualProps> = ({ isOpen, onClose, vimMode, emacsMode }) => {
    const [activeSection, setActiveSection] = useState<HelpSection>('shortcuts');

    if (!isOpen) return null;

    return (
        <div className="help-manual-overlay" onClick={onClose}>
            <div className="help-manual-modal" onClick={e => e.stopPropagation()}>
                <div className="help-manual-header">
                    <h2>Help Manual</h2>
                    <button className="help-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="help-manual-nav">
                    <button
                        className={activeSection === 'shortcuts' ? 'active' : ''}
                        onClick={() => setActiveSection('shortcuts')}
                    >
                        Keyboard Shortcuts
                    </button>
                    <button
                        className={activeSection === 'markdown' ? 'active' : ''}
                        onClick={() => setActiveSection('markdown')}
                    >
                        Markdown Syntax
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
                                    <h3>Vim Mode (Active)</h3>
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
                                    <h3>Emacs Mode (Active)</h3>
                                    <p className="help-note">C = Ctrl, M = Alt/Option</p>
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
                                    Enable Vim or Emacs mode via the command palette for additional keybindings.
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
                                dangerouslySetInnerHTML={{ __html: featuresMarkdown
                                    .replace(/## (.+)/g, '<h3>$1</h3>')
                                    .replace(/- \*\*(.+?)\*\* — (.+)/g, '<li><strong>$1</strong> <span class="feature-desc">$2</span></li>')
                                    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
