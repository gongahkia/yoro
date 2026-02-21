import JSZip from 'jszip';
import LZString from 'lz-string';
import { showToast } from '../components/Toast';
import { exportToPDF, exportToDOCX } from '../utils/exportUtils';
import { templates } from '../utils/templates';
import { analytics } from '../utils/analytics';
import type { Command } from '../components/CommandPalette';
import type { Note, Theme, UserPreferences } from '../types';

// Data-driven theme list — add new themes here instead of individual command objects
export const THEMES: { id: Theme; label: string }[] = [
    { id: 'light', label: 'Yoro Light' },
    { id: 'dark', label: 'Yoro Dark' },
    { id: 'sepia-light', label: 'Sepia Light' },
    { id: 'sepia-dark', label: 'Sepia Dark' },
    { id: 'dracula-light', label: 'Dracula Light' },
    { id: 'dracula-dark', label: 'Dracula Dark' },
    { id: 'nord-light', label: 'Nord Light' },
    { id: 'nord-dark', label: 'Nord Dark' },
    { id: 'solarized-light', label: 'Solarized Light' },
    { id: 'solarized-dark', label: 'Solarized Dark' },
    { id: 'gruvbox-light', label: 'Gruvbox Light' },
    { id: 'gruvbox-dark', label: 'Gruvbox Dark' },
    { id: 'everforest-light', label: 'Everforest Light' },
    { id: 'everforest-dark', label: 'Everforest Dark' },
    { id: 'catppuccin-light', label: 'Catppuccin Light' },
    { id: 'catppuccin-dark', label: 'Catppuccin Dark' },
    { id: 'rose-pine-light', label: 'Rose Pine Light' },
    { id: 'rose-pine-dark', label: 'Rose Pine Dark' },
    { id: 'tokyo-night-light', label: 'Tokyo Night Light' },
    { id: 'tokyo-night-dark', label: 'Tokyo Night Dark' },
    { id: 'kanagawa-light', label: 'Kanagawa Light' },
    { id: 'kanagawa-dark', label: 'Kanagawa Dark' },
    { id: 'monokai-light', label: 'Monokai Light' },
    { id: 'monokai-dark', label: 'Monokai Dark' },
    { id: 'ayu-light', label: 'Ayu Light' },
    { id: 'ayu-dark', label: 'Ayu Dark' },
    { id: 'one-light', label: 'One Light' },
    { id: 'one-dark', label: 'One Dark' },
    { id: 'zenburn-light', label: 'Zenburn Light' },
    { id: 'zenburn-dark', label: 'Zenburn Dark' },
    { id: 'palenight-light', label: 'Palenight Light' },
    { id: 'palenight-dark', label: 'Palenight Dark' },
    { id: 'material-light', label: 'Material Light' },
    { id: 'material-dark', label: 'Material Dark' },
];

export interface CommandFactoryArgs {
    notes: Note[];
    preferences: UserPreferences;
    navigate: (path: string) => void;
    getCurrentNoteId: () => string | null;
    handleCreateNote: () => void;
    handleSelectNote: (id: string) => void;
    handleUpdateNote: (id: string, updates: Partial<Note>) => void;
    handleDeleteNote: (id: string, e?: { stopPropagation: () => void }) => void;
    handleDuplicateNote: (id: string, e?: { stopPropagation: () => void }) => void;
    handleUpdatePreferences: (updates: Partial<UserPreferences>) => void;
    handleImportNotes: (notes: Note[]) => void;
    setIsAboutOpen: (open: boolean) => void;
    setIsKnowledgeGraphOpen: (open: boolean) => void;
    setIsFindReplaceOpen: (open: boolean) => void;
    setIsBacklinksPanelOpen: (open: boolean) => void;
    setIsOutlineOpen: (toggle: (prev: boolean) => boolean) => void;
    setTableModalOpen: (open: boolean) => void;
}

export function createCommands(args: CommandFactoryArgs): Command[] {
    const {
        notes, preferences, navigate, getCurrentNoteId,
        handleCreateNote, handleSelectNote, handleUpdateNote,
        handleDeleteNote, handleDuplicateNote,
        handleUpdatePreferences, handleImportNotes,
        setIsAboutOpen, setIsKnowledgeGraphOpen,
        setIsFindReplaceOpen, setIsBacklinksPanelOpen, setIsOutlineOpen,
        setTableModalOpen,
    } = args;

    const sl = preferences.singlish ?? false;
    const currentNoteId = getCurrentNoteId();

    return [
        // General
        {
            id: 'new-note',
            label: 'Create New Note',
            action: () => handleCreateNote(),
            category: 'General'
        },
        {
            id: 'about-yoro',
            label: 'About Yoro',
            action: () => setIsAboutOpen(true),
            category: 'General'
        },
        // Recent notes (last 5 opened)
        ...(preferences.recentNoteIds || []).map(noteId => {
            const recentNote = notes.find(n => n.id === noteId);
            if (!recentNote) return null;
            return {
                id: `recent-note-${noteId}`,
                label: `Recent: ${recentNote.icon ? recentNote.icon + ' ' : ''}${recentNote.title || 'Untitled'}`,
                action: () => handleSelectNote(noteId),
                category: 'Recent' as const,
                groupId: 'recent-notes'
            };
        }).filter(Boolean) as Command[],
        {
            id: 'open-knowledge-graph',
            label: 'Open Knowledge Graph',
            action: () => setIsKnowledgeGraphOpen(true),
            category: 'View',
        },
        {
            id: 'open-backlinks',
            label: 'Show Backlinks',
            action: () => setIsBacklinksPanelOpen(true),
            category: 'View',
            context: 'editor' as const,
        },
        {
            id: 'toggle-outline',
            label: 'Toggle Outline',
            action: () => setIsOutlineOpen(prev => !prev),
            category: 'View',
            context: 'editor' as const,
        },
        {
            id: 'toggle-presentation',
            label: 'Start Presentation',
            action: () => {
                const id = getCurrentNoteId();
                if (id) navigate(`/note/${id}/presentation`);
            },
            category: 'View',
            context: 'editor' as const,
        },
        // View / Alignment
        {
            id: 'toggle-alignment',
            label: 'Cycle Editor Alignment',
            action: () => {
                const map: Record<string, 'left' | 'center' | 'right'> = {
                    left: 'center', center: 'right', right: 'left'
                };
                const current = preferences.editorAlignment || 'left';
                handleUpdatePreferences({ editorAlignment: map[current] || 'left' });
            },
            category: 'View',
        },
        {
            id: 'align-left',
            label: 'Align Editor Left (Natural)',
            action: () => handleUpdatePreferences({ editorAlignment: 'left' }),
            category: 'View',
        },
        {
            id: 'align-center',
            label: 'Align Editor Center',
            action: () => handleUpdatePreferences({ editorAlignment: 'center' }),
            category: 'View',
        },
        {
            id: 'align-right',
            label: 'Align Editor Right',
            action: () => handleUpdatePreferences({ editorAlignment: 'right' }),
            category: 'View',
        },
        // Editor Settings
        {
            id: 'toggle-vim',
            label: 'Toggle Vim Mode',
            action: () => {
                const newVimMode = !preferences.vimMode;
                handleUpdatePreferences({
                    vimMode: newVimMode,
                    emacsMode: newVimMode ? false : preferences.emacsMode
                });
                showToast(sl ? `Vim mode ${newVimMode ? 'on' : 'off'} liao` : `Vim mode ${newVimMode ? 'enabled' : 'disabled'}`, 'info');
            },
            category: 'Editor',
        },
        {
            id: 'toggle-emacs',
            label: 'Toggle Emacs Mode',
            action: () => {
                const newEmacsMode = !preferences.emacsMode;
                handleUpdatePreferences({
                    emacsMode: newEmacsMode,
                    vimMode: newEmacsMode ? false : preferences.vimMode
                });
                showToast(sl ? `Emacs mode ${newEmacsMode ? 'on' : 'off'} liao` : `Emacs mode ${newEmacsMode ? 'enabled' : 'disabled'}`, 'info');
            },
            category: 'Editor',
        },
        {
            id: 'toggle-line-numbers',
            label: 'Toggle Line Numbers',
            action: () => handleUpdatePreferences({ showLineNumbers: !preferences.showLineNumbers }),
            category: 'View',
        },
        {
            id: 'toggle-mindmap',
            label: 'Create Mindmap',
            action: () => {
                const id = getCurrentNoteId();
                if (id) {
                    const note = notes.find(n => n.id === id);
                    if (note) {
                        handleUpdateNote(id, { viewMode: note.viewMode === 'mindmap' ? 'editor' : 'mindmap' });
                    }
                }
            },
            category: 'View',
            context: 'editor' as const,
        },
        {
            id: 'toggle-focus-mode',
            label: 'Toggle Focus Mode',
            action: () => {
                const newFocusMode = !preferences.focusMode;
                handleUpdatePreferences({ focusMode: newFocusMode });
                showToast(sl ? `Focus mode ${newFocusMode ? 'on' : 'off'} liao` : `Focus mode ${newFocusMode ? 'enabled' : 'disabled'}`, 'info');
            },
            category: 'View',
        },
        {
            id: 'toggle-focus-mode-blur',
            label: 'Toggle Focus Mode Blur',
            action: () => handleUpdatePreferences({ focusModeBlur: !preferences.focusModeBlur }),
            category: 'View',
        },
        {
            id: 'toggle-line-wrapping',
            label: 'Toggle Line Wrapping (Soft)',
            action: () => handleUpdatePreferences({ lineWrapping: !preferences.lineWrapping }),
            category: 'View',
        },
        {
            id: 'toggle-document-stats',
            label: 'Toggle Document Stats',
            action: () => handleUpdatePreferences({ showDocumentStats: !preferences.showDocumentStats }),
            category: 'View',
        },
        {
            id: 'toggle-singlish',
            label: 'Toggle Singlish — UI language mode (Singaporean English)',
            action: () => {
                const next = !preferences.singlish;
                handleUpdatePreferences({ singlish: next });
                showToast(next ? 'Singlish on liao' : 'Singlish off', 'info');
            },
            category: 'General',
        },
        // Background customisation
        {
            id: 'set-bg-color',
            label: 'Set Background Color',
            action: (params) => {
                const val = ((params?.value as string) || '').trim();
                if (!val) return;
                handleUpdatePreferences({ customBackground: val });
                showToast(sl ? `Background set liao` : 'Background color set', 'success');
            },
            category: 'View',
            parameters: [{ name: 'value', label: 'CSS color (e.g. #1a1a2e, oklch(30% 0.05 240))', type: 'text' as const, placeholder: '#1a1a2e' }],
        },
        {
            id: 'set-bg-image',
            label: 'Set Background Image (URL)',
            action: (params) => {
                const val = ((params?.value as string) || '').trim();
                if (!val) return;
                handleUpdatePreferences({ customBackground: `url("${val}")` });
                showToast(sl ? `Background image set liao` : 'Background image set', 'success');
            },
            category: 'View',
            parameters: [{ name: 'value', label: 'Image URL', type: 'text' as const, placeholder: 'https://...' }],
        },
        {
            id: 'set-bg-gradient',
            label: 'Set Background Gradient',
            action: (params) => {
                const val = ((params?.value as string) || '').trim();
                if (!val) return;
                handleUpdatePreferences({ customBackground: val });
                showToast(sl ? `Background gradient set liao` : 'Background gradient set', 'success');
            },
            category: 'View',
            parameters: [{ name: 'value', label: 'CSS gradient', type: 'text' as const, placeholder: 'linear-gradient(135deg, #1a1a2e, #16213e)' }],
        },
        {
            id: 'reset-bg',
            label: 'Reset Background to Theme Default',
            action: () => {
                handleUpdatePreferences({ customBackground: '' });
                showToast(sl ? `Background reset liao` : 'Background reset', 'info');
            },
            category: 'View',
        },
        {
            id: 'fold-all',
            label: 'Fold All',
            action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'fold-all' } })),
            category: 'Editor',
            context: 'editor' as const,
        },
        {
            id: 'unfold-all',
            label: 'Unfold All',
            action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'unfold-all' } })),
            category: 'Editor',
            context: 'editor' as const,
        },
        {
            id: 'hard-wrap',
            label: 'Hard Wrap Text (80 cols)',
            action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'hard-wrap' } })),
            category: 'Editor',
            context: 'editor' as const,
        },
        {
            id: 'cycle-cursor-animation',
            label: 'Cycle Cursor Animation',
            action: () => {
                const current = preferences.cursorAnimations || 'subtle';
                const next: 'none' | 'subtle' | 'particles' =
                    current === 'none' ? 'subtle' :
                    current === 'subtle' ? 'particles' : 'none';
                handleUpdatePreferences({ cursorAnimations: next });
                showToast(sl ? `Cursor now ${next} liao` : `Cursor animation: ${next}`, 'info');
            },
            category: 'Editor',
        },
        // Sort Commands
        {
            id: 'sort-updated',
            label: 'Sort by Date Updated',
            action: () => handleUpdatePreferences({ sortOrder: 'updated' }),
            category: 'Sort',
            context: 'home' as const
        },
        {
            id: 'sort-created',
            label: 'Sort by Date Created',
            action: () => handleUpdatePreferences({ sortOrder: 'created' }),
            category: 'Sort',
            context: 'home' as const
        },
        {
            id: 'sort-alpha',
            label: 'Sort by Title A-Z',
            action: () => handleUpdatePreferences({ sortOrder: 'alpha' }),
            category: 'Sort',
            context: 'home' as const
        },
        {
            id: 'sort-alpha-reverse',
            label: 'Sort by Title Z-A',
            action: () => handleUpdatePreferences({ sortOrder: 'alpha-reverse' }),
            category: 'Sort',
            context: 'home' as const
        },
        // Theme Commands — data-driven from THEMES array
        ...THEMES.map(({ id, label }) => ({
            id: `theme-${id}`,
            label: `Theme: ${label}`,
            action: () => handleUpdatePreferences({ theme: id }),
            category: 'Theme',
        })),
        // Navigation
        {
            id: 'go-home',
            label: 'Go to Home',
            action: () => navigate('/'),
            category: 'Navigation'
        },
        // Note Navigation
        ...notes.map(note => ({
            id: `open-note-${note.id}`,
            label: `Open Note: ${note.title || 'Untitled'}`,
            action: () => handleSelectNote(note.id),
            category: 'Navigation'
        })),
        // Note Operations
        ...notes.map(note => ({
            id: `duplicate-note-${note.id}`,
            label: `Duplicate Note: ${note.title || 'Untitled'}`,
            action: () => handleDuplicateNote(note.id),
            category: 'Note Operations'
        })),
        ...notes.map(note => ({
            id: `delete-note-${note.id}`,
            label: `Delete Note: ${note.title || 'Untitled'}`,
            action: () => handleDeleteNote(note.id),
            category: 'Note Operations'
        })),
        // Global Import
        {
            id: 'import-md',
            label: 'Import Markdown (.md)',
            action: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.md';
                input.multiple = true;
                input.onchange = () => {
                    const files = Array.from(input.files ?? []);
                    if (files.length === 0) return;
                    const readers = files.map(file => new Promise<Note>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const now = Date.now();
                            resolve({
                                id: crypto.randomUUID(),
                                title: file.name.replace(/\.md$/i, ''),
                                content: reader.result as string,
                                format: 'markdown',
                                tags: [],
                                createdAt: now,
                                updatedAt: now,
                                isFavorite: false,
                            });
                        };
                        reader.readAsText(file);
                    }));
                    Promise.all(readers).then(imported => handleImportNotes(imported));
                };
                input.click();
            },
            category: 'Import'
        },
        {
            id: 'import-zip',
            label: 'Import ZIP of Markdown files',
            action: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.zip';
                input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const zip = await JSZip.loadAsync(arrayBuffer);
                        const mdEntries = Object.entries(zip.files).filter(
                            ([name, entry]) => !entry.dir && name.toLowerCase().endsWith('.md')
                        );
                        const imported = await Promise.all(
                            mdEntries.map(async ([name, entry]) => {
                                const content = await entry.async('string');
                                const filename = name.split('/').pop() ?? name;
                                const now = Date.now();
                                return {
                                    id: crypto.randomUUID(),
                                    title: filename.replace(/\.md$/i, ''),
                                    content,
                                    format: 'markdown' as const,
                                    tags: [],
                                    createdAt: now,
                                    updatedAt: now,
                                    isFavorite: false,
                                };
                            })
                        );
                        handleImportNotes(imported);
                    } catch {
                        showToast(sl ? 'Cannot read ZIP lah' : 'Failed to read ZIP file', 'error');
                    }
                };
                input.click();
            },
            category: 'Import'
        },
        // Global Export
        {
            id: 'export-all',
            label: 'Export All Notes (ZIP)',
            action: async () => {
                showToast(sl ? 'Preparing export liao...' : 'Preparing export...', 'info');
                const zip = new JSZip();
                notes.forEach(note => {
                    const filename = `${note.title || 'Untitled'}-${note.id.slice(0, 6)}.md`;
                    zip.file(filename, note.content);
                });
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `yoro-export-${new Date().toISOString().slice(0, 10)}.zip`;
                a.click();
                URL.revokeObjectURL(url);
                showToast(sl ? `${notes.length} notes exported liao` : `Exported ${notes.length} notes`, 'success');
            },
            category: 'Export'
        },
        // Current note actions (editor context)
        ...(currentNoteId ? [
            {
                id: 'delete-note',
                label: 'Delete Current Note',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) handleDeleteNote(id, { stopPropagation: () => { } });
                },
                category: 'Note',
                context: 'editor' as const
            },
            {
                id: 'duplicate-note',
                label: 'Duplicate Current Note',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) handleDuplicateNote(id, { stopPropagation: () => { } });
                },
                category: 'Note',
                context: 'editor' as const
            },
            {
                id: 'export-markdown',
                label: 'Export as Markdown',
                action: () => {
                    const id = getCurrentNoteId();
                    const note = notes.find(n => n.id === id);
                    if (note) {
                        const blob = new Blob([note.content], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${note.title || 'untitled'}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast(sl ? 'Markdown exported liao' : 'Markdown exported', 'success');
                    }
                },
                category: 'Export',
                context: 'editor' as const
            },
            {
                id: 'export-pdf',
                label: 'Export as PDF',
                action: async () => {
                    const id = getCurrentNoteId();
                    const note = notes.find(n => n.id === id);
                    if (note) {
                        try {
                            showToast(sl ? 'PDF coming liao...' : 'Generating PDF...', 'info');
                            await exportToPDF(note.content, note.title || 'Untitled');
                            showToast(sl ? 'PDF done liao' : 'PDF exported successfully', 'success');
                        } catch (err) {
                            console.error('PDF export error:', err);
                            showToast(sl ? 'PDF cannot export lah' : 'Failed to export PDF', 'error');
                        }
                    }
                },
                category: 'Export',
                context: 'editor' as const
            },
            {
                id: 'export-docx',
                label: 'Export as Word Document',
                action: async () => {
                    const id = getCurrentNoteId();
                    const note = notes.find(n => n.id === id);
                    if (note) {
                        try {
                            showToast(sl ? 'DOCX coming liao...' : 'Generating DOCX...', 'info');
                            await exportToDOCX(note.content, note.title || 'Untitled');
                            showToast(sl ? 'DOCX done liao' : 'DOCX exported successfully', 'success');
                        } catch (err) {
                            console.error('DOCX export error:', err);
                            showToast(sl ? 'DOCX cannot export lah' : 'Failed to export DOCX', 'error');
                        }
                    }
                },
                category: 'Export',
                context: 'editor' as const
            },
            {
                id: 'share-note',
                label: 'Share Note (Copy Link)',
                action: () => {
                    const id = getCurrentNoteId();
                    const note = notes.find(n => n.id === id);
                    if (note) {
                        const dataToCompress = JSON.stringify({
                            title: note.title,
                            content: note.content,
                            tags: note.tags,
                            format: note.format,
                            viewMode: note.viewMode,
                            isFavorite: note.isFavorite
                        });
                        const compressed = LZString.compressToEncodedURIComponent(dataToCompress);
                        const url = `${window.location.origin}/?share=${compressed}`;
                        navigator.clipboard.writeText(url).then(() => {
                            showToast(sl ? 'Link copied liao, can share now' : 'Share link copied to clipboard!', 'success');
                        });
                    }
                },
                category: 'Share',
                context: 'editor' as const
            },
            {
                id: 'find-replace',
                label: 'Find and Replace',
                action: () => setIsFindReplaceOpen(true),
                category: 'Editor',
                context: 'editor' as const,
                shortcut: 'Cmd+Alt+F'
            },
            {
                id: 'insert-table',
                label: 'Insert Table',
                action: () => setTableModalOpen(true),
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'insert-code-block',
                label: 'Insert Code Block',
                action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-code-block' } })),
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'insert-hr',
                label: 'Insert Horizontal Rule',
                action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-horizontal-rule' } })),
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'insert-heading-auto',
                label: 'Insert Heading (Auto-Level)',
                action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-heading-auto' } })),
                category: 'Editor',
                context: 'editor' as const,
            },
            ...templates.map(t => ({
                id: `insert-template-${t.id}`,
                label: `Insert Template: ${t.name}`,
                action: () => {
                    window.dispatchEvent(new CustomEvent('yoro-editor-cmd', {
                        detail: { command: 'insert-template', content: t.content }
                    }));
                },
                category: 'Editor',
                context: 'editor' as const,
            })),
            {
                id: 'insert-mermaid-flowchart',
                label: 'Insert Flowchart',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) handleUpdateNote(id, { viewMode: 'flowchart' });
                },
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'insert-mermaid-state-diagram',
                label: 'Insert State Diagram',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) handleUpdateNote(id, { viewMode: 'state' });
                },
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'open-drawing-canvas',
                label: 'Insert Drawing',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) handleUpdateNote(id, { viewMode: 'drawing' });
                },
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'set-note-icon',
                label: 'Set Note Icon (emoji)',
                parameters: [
                    {
                        name: 'icon',
                        label: 'Emoji icon (leave empty to clear)',
                        type: 'text' as const,
                        placeholder: '📝',
                        defaultValue: ''
                    }
                ],
                action: (_params?: Record<string, string | number | boolean>) => {
                    const id = getCurrentNoteId();
                    if (!id || !_params) return;
                    const icon = String(_params['icon']).trim();
                    handleUpdateNote(id, { icon: icon || undefined });
                    showToast(icon ? `Icon set to ${icon}` : 'Icon cleared', 'success');
                },
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'set-note-color',
                label: 'Set Note Accent Color',
                parameters: [
                    {
                        name: 'color',
                        label: 'Accent color (hex/name, empty to clear)',
                        type: 'text' as const,
                        placeholder: '#007aff',
                        defaultValue: ''
                    }
                ],
                action: (_params?: Record<string, string | number | boolean>) => {
                    const id = getCurrentNoteId();
                    if (!id || !_params) return;
                    const color = String(_params['color']).trim();
                    handleUpdateNote(id, { accentColor: color || undefined });
                    showToast(color ? `Accent color set` : 'Accent color cleared', 'success');
                },
                category: 'Editor',
                context: 'editor' as const,
            },
            {
                id: 'set-word-count-goal',
                label: 'Set Word Count Goal',
                parameters: [
                    {
                        name: 'goal',
                        label: 'Target word count (0 to clear)',
                        type: 'number' as const,
                        min: 0,
                        max: 1000000,
                        defaultValue: 500,
                        placeholder: '500'
                    }
                ],
                action: (_params?: Record<string, string | number | boolean>) => {
                    const id = getCurrentNoteId();
                    if (!id || !_params) return;
                    const goal = Number(_params['goal']);
                    handleUpdateNote(id, { wordCountGoal: goal > 0 ? goal : undefined });
                    showToast(goal > 0 ? `Word goal set to ${goal}` : 'Word goal cleared', 'success');
                },
                category: 'Editor',
                context: 'editor' as const,
            },
        ] : []),
    ];
}

// Re-export analytics for external use (e.g. App.tsx handleCreateNote)
export { analytics };
