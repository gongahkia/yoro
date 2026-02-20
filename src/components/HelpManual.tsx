import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { useSinglish } from '../contexts/SinglishContext';
import { useFocusTrap } from '../utils/useFocusTrap';
import './styles/HelpManual.css';

interface HelpManualProps {
    isOpen: boolean;
    onClose: () => void;
    vimMode: boolean;
    emacsMode: boolean;
}

type HelpSection = 'shortcuts' | 'markdown' | 'features';

function getKeyboardShortcuts(sl: boolean) {
    return {
        general: [
            { keys: 'Cmd/Ctrl + Shift + P', description: sl ? 'Open command palette lah' : 'Open command palette' },
            { keys: 'Cmd/Ctrl + Shift + I', description: 'Quick capture note' },
            { keys: 'Cmd/Ctrl + Click', description: 'Follow link (wikilink or URL)' },
            { keys: 'Escape', description: sl ? 'Close modal / get out lah' : 'Close modal / Exit focus' },
        ],
        editor: [
            { keys: 'Cmd/Ctrl + H', description: 'Find and replace' },
            { keys: 'Cmd/Ctrl + B', description: sl ? 'Bold lah' : 'Bold text' },
            { keys: 'Cmd/Ctrl + I', description: sl ? 'Italic lah' : 'Italic text' },
            { keys: 'Tab', description: sl ? 'Indent / add child node' : 'Indent / Add child node (in visual editors)' },
            { keys: 'Shift + Tab', description: 'Outdent' },
            { keys: 'Delete/Backspace', description: sl ? 'Remove selected node' : 'Remove selected node (in visual editors)' },
            { keys: 'Alt + Up/Down', description: 'Move line up/down' },
        ],
        vim: [
            { keys: ':q', description: sl ? 'Go home lah' : 'Return to home' },
            { keys: ':wq', description: sl ? 'Save and go home' : 'Save and return to home' },
            { keys: 'i', description: 'Enter insert mode' },
            { keys: 'Esc', description: 'Exit insert mode' },
            { keys: 'dd', description: sl ? 'Delete line liao' : 'Delete line' },
            { keys: 'yy', description: 'Yank (copy) line' },
            { keys: 'p', description: 'Paste' },
            { keys: '/', description: 'Search forward' },
            { keys: 'n', description: 'Next result' },
            { keys: 'u', description: sl ? 'Undo lah' : 'Undo' },
            { keys: 'Ctrl + r', description: 'Redo' },
        ],
        emacs: [
            { keys: 'C-f', description: sl ? 'Move forward' : 'Move forward one character' },
            { keys: 'C-b', description: sl ? 'Move backward' : 'Move backward one character' },
            { keys: 'C-n', description: sl ? 'Next line' : 'Move to next line' },
            { keys: 'C-p', description: sl ? 'Previous line' : 'Move to previous line' },
            { keys: 'C-a', description: sl ? 'Start of line' : 'Move to beginning of line' },
            { keys: 'C-e', description: sl ? 'End of line' : 'Move to end of line' },
            { keys: 'C-k', description: sl ? 'Kill to end of line' : 'Kill (delete) to end of line' },
            { keys: 'C-y', description: sl ? 'Yank (paste)' : 'Yank (paste) killed text' },
            { keys: 'C-w', description: sl ? 'Kill selection' : 'Kill (cut) selected region' },
            { keys: 'M-w', description: sl ? 'Copy region' : 'Copy selected region' },
            { keys: 'C-s', description: sl ? 'Search forward' : 'Search forward incrementally' },
            { keys: 'C-r', description: sl ? 'Search backward' : 'Search backward incrementally' },
            { keys: 'C-g', description: sl ? 'Cancel lah' : 'Cancel current operation' },
            { keys: 'C-/', description: sl ? 'Undo' : 'Undo last change' },
        ],
    };
}

function getMarkdownSyntax(sl: boolean) {
    return [
        { syntax: '# Heading 1', description: sl ? 'Big heading lah' : 'First-level heading' },
        { syntax: '## Heading 2', description: sl ? 'Medium heading' : 'Second-level heading' },
        { syntax: '### Heading 3', description: sl ? 'Small heading' : 'Third-level heading' },
        { syntax: '**bold**', description: sl ? 'Bold lah' : 'Bold text' },
        { syntax: '*italic*', description: sl ? 'Italic lah' : 'Italic text' },
        { syntax: '***bold italic***', description: sl ? 'Bold and italic sia' : 'Bold italic text' },
        { syntax: '~~strikethrough~~', description: sl ? 'Strike out liao' : 'Strikethrough text' },
        { syntax: '`code`', description: 'Inline code' },
        { syntax: '```lang\\ncode\\n```', description: 'Code block with highlighting' },
        { syntax: '```mermaid\\n...\\n```', description: sl ? 'Mermaid diagram lah' : 'Mermaid diagram' },
        { syntax: '[[Note Title]]', description: 'Wikilink to another note' },
        { syntax: '[text](url)', description: 'Hyperlink' },
        { syntax: '![alt](url)', description: 'Image' },
        { syntax: '- item', description: 'Bullet point' },
        { syntax: '1. item', description: 'Numbered list' },
        { syntax: '- [ ] task', description: sl ? 'Task (not done yet)' : 'Unchecked task item' },
        { syntax: '- [x] task', description: sl ? 'Task (done liao)' : 'Checked task item' },
        { syntax: '> quote', description: 'Blockquote' },
        { syntax: '> [!note]', description: 'Note callout' },
        { syntax: '> [!warning]', description: 'Warning callout' },
        { syntax: '> [!tip]', description: 'Tip callout' },
        { syntax: '| Col1 | Col2 |', description: 'Table header' },
        { syntax: '|---|---|', description: 'Table separator' },
        { syntax: '---', description: 'Horizontal line' },
        { syntax: '$math$', description: 'Inline math' },
        { syntax: '$$math$$', description: 'Block math' },
        { syntax: '==highlight==', description: sl ? 'Highlight lah' : 'Highlighted text' },
        { syntax: ':emoji:', description: 'Emoji (e.g., :smile:)' },
        { syntax: '[^1]', description: 'Footnote reference' },
        { syntax: '[^1]: text', description: 'Footnote definition' },
    ];
}

function getFeaturesMarkdown(sl: boolean) {
    if (sl) {
        return `
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
    }
    return `
## Editor
- **Live Preview** — Renders Markdown inline as you type
- **Syntax Highlighting** — Supports 100+ programming languages
- **Vim Mode** — Full Vim keybindings including :q, :wq, and search
- **Emacs Mode** — Emacs keybindings including C-f, C-b, C-k, C-y
- **Focus Mode** — Dims surrounding lines to keep focus on current line
- **Find & Replace** — Cmd/Ctrl+H to open find and replace panel
- **Multi-cursor** — Edit multiple locations simultaneously
- **Smart Lists** — Automatically continues bullets and checkboxes
- **Line Wrapping** — Soft wrap or hard wrap at 80 columns
- **Line Move** — Alt+Arrow keys to move lines up or down

## Linking & Navigation
- **Wikilinks** — Link notes using [[Note Title]] syntax
- **Backlinks** — View all notes that reference the current note
- **Knowledge Graph** — Visualise all note connections in a graph
- **Outline Panel** — Navigate headings via the command palette

## Rich Content
- **Math (KaTeX)** — Inline $x^2$ and block $$\\sum_{i=1}^n$$ equations
- **Mermaid Diagrams** — Flowcharts, mindmaps, and sequence diagrams
- **Visual Builders** — Drag-and-drop flowchart and state diagram editors
- **Tables** — Insert tables with column alignment support
- **Callouts** — Styled blocks: > [!note], > [!warning], > [!tip]
- **Code Blocks** — Fenced blocks with syntax highlighting
- **Images** — Inline preview with click-to-lightbox
- **Footnotes** — Hover to preview footnote content
- **Highlighting** — Use ==text== to highlight

## Organisation
- **Tags** — Use #tags and filter by tag in the command palette
- **Favourites** — Star important notes for quick access
- **Sorting** — Sort by date updated, date created, or title

## Capture & Export
- **Quick Capture** — Cmd/Ctrl+Shift+I for rapid note capture
- **Presentation Mode** — Present notes as slides (headings become slides)
- **Export** — Export as Markdown, PDF, or Word (.docx)
- **Share** — Share notes via compressed URL links
- **ZIP Export** — Bulk export all notes as a ZIP archive

## Customisation
- **20+ Themes** — Nord, Dracula, Gruvbox, Catppuccin, Solarized, Tokyo Night, Kanagawa, Rose Pine, Everforest, and more
- **Font Family** — Choose from Sans-serif, Serif, Monospace, or Comic Sans
- **Font Size** — Adjustable from 10px to 32px
- **Editor Alignment** — Left, center, or right alignment
- **Cursor Animations** — None, subtle, or particles
- **Line Numbers** — Toggle line numbers on or off
- **Document Stats** — Displays word count and estimated reading time
- **Home View** — Switch between 2D timeline and 3D carousel
- **config.toml** — Manage all settings from a single config file

## Command Palette
Press Cmd/Ctrl+Shift+P to open:
- **General** — New note, help manual, about, configuration
- **View** — Knowledge graph, backlinks, outline, presentation, focus mode
- **Editor** — Vim/Emacs mode, line wrapping, document stats
- **Font** — Family (Sans/Serif/Mono/Comic Sans), size adjustment
- **Theme** — 20+ themes in light and dark variants
- **Sort** — Sort by date or title (A-Z / Z-A)
- **Export** — PDF, DOCX, Markdown, ZIP
- **Navigation** — Open a note or return home
`;
}

export const HelpManual: React.FC<HelpManualProps> = ({ isOpen, onClose, vimMode, emacsMode }) => {
    const [activeSection, setActiveSection] = useState<HelpSection>('shortcuts');
    const sl = useSinglish();
    const trapRef = useFocusTrap(isOpen);

    if (!isOpen) return null;

    const shortcuts = getKeyboardShortcuts(sl);
    const markdownSyntax = getMarkdownSyntax(sl);
    const featuresMarkdown = getFeaturesMarkdown(sl);

    return (
        <div className="help-manual-overlay" onClick={onClose}>
            <div className="help-manual-modal" onClick={e => e.stopPropagation()} ref={trapRef as React.RefObject<HTMLDivElement>}>
                <div className="help-manual-header">
                    <h2>{sl ? 'Help lah' : 'Help Manual'}</h2>
                    <button className="help-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="help-manual-nav">
                    <button
                        className={activeSection === 'shortcuts' ? 'active' : ''}
                        onClick={() => setActiveSection('shortcuts')}
                    >
                        {sl ? 'Shortcuts' : 'Keyboard Shortcuts'}
                    </button>
                    <button
                        className={activeSection === 'markdown' ? 'active' : ''}
                        onClick={() => setActiveSection('markdown')}
                    >
                        {sl ? 'Markdown' : 'Markdown Syntax'}
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
                                    {shortcuts.general.map(s => (
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
                                    {shortcuts.editor.map(s => (
                                        <tr key={s.keys}>
                                            <td><kbd>{s.keys}</kbd></td>
                                            <td>{s.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {vimMode && (
                                <>
                                    <h3>{sl ? 'Vim Mode (On liao)' : 'Vim Mode (Active)'}</h3>
                                    <table className="help-table">
                                        <tbody>
                                            {shortcuts.vim.map(s => (
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
                                    <h3>{sl ? 'Emacs Mode (On liao)' : 'Emacs Mode (Active)'}</h3>
                                    <p className="help-note">{sl ? 'C = Ctrl, M = Alt/Option lah' : 'C = Ctrl, M = Alt/Option'}</p>
                                    <table className="help-table">
                                        <tbody>
                                            {shortcuts.emacs.map(s => (
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
                                    {sl ? 'Enable Vim or Emacs mode via command palette lah, got more shortcuts one.' : 'Enable Vim or Emacs mode via the command palette for additional keybindings.'}
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
