import { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import JSZip from 'jszip';
import LZString from 'lz-string';
import { parse, stringify } from 'smol-toml';
import { storage } from './utils/storage';
import { analytics } from './utils/analytics';
import { templates } from './utils/templates';
import type { AppState, Note } from './types';
import { CommandPalette, type Command, type CommandGroup } from './components/CommandPalette';
import { ParameterInputModal } from './components/ParameterInputModal';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { SimilarNotesModal } from './components/SimilarNotesModal';
import { OutlinePanel } from './components/OutlinePanel';
import { ImageLightbox } from './components/ImageLightbox';
import { PresentationMode } from './components/PresentationMode';
import { findSimilarNotes, type SearchResult } from './utils/similarity';

import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { MindMap } from './components/MindMap';
import { ConfirmationModal } from './components/ConfirmationModal';
import { FlowchartBuilder } from './components/FlowchartBuilder';
import { StateDiagramBuilder } from './components/StateDiagramBuilder';
import { TableInsertModal } from './components/TableInsertModal';
import { ToastContainer, showToast } from './components/Toast';
import { HelpManual } from './components/HelpManual';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { BacklinksPanel } from './components/BacklinksPanel';
import { exportToPDF, exportToDOCX } from './utils/exportUtils';
import './App.css';

interface NoteEditorWrapperProps {
    notes: Note[];
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
    onNavigate: (id: string) => void;
    vimMode: boolean;
    emacsMode: boolean;
    focusMode: boolean;
    focusModeBlur: boolean;
    lineWrapping: boolean;
    showLineNumbers: boolean;
    editorAlignment: 'left' | 'center' | 'right';
    showDocumentStats: boolean;
    cursorAnimations: 'none' | 'subtle' | 'particles';
    findReplaceOpen: boolean;
    onCloseFindReplace: () => void;
}

const NoteEditorWrapper: React.FC<NoteEditorWrapperProps> = ({ notes, onUpdateNote, onNavigate, vimMode, emacsMode, focusMode, focusModeBlur, lineWrapping, showLineNumbers, editorAlignment, showDocumentStats, cursorAnimations, findReplaceOpen, onCloseFindReplace }) => {
    const { id } = useParams<{ id: string }>();
    const note = notes.find(n => n.id === id);

    if (!note) return <div>Note not found</div>;

    if (note.viewMode === 'mindmap') {
        return (
            <MindMap
                markdown={note.content}
                title={note.title}
                noteId={note.id}
                onViewModeChange={(mode) => onUpdateNote(note.id, { viewMode: mode })}
                onMarkdownChange={(newMarkdown) => onUpdateNote(note.id, { content: newMarkdown })}
            />
        );
    }

    if (note.viewMode === 'flowchart') {
        return (
            <FlowchartBuilder
                note={note}
                onUpdateNote={onUpdateNote}
            />
        );
    }

    if (note.viewMode === 'state') {
        return (
            <StateDiagramBuilder
                note={note}
                onUpdateNote={onUpdateNote}
            />
        );
    }

    return (
        <Editor
            note={note}
            notes={notes}
            onChange={(content) => onUpdateNote(note.id, { content })}
            onTitleChange={(title) => onUpdateNote(note.id, { title })}
            onNavigate={onNavigate}
            onPositionChange={(cursorPos, scrollPos) => {
                onUpdateNote(note.id, {
                    lastCursorPosition: cursorPos,
                    lastScrollPosition: scrollPos
                });
            }}
            vimMode={vimMode}
            emacsMode={emacsMode}
            focusMode={focusMode}
            focusModeBlur={focusModeBlur}
            lineWrapping={lineWrapping}
            showLineNumbers={showLineNumbers}
            editorAlignment={editorAlignment}
            showDocumentStats={showDocumentStats}
            cursorAnimations={cursorAnimations}
            findReplaceOpen={findReplaceOpen}
            onCloseFindReplace={onCloseFindReplace}
        />
    );
};

function App() {
    const [data, setData] = useState<AppState>(() => {
        const loaded = storage.get() as AppState;
        return {
            ...loaded,
            preferences: {
                ...loaded.preferences,
                fontFamily: loaded.preferences.fontFamily || "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
                fontSize: loaded.preferences.fontSize || 16,
                recentCommandIds: loaded.preferences.recentCommandIds || [],
                homeViewMode: loaded.preferences.homeViewMode || '3d-carousel',
                emacsMode: loaded.preferences.emacsMode || false,
                showDocumentStats: loaded.preferences.showDocumentStats !== false,
                focusModeBlur: loaded.preferences.focusModeBlur !== false,
                cursorAnimations: loaded.preferences.cursorAnimations || 'subtle',
                sortOrder: loaded.preferences.sortOrder || 'updated',
            }
        };
    });
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isKnowledgeGraphOpen, setIsKnowledgeGraphOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [isBacklinksPanelOpen, setIsBacklinksPanelOpen] = useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);
    const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
    const [similarNotesState, setSimilarNotesState] = useState<{ isOpen: boolean; results: SearchResult[] }>({ isOpen: false, results: [] });
    const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; src: string | null; alt?: string }>({ isOpen: false, src: null });

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Compute all tags from notes
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        let hasDeleted = false;
        data.notes.forEach(note => {
            if (note.deletedAt) {
                hasDeleted = true;
            } else {
                note.tags.forEach(tag => tags.add(tag));
            }
        });
        const sorted = Array.from(tags).sort();
        if (hasDeleted) {
            sorted.push('bin');
        }
        return sorted;
    }, [data.notes]);

    useEffect(() => {
        storage.set(data);
    }, [data]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', data.preferences.theme);
    }, [data.preferences.theme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--editor-font-family', data.preferences.fontFamily);
        document.documentElement.style.setProperty('--editor-font-size', `${data.preferences.fontSize}px`);
    }, [data.preferences.fontFamily, data.preferences.fontSize]);

    useEffect(() => {
        // Auto-cleanup bin items older than 30 days
        const cleanupBin = () => {
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            setData(prev => {
                const hasExpired = prev.notes.some(n => n.deletedAt && (now - n.deletedAt > THIRTY_DAYS_MS));
                if (!hasExpired) return prev;
                return {
                    ...prev,
                    notes: prev.notes.filter(n => !n.deletedAt || (now - n.deletedAt <= THIRTY_DAYS_MS))
                };
            });
        };
        cleanupBin(); // Check on mount
        const interval = setInterval(cleanupBin, 60 * 60 * 1000); // Check every hour
        return () => clearInterval(interval);
    }, []);

    const handleUpdatePreferences = useCallback((updates: Partial<AppState['preferences']>, syncToConfig = true) => {
        setData(prev => {
            const newPrefs = { ...prev.preferences, ...updates };
            let newNotes = prev.notes;

            if (syncToConfig) {
                const configIndex = newNotes.findIndex(n => n.title === 'config.toml');
                if (configIndex >= 0) {
                    try {
                        // Only sync allowed keys
                        const configObj = {
                            theme: newPrefs.theme,
                            vimMode: newPrefs.vimMode,
                            emacsMode: newPrefs.emacsMode,
                            sidebarVisible: newPrefs.sidebarVisible,
                            showLineNumbers: newPrefs.showLineNumbers,
                            focusMode: newPrefs.focusMode,
                            focusModeBlur: newPrefs.focusModeBlur,
                            lineWrapping: newPrefs.lineWrapping,
                            editorAlignment: newPrefs.editorAlignment,
                            fontFamily: newPrefs.fontFamily,
                            fontSize: newPrefs.fontSize,
                            homeViewMode: newPrefs.homeViewMode,
                            sortOrder: newPrefs.sortOrder,
                            showDocumentStats: newPrefs.showDocumentStats,
                            cursorAnimations: newPrefs.cursorAnimations
                        };
                        const newContent = stringify(configObj);
                        if (newNotes[configIndex].content.trim() !== newContent.trim()) {
                            newNotes = [...newNotes];
                            newNotes[configIndex] = {
                                ...newNotes[configIndex],
                                content: newContent,
                                updatedAt: Date.now()
                            };
                        }
                    } catch (e) {
                        console.error('Failed to sync config to note:', e);
                    }
                }
            }

            return {
                ...prev,
                notes: newNotes,
                preferences: newPrefs
            };
        });
    }, []);

    const handleUpdateNote = useCallback((id: string, updates: Partial<Note>) => {
        setData(prev => ({
            ...prev,
            notes: prev.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)
        }));
    }, []);

    const handleCreateNote = useCallback(() => {
        const newId = crypto.randomUUID();
        setData(prev => {
            const now = Date.now();
            const newNote: Note = {
                id: newId,
                title: '',
                content: '',
                format: 'markdown',
                tags: [],
                createdAt: now,
                updatedAt: now,
                isFavorite: false,
            };
            return {
                ...prev,
                notes: [newNote, ...prev.notes]
            };
        });
        analytics.track('create_note');
        navigate(`/note/${newId}`);
    }, [navigate]);

    const handleSelectNote = useCallback((id: string) => {
        navigate(`/note/${id}`);
    }, [navigate]);

    const handleDuplicateNote = useCallback((id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const noteToDuplicate = data.notes.find(n => n.id === id);
        if (noteToDuplicate) {
            const newNote: Note = {
                ...noteToDuplicate,
                id: crypto.randomUUID(),
                title: `${noteToDuplicate.title} (Copy)`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            setData(prev => ({
                ...prev,
                notes: [newNote, ...prev.notes]
            }));
            analytics.track('duplicate_note');
        }
    }, [data.notes]);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; noteId: string | null; isPermanent: boolean }>({
        isOpen: false,
        noteId: null,
        isPermanent: false
    });

    const [tableModalOpen, setTableModalOpen] = useState(false);
    const [paramModalOpen, setParamModalOpen] = useState(false);
    const [paramModalCommand, setParamModalCommand] = useState<Command | null>(null);

    // Command groups for hierarchical palette
    const commandGroups: CommandGroup[] = useMemo(() => [], []);

    const getCurrentNoteId = useCallback(() => {
        const match = location.pathname.match(/\/note\/(.+)/);
        return match ? match[1] : null;
    }, [location.pathname]);

    const currentContext = useMemo((): 'home' | 'editor' | 'global' => {
        if (location.pathname === '/') return 'home';
        if (location.pathname.startsWith('/note/')) return 'editor';
        return 'global';
    }, [location.pathname]);

    const handleDeleteNote = useCallback((id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const note = data.notes.find(n => n.id === id);
        if (!note) return;

        if (note.deletedAt) {
            // Already in bin, confirm permanent deletion
            setDeleteConfirmation({ isOpen: true, noteId: id, isPermanent: true });
        } else {
            // Not in bin, move to bin (Soft delete)
            setData(prev => ({
                ...prev,
                notes: prev.notes.map(n => n.id === id ? { ...n, deletedAt: Date.now() } : n)
            }));
            analytics.track('move_to_bin');

            // If moved current note to bin, go home
            if (getCurrentNoteId() === id) {
                navigate('/');
            }
        }
    }, [data.notes, navigate, getCurrentNoteId]);

    const handleRestoreNote = useCallback((id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setData(prev => ({
            ...prev,
            notes: prev.notes.map(n => n.id === id ? { ...n, deletedAt: undefined } : n)
        }));
        analytics.track('restore_note');
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const shareData = params.get('share');
        if (shareData) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(shareData);
                if (decompressed) {
                    const parsed = JSON.parse(decompressed);
                    const { title, content, tags, format, viewMode, isFavorite } = parsed;
                    // Merge existing tags with 'shared' tag
                    const existingTags = Array.isArray(tags) ? tags : [];
                    const mergedTags = existingTags.includes('shared') ? existingTags : [...existingTags, 'shared'];
                    const newNote: Note = {
                        id: crypto.randomUUID(),
                        title: title || 'Shared Note',
                        content: content || '',
                        format: format || 'markdown',
                        tags: mergedTags,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        isFavorite: isFavorite || false,
                        viewMode: viewMode,
                    };
                    setTimeout(() => {
                        setData(prev => ({
                            ...prev,
                            notes: [newNote, ...prev.notes]
                        }));
                        // Clean URL and navigate
                        navigate(`/note/${newNote.id}`, { replace: true });
                    }, 0);
                }
            } catch {
                console.error('Failed to import shared note:');
                showToast('Failed to load shared note. The link might be corrupted.', 'error');
            }
        }
    }, [location.search, navigate]);

    // Sync from config.toml note to preferences
    useEffect(() => {
        const configNote = data.notes.find(n => n.title === 'config.toml');
        if (configNote) {
            try {
                const parsed = parse(configNote.content) as Partial<AppState['preferences']>;
                const updates: Partial<AppState['preferences']> = {};
                let hasUpdates = false;
                const keys: (keyof AppState['preferences'])[] = ['theme', 'vimMode', 'emacsMode', 'sidebarVisible', 'showLineNumbers', 'focusMode', 'focusModeBlur', 'lineWrapping', 'editorAlignment', 'fontFamily', 'fontSize', 'homeViewMode', 'showDocumentStats', 'cursorAnimations'];

                for (const key of keys) {
                    if (parsed[key] !== undefined && parsed[key] !== data.preferences[key]) {
                        (updates as Record<string, unknown>)[key] = parsed[key];
                        hasUpdates = true;
                    }
                }

                if (hasUpdates) {
                    setTimeout(() => handleUpdatePreferences(updates, false), 0);
                }
            } catch {
                // ignore parse errors while typing
            }
        }
    }, [data.notes, data.preferences, handleUpdatePreferences]);

    const commands: Command[] = useMemo(() => [
        {
            id: 'new-note',
            label: 'Insert New Note',
            action: () => handleCreateNote(),
            category: 'General'
        },
        {
            id: 'open-help',
            label: 'Open Help Manual',
            action: () => setIsHelpOpen(true),
            category: 'General'
        },
        {
            id: 'open-knowledge-graph',
            label: 'Open Knowledge Graph',
            action: () => setIsKnowledgeGraphOpen(true),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'open-backlinks',
            label: 'Show Backlinks',
            action: () => setIsBacklinksPanelOpen(true),
            category: 'View',
            context: 'editor' as const,
            groupId: 'view-settings'
        },
        {
            id: 'toggle-outline',
            label: 'Toggle Outline',
            action: () => setIsOutlineOpen(prev => !prev),
            category: 'View',
            context: 'editor' as const,
            groupId: 'view-settings'
        },
        {
            id: 'toggle-presentation',
            label: 'Start Presentation',
            action: () => {
                const id = getCurrentNoteId();
                if (id) {
                    navigate(`/note/${id}/presentation`);
                }
            },
            category: 'View',
            context: 'editor' as const,
            groupId: 'view-settings'
        },
        {
            id: 'open-config',
            label: 'Open Configuration (config.toml)',
            action: () => {
                const existing = data.notes.find(n => n.title === 'config.toml');
                if (existing) {
                    handleSelectNote(existing.id);
                } else {
                    // Create config note with current defaults
                    const newId = crypto.randomUUID();
                    setData(prev => {
                        const now = Date.now();
                        const configObj = {
                            theme: prev.preferences.theme,
                            vimMode: prev.preferences.vimMode,
                            emacsMode: prev.preferences.emacsMode,
                            sidebarVisible: prev.preferences.sidebarVisible,
                            showLineNumbers: prev.preferences.showLineNumbers,
                            focusMode: prev.preferences.focusMode,
                            focusModeBlur: prev.preferences.focusModeBlur,
                            lineWrapping: prev.preferences.lineWrapping,
                            editorAlignment: prev.preferences.editorAlignment,
                            fontFamily: prev.preferences.fontFamily,
                            fontSize: prev.preferences.fontSize,
                            homeViewMode: prev.preferences.homeViewMode,
                            showDocumentStats: prev.preferences.showDocumentStats,
                            cursorAnimations: prev.preferences.cursorAnimations
                        };
                        const newNote: Note = {
                            id: newId,
                            title: 'config.toml',
                            content: stringify(configObj),
                            format: 'markdown', // acts as text
                            tags: ['config'],
                            createdAt: now,
                            updatedAt: now,
                            isFavorite: false,
                        };
                        return {
                            ...prev,
                            notes: [newNote, ...prev.notes]
                        };
                    });
                    handleSelectNote(newId);
                }
            },
            category: 'General'
        },
        // Font Settings
        {
            id: 'font-sans',
            label: 'Font: Sans Serif',
            action: () => handleUpdatePreferences({ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }),
            category: 'Font',
            groupId: 'font-settings'
        },
        {
            id: 'font-serif',
            label: 'Font: Serif',
            action: () => handleUpdatePreferences({ fontFamily: 'Merriweather, Georgia, Cambria, "Times New Roman", serif' }),
            category: 'Font',
            groupId: 'font-settings'
        },
        {
            id: 'font-mono',
            label: 'Font: Monospace',
            action: () => handleUpdatePreferences({ fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace" }),
            category: 'Font',
            groupId: 'font-settings'
        },
        {
            id: 'font-size-increase',
            label: 'Font Size: Increase',
            action: () => handleUpdatePreferences({ fontSize: Math.min(data.preferences.fontSize + 2, 32) }),
            category: 'Font',
            groupId: 'font-settings'
        },
        {
            id: 'font-size-decrease',
            label: 'Font Size: Decrease',
            action: () => handleUpdatePreferences({ fontSize: Math.max(data.preferences.fontSize - 2, 10) }),
            category: 'Font',
            groupId: 'font-settings'
        },
        {
            id: 'font-size-reset',
            label: 'Font Size: Reset (16px)',
            action: () => handleUpdatePreferences({ fontSize: 16 }),
            category: 'Font',
            groupId: 'font-settings'
        },
        {
            id: 'toggle-alignment',
            label: 'Cycle Editor Alignment',
            action: () => {
                const map: Record<string, 'left' | 'center' | 'right'> = {
                    'left': 'center',
                    'center': 'right',
                    'right': 'left'
                };
                const current = data.preferences.editorAlignment || 'left';
                handleUpdatePreferences({ editorAlignment: map[current] || 'left' });
            },
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'align-left',
            label: 'Align Editor Left (Natural)',
            action: () => handleUpdatePreferences({ editorAlignment: 'left' }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'align-center',
            label: 'Align Editor Center',
            action: () => handleUpdatePreferences({ editorAlignment: 'center' }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'align-right',
            label: 'Align Editor Right',
            action: () => handleUpdatePreferences({ editorAlignment: 'right' }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'toggle-vim',
            label: 'Toggle Vim Mode',
            action: () => {
                const newVimMode = !data.preferences.vimMode;
                handleUpdatePreferences({
                    vimMode: newVimMode,
                    emacsMode: newVimMode ? false : data.preferences.emacsMode
                });
            },
            category: 'Editor',
            groupId: 'editor-settings'
        },
        {
            id: 'toggle-emacs',
            label: 'Toggle Emacs Mode',
            action: () => {
                const newEmacsMode = !data.preferences.emacsMode;
                handleUpdatePreferences({
                    emacsMode: newEmacsMode,
                    vimMode: newEmacsMode ? false : data.preferences.vimMode
                });
            },
            category: 'Editor',
            groupId: 'editor-settings'
        },
        {
            id: 'toggle-sidebar',
            label: 'Toggle Sidebar',
            action: () => handleUpdatePreferences({ sidebarVisible: !data.preferences.sidebarVisible }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'toggle-line-numbers',
            label: 'Toggle Line Numbers',
            action: () => handleUpdatePreferences({ showLineNumbers: !data.preferences.showLineNumbers }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'toggle-mindmap',
            label: 'Create Mindmap',
            action: () => {
                const id = getCurrentNoteId();
                if (id) {
                    const note = data.notes.find(n => n.id === id);
                    if (note) {
                        handleUpdateNote(id, { viewMode: note.viewMode === 'mindmap' ? 'editor' : 'mindmap' });
                    }
                }
            },
            category: 'View',
            context: 'editor' as const,
            groupId: 'view-settings'
        },
        {
            id: 'toggle-focus-mode',
            label: 'Toggle Focus Mode',
            action: () => handleUpdatePreferences({ focusMode: !data.preferences.focusMode }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'toggle-focus-mode-blur',
            label: 'Toggle Focus Mode Blur',
            action: () => handleUpdatePreferences({ focusModeBlur: !data.preferences.focusModeBlur }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'toggle-line-wrapping',
            label: 'Toggle Line Wrapping (Soft)',
            action: () => handleUpdatePreferences({ lineWrapping: !data.preferences.lineWrapping }),
            category: 'View',
            groupId: 'editor-settings'
        },
        {
            id: 'toggle-document-stats',
            label: 'Toggle Document Stats',
            action: () => handleUpdatePreferences({ showDocumentStats: !data.preferences.showDocumentStats }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'toggle-typewriter-mode',
            label: 'Toggle Typewriter Mode',
            action: () => handleUpdatePreferences({ typewriterMode: !data.preferences.typewriterMode }),
            category: 'View',
            groupId: 'view-settings'
        },
        {
            id: 'hard-wrap',
            label: 'Hard Wrap Text (80 cols)',
            action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'hard-wrap' } })),
            category: 'Editor',
            context: 'editor' as const,
            groupId: 'editor-settings'
        },
        {
            id: 'cycle-cursor-animation',
            label: 'Cycle Cursor Animation',
            action: () => {
                const current = data.preferences.cursorAnimations || 'subtle';
                const next: 'none' | 'subtle' | 'particles' =
                    current === 'none' ? 'subtle' :
                    current === 'subtle' ? 'particles' : 'none';
                handleUpdatePreferences({ cursorAnimations: next });
            },
            category: 'Editor',
            groupId: 'editor-settings'
        },
        // Home View Toggle
        {
            id: 'toggle-home-view',
            label: 'Switch Home View (2D/3D)',
            action: () => handleUpdatePreferences({
                homeViewMode: data.preferences.homeViewMode === '3d-carousel'
                    ? '2d-semicircle' : '3d-carousel'
            }),
            category: 'View',
            context: 'home' as const,
            groupId: 'view-settings'
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
        {
            id: 'theme-light',
            label: 'Theme: Yoro Light',
            action: () => handleUpdatePreferences({ theme: 'light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-dark',
            label: 'Theme: Yoro Dark',
            action: () => handleUpdatePreferences({ theme: 'dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-sepia-light',
            label: 'Theme: Sepia Light',
            action: () => handleUpdatePreferences({ theme: 'sepia-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-sepia-dark',
            label: 'Theme: Sepia Dark',
            action: () => handleUpdatePreferences({ theme: 'sepia-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-dracula-light',
            label: 'Theme: Dracula Light',
            action: () => handleUpdatePreferences({ theme: 'dracula-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-dracula-dark',
            label: 'Theme: Dracula Dark',
            action: () => handleUpdatePreferences({ theme: 'dracula-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-nord-light',
            label: 'Theme: Nord Light',
            action: () => handleUpdatePreferences({ theme: 'nord-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-nord-dark',
            label: 'Theme: Nord Dark',
            action: () => handleUpdatePreferences({ theme: 'nord-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-gruvbox-light',
            label: 'Theme: Gruvbox Light',
            action: () => handleUpdatePreferences({ theme: 'gruvbox-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-gruvbox-dark',
            label: 'Theme: Gruvbox Dark',
            action: () => handleUpdatePreferences({ theme: 'gruvbox-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-everforest-light',
            label: 'Theme: Everforest Light',
            action: () => handleUpdatePreferences({ theme: 'everforest-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-everforest-dark',
            label: 'Theme: Everforest Dark',
            action: () => handleUpdatePreferences({ theme: 'everforest-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-catppuccin-light',
            label: 'Theme: Catppuccin Light',
            action: () => handleUpdatePreferences({ theme: 'catppuccin-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-catppuccin-dark',
            label: 'Theme: Catppuccin Dark',
            action: () => handleUpdatePreferences({ theme: 'catppuccin-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-solarized-light',
            label: 'Theme: Solarized Light',
            action: () => handleUpdatePreferences({ theme: 'solarized-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-solarized-dark',
            label: 'Theme: Solarized Dark',
            action: () => handleUpdatePreferences({ theme: 'solarized-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-rose-pine-light',
            label: 'Theme: Rose Pine Light',
            action: () => handleUpdatePreferences({ theme: 'rose-pine-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-rose-pine-dark',
            label: 'Theme: Rose Pine Dark',
            action: () => handleUpdatePreferences({ theme: 'rose-pine-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-tokyo-night-light',
            label: 'Theme: Tokyo Night Light',
            action: () => handleUpdatePreferences({ theme: 'tokyo-night-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-tokyo-night-dark',
            label: 'Theme: Tokyo Night Dark',
            action: () => handleUpdatePreferences({ theme: 'tokyo-night-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-kanagawa-light',
            label: 'Theme: Kanagawa Light',
            action: () => handleUpdatePreferences({ theme: 'kanagawa-light' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'theme-kanagawa-dark',
            label: 'Theme: Kanagawa Dark',
            action: () => handleUpdatePreferences({ theme: 'kanagawa-dark' }),
            category: 'Theme',
            groupId: 'theme-settings'
        },
        {
            id: 'go-home',
            label: 'Go to Home',
            action: () => {
                // Close all overlays
                setIsKnowledgeGraphOpen(false);
                setIsHelpOpen(false);
                setIsBacklinksPanelOpen(false);
                setIsOutlineOpen(false);
                setIsFindReplaceOpen(false);
                setIsQuickCaptureOpen(false);
                navigate('/');
            },
            category: 'Navigation'
        },
        // Open Bin Command
        ...(data.notes.some(n => n.deletedAt) ? [{
            id: 'open-bin',
            label: 'Open Bin',
            action: () => {
                navigate('/');
                const event = new CustomEvent('yoro-open-bin');
                window.dispatchEvent(event);
            },
            category: 'Navigation'
        }] : []),
        // Note Navigation Commands (exclude config.toml - has its own command)
        ...data.notes.filter(n => n.title !== 'config.toml').map(note => ({
            id: `open-note-${note.id}`,
            label: `Open Note: ${note.title || 'Untitled'}`,
            action: () => handleSelectNote(note.id),
            category: 'Navigation'
        })),
        // Note Operations (exclude config.toml)
        ...data.notes.filter(n => n.title !== 'config.toml').map(note => ({
            id: `duplicate-note-${note.id}`,
            label: `Duplicate Note: ${note.title || 'Untitled'}`,
            action: () => handleDuplicateNote(note.id),
            category: 'Note Operations'
        })),
        ...data.notes.filter(n => n.deletedAt && n.title !== 'config.toml').map(note => ({
            id: `restore-note-${note.id}`,
            label: `Restore Note: ${note.title || 'Untitled'}`,
            action: () => handleRestoreNote(note.id),
            category: 'Note Operations'
        })),
        ...data.notes.filter(n => n.title !== 'config.toml').map(note => ({
            id: `delete-note-${note.id}`,
            label: note.deletedAt
                ? `Permanently Delete Note: ${note.title || 'Untitled'}`
                : `Delete Note: ${note.title || 'Untitled'}`,
            action: () => handleDeleteNote(note.id),
            category: 'Note Operations'
        })),
        // Global Export
        {
            id: 'export-all',
            label: 'Export All Notes (ZIP)',
            action: async () => {
                const zip = new JSZip();
                data.notes.forEach(note => {
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
            },
            category: 'Export'
        },
        // Current Note Actions (editor context)
        ...(getCurrentNoteId() ? [
            {
                id: 'delete-note',
                label: 'Delete Current Note',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) handleDeleteNote(id, { stopPropagation: () => { } } as React.MouseEvent);
                },
                category: 'Note',
                context: 'editor' as const
            },
            {
                id: 'duplicate-note',
                label: 'Duplicate Current Note',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) handleDuplicateNote(id, { stopPropagation: () => { } } as React.MouseEvent);
                },
                category: 'Note',
                context: 'editor' as const
            },
            {
                id: 'export-markdown',
                label: 'Export as Markdown',
                action: () => {
                    const id = getCurrentNoteId();
                    const note = data.notes.find(n => n.id === id);
                    if (note) {
                        const blob = new Blob([note.content], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${note.title || 'untitled'}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
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
                    const note = data.notes.find(n => n.id === id);
                    if (note) {
                        try {
                            showToast('Generating PDF...', 'success');
                            await exportToPDF(note.content, note.title || 'Untitled');
                            showToast('PDF exported successfully', 'success');
                        } catch (err) {
                            console.error('PDF export error:', err);
                            showToast('Failed to export PDF', 'error');
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
                    const note = data.notes.find(n => n.id === id);
                    if (note) {
                        try {
                            showToast('Generating DOCX...', 'success');
                            await exportToDOCX(note.content, note.title || 'Untitled');
                            showToast('DOCX exported successfully', 'success');
                        } catch (err) {
                            console.error('DOCX export error:', err);
                            showToast('Failed to export DOCX', 'error');
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
                    const note = data.notes.find(n => n.id === id);
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
                            showToast('Share link copied to clipboard!', 'success');
                        });
                    }
                },
                category: 'Share',
                context: 'editor' as const
            },
            // Find and Replace
            {
                id: 'find-replace',
                label: 'Find and Replace',
                action: () => setIsFindReplaceOpen(true),
                            category: 'Editor',
                            context: 'editor' as const,
                            groupId: 'editor-settings',
                            shortcut: 'Cmd+h'
                        },
                        {
                            id: 'find-similar',
                            label: 'Show Similar Notes',
                            action: () => {
                                const id = getCurrentNoteId();
                                const note = data.notes.find(n => n.id === id);
                                if (note) {
                                    const results = findSimilarNotes(note, data.notes);
                                    setSimilarNotesState({ isOpen: true, results });
                                }
                            },
                            category: 'Note',
                            context: 'editor' as const
                        },
                        // Editor Insert Commands
                        {
                            id: 'insert-table',
                
                label: 'Insert Table',
                action: () => setTableModalOpen(true),
                category: 'Editor',
                context: 'editor' as const,
                groupId: 'editor-settings'
            },
            {
                id: 'insert-code-block',
                label: 'Insert Code Block',
                action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-code-block' } })),
                category: 'Editor',
                context: 'editor' as const,
                groupId: 'editor-settings'
            },
            {
                id: 'insert-hr',
                label: 'Insert Horizontal Rule',
                action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-horizontal-rule' } })),
                category: 'Editor',
                context: 'editor' as const,
                groupId: 'editor-settings'
            },
            {
                id: 'insert-heading-auto',
                label: 'Insert Heading (Auto-Level)',
                action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-heading-auto' } })),
                            category: 'Editor',
                            context: 'editor' as const,
                            groupId: 'editor-settings'
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
                            groupId: 'editor-settings'
                        })),
                        {
                            id: 'insert-mermaid-flowchart',
                
                label: 'Insert Flowchart',
                action: () => {
                    const id = getCurrentNoteId();
                    if (id) {
                        handleUpdateNote(id, { viewMode: 'flowchart' });
                    }
                },
                category: 'Editor',
                context: 'editor' as const,
                groupId: 'editor-settings'
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
                groupId: 'editor-settings'
            }
        ] : [])
    ], [data.notes, data.preferences, handleCreateNote, handleSelectNote, handleDuplicateNote, handleDeleteNote, getCurrentNoteId, handleUpdatePreferences, handleUpdateNote, handleRestoreNote, navigate]);

    const matchShortcut = useCallback((e: KeyboardEvent, shortcut: string) => {
        const parts = shortcut.split('+');
        const key = parts[parts.length - 1].toLowerCase();
        const needsCmd = parts.includes('Cmd') || parts.includes('Ctrl');
        const needsShift = parts.includes('Shift');
        const needsAlt = parts.includes('Alt');

        return (
            e.key.toLowerCase() === key &&
            ((e.metaKey || e.ctrlKey) === needsCmd) &&
            (e.shiftKey === needsShift) &&
            (e.altKey === needsAlt)
        );
    }, []);

    const handleQuickCapture = useCallback((text: string) => {
        const newId = crypto.randomUUID();
        const now = Date.now();
        // Extract first line as title if possible
        const lines = text.split('\n');
        const title = lines[0]?.slice(0, 50) || 'Quick Capture';
        
        const newNote: Note = {
            id: newId,
            title: title,
            content: text,
            format: 'markdown',
            tags: ['inbox'],
            createdAt: now,
            updatedAt: now,
            isFavorite: false,
        };
        
        setData(prev => ({
            ...prev,
            notes: [newNote, ...prev.notes]
        }));
        analytics.track('quick_capture');
        showToast('Saved to Inbox', 'success');
    }, []);

    useEffect(() => {
        const handleImageClick = (e: CustomEvent) => {
            const { src, alt } = e.detail;
            setLightboxState({ isOpen: true, src, alt });
        };

        window.addEventListener('yoro-image-click', handleImageClick as EventListener);
        return () => window.removeEventListener('yoro-image-click', handleImageClick as EventListener);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Quick Capture: Cmd+Shift+I
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                setIsQuickCaptureOpen(true);
                return;
            }

            // Global shortcuts not in commands list (yet)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
                return;
            }

            // Cmd+H: Find and Replace (only in editor context)
            if ((e.metaKey || e.ctrlKey) && (e.key === 'h' || e.key === 'H') && !e.shiftKey) {
                if (location.pathname.startsWith('/note/')) {
                    e.preventDefault();
                    setIsFindReplaceOpen(prev => !prev);
                    return;
                }
            }

            // Check commands
            for (const cmd of commands) {
                if (cmd.shortcut && matchShortcut(e, cmd.shortcut)) {
                    e.preventDefault();
                    cmd.action();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commands, isPaletteOpen, matchShortcut]);

    const handleConfirmDelete = () => {
        if (deleteConfirmation.noteId) {
            const id = deleteConfirmation.noteId;
            // Permanent delete
            setData(prev => ({
                ...prev,
                notes: prev.notes.filter(n => n.id !== id)
            }));
            analytics.track('delete_note_permanent');

            // If we deleted the current note, navigate home
            if (getCurrentNoteId() === id) {
                navigate('/');
            }
        }
        setDeleteConfirmation({ isOpen: false, noteId: null, isPermanent: false });
    };

    const handleSidebarCommand = (command: string) => {
        if (command === 'insert-table') {
            setTableModalOpen(true);
        } else {
            window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command } }));
        }
    };

    const handleTableInsert = (rows: number, cols: number) => {
        window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-table', rows, cols } }));
    };

    const handleCommandExecuted = (id: string) => {
        setData(prev => {
            const recent = [id, ...(prev.preferences.recentCommandIds || []).filter(cid => cid !== id)].slice(0, 5);
            return {
                ...prev,
                preferences: {
                    ...prev.preferences,
                    recentCommandIds: recent
                }
            };
        });
    };

    return (
        <div className="app-container">
            <Routes>
                <Route path="/" element={
                    <NoteList
                        notes={data.notes}
                        onSelectNote={handleSelectNote}
                        onDeleteNote={handleDeleteNote}
                        onDuplicateNote={handleDuplicateNote}
                        onRestoreNote={handleRestoreNote}
                        searchQuery={searchQuery}
                        selectedTag={selectedTag}
                        onTagChange={setSelectedTag}
                        viewMode={data.preferences.homeViewMode}
                        sortOrder={data.preferences.sortOrder}
                    />
                } />
                <Route path="/note/:id" element={
                    <div className="main-editor-layout" style={{ display: 'flex', height: '100%', width: '100%' }}>
                        <NoteEditorWrapper
                            notes={data.notes}
                            onUpdateNote={handleUpdateNote}
                            onNavigate={handleSelectNote}
                            vimMode={data.preferences.vimMode}
                            emacsMode={data.preferences.emacsMode}
                            focusMode={data.preferences.focusMode}
                            focusModeBlur={data.preferences.focusModeBlur ?? true}
                            lineWrapping={data.preferences.lineWrapping}
                            showLineNumbers={data.preferences.showLineNumbers}
                            editorAlignment={data.preferences.editorAlignment}
                            showDocumentStats={data.preferences.showDocumentStats}
                            typewriterMode={data.preferences.typewriterMode}
                            cursorAnimations={data.preferences.cursorAnimations ?? 'subtle'}
                            findReplaceOpen={isFindReplaceOpen}
                            onCloseFindReplace={() => setIsFindReplaceOpen(false)}
                        />
                        <Sidebar isVisible={data.preferences.sidebarVisible} onCommand={handleSidebarCommand} />
                    </div>
                } />
                <Route path="/note/:id/presentation" element={
                    <PresentationMode notes={data.notes} theme={data.preferences.theme} />
                } />
            </Routes>
            <CommandPalette
                isOpen={isPaletteOpen}
                onClose={() => setIsPaletteOpen(false)}
                commands={commands}
                recentCommandIds={data.preferences.recentCommandIds}
                onCommandExecuted={handleCommandExecuted}
                onSearchChange={setSearchQuery}
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
                allTags={allTags}
                currentContext={currentContext}
                commandGroups={commandGroups}
                onOpenParameterModal={(cmd) => {
                    setParamModalCommand(cmd);
                    setParamModalOpen(true);
                }}
            />

            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                title={deleteConfirmation.isPermanent ? "Permanently Delete" : "Delete Note"}
                message={deleteConfirmation.isPermanent
                    ? "Are you sure you want to permanently delete this note from the bin? This action cannot be undone."
                    : "Are you sure you want to move this note to the bin?"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirmation({ isOpen: false, noteId: null, isPermanent: false })}
            />

            <TableInsertModal
                isOpen={tableModalOpen}
                onClose={() => setTableModalOpen(false)}
                onInsert={handleTableInsert}
            />

            <ParameterInputModal
                isOpen={paramModalOpen}
                onClose={() => {
                    setParamModalOpen(false);
                    setParamModalCommand(null);
                }}
                command={paramModalCommand}
                onSubmit={(cmd, params) => {
                    cmd.action(params);
                    handleCommandExecuted(cmd.id);
                }}
            />

            <ToastContainer />

            <HelpManual
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                vimMode={data.preferences.vimMode}
                emacsMode={data.preferences.emacsMode}
            />

            <QuickCaptureModal
                isOpen={isQuickCaptureOpen}
                onClose={() => setIsQuickCaptureOpen(false)}
                onCapture={handleQuickCapture}
            />

            <SimilarNotesModal
                isOpen={similarNotesState.isOpen}
                onClose={() => setSimilarNotesState(prev => ({ ...prev, isOpen: false }))}
                results={similarNotesState.results}
                onLink={(note) => {
                    window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { 
                        detail: { command: 'insert-text', text: `[[${note.title || 'Untitled'}]]` } 
                    }));
                    setSimilarNotesState(prev => ({ ...prev, isOpen: false }));
                }}
            />

            {isKnowledgeGraphOpen && (
                <KnowledgeGraph
                    notes={data.notes}
                    onNavigate={(id) => {
                        setIsKnowledgeGraphOpen(false);
                        handleSelectNote(id);
                    }}
                    onClose={() => setIsKnowledgeGraphOpen(false)}
                />
            )}

            <BacklinksPanel
                isOpen={isBacklinksPanelOpen}
                onClose={() => setIsBacklinksPanelOpen(false)}
                currentNote={data.notes.find(n => n.id === getCurrentNoteId()) || null}
                notes={data.notes}
                onNavigate={(id) => {
                    setIsBacklinksPanelOpen(false);
                    handleSelectNote(id);
                }}
            />

            <OutlinePanel
                isOpen={isOutlineOpen}
                onClose={() => setIsOutlineOpen(false)}
                content={data.notes.find(n => n.id === getCurrentNoteId())?.content || ''}
                noteId={getCurrentNoteId() || ''}
            />

            <ImageLightbox
                src={lightboxState.src}
                alt={lightboxState.alt}
                onClose={() => setLightboxState({ isOpen: false, src: null })}
            />
        </div>
    );
}

export default App;