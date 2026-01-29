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
    { syntax: '@url', description: 'Quick link with auto-fetched title' },
    { syntax: '[^1]', description: 'Footnote reference' },
    { syntax: '[^1]: text', description: 'Footnote definition' },
];

const features = [
    { name: 'Live Preview', description: 'See formatted markdown as you type with inline previews for headings, bold, italic, checkboxes, and more.' },
    { name: 'Wikilinks', description: 'Link notes together using [[Note Title]] syntax. Ctrl/Cmd+click to navigate between notes.' },
    { name: 'Math Support', description: 'Write LaTeX equations inline ($x^2$) or in blocks ($$\\sum_{i=1}^n$$) with KaTeX rendering.' },
    { name: 'Mermaid Diagrams', description: 'Create flowcharts, mindmaps, and state diagrams with mermaid code blocks. Live preview while editing.' },
    { name: 'Visual Builders', description: 'Build mindmaps, flowcharts, and state diagrams visually with drag-and-drop, then export as Mermaid code.' },
    { name: 'Vim Mode', description: 'Toggle vim keybindings for modal editing. Use :q to quit, :wq to save and quit.' },
    { name: 'Emacs Mode', description: 'Toggle Emacs keybindings for familiar navigation and editing commands (C-f, C-b, C-k, C-y, etc.).' },
    { name: 'Focus Mode', description: 'Dim non-active lines to concentrate on your current paragraph without distractions.' },
    { name: 'Themes', description: '20+ built-in themes including Nord, Dracula, Gruvbox, Catppuccin, Solarized, Tokyo Night, and more.' },
    { name: 'Tags', description: 'Organize notes with #tags. Filter by tag using command palette (type / to search by tag).' },
    { name: 'Code Highlighting', description: 'Syntax highlighting for 100+ programming languages in fenced code blocks.' },
    { name: 'Tables', description: 'Create markdown tables with the visual table insert dialog from the command palette.' },
    { name: 'Callouts', description: 'Use > [!note], > [!warning], > [!tip] for styled callout blocks with icons.' },
    { name: 'Sharing', description: 'Share notes via compressed URL links. Recipients can import shared notes directly.' },
    { name: 'Export', description: 'Export notes as Markdown, PDF, or Word documents. Export all notes as a ZIP archive.' },
    { name: 'Knowledge Graph', description: 'Visualize connections between your notes based on wikilinks in an interactive graph view.' },
    { name: 'Configuration', description: 'Customize yoro via config.toml accessible from the command palette. Settings sync automatically.' },
];

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
                        <div className="help-section">
                            <h3>Features Overview</h3>
                            <div className="features-grid">
                                {features.map(f => (
                                    <div key={f.name} className="feature-card">
                                        <h4>{f.name}</h4>
                                        <p>{f.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
