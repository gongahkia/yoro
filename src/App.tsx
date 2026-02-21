import { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import LZString from 'lz-string';
import { parse, stringify } from 'smol-toml';
import { storage } from './utils/storage';
import { analytics } from './utils/analytics';
import { generateConfigTemplate } from './utils/configTemplate';
import { createCommands } from './commands';
import { SinglishContext } from './contexts/SinglishContext';
import type { AppState, Note } from './types';
import { CommandPalette, type Command, type CommandGroup } from './components/CommandPalette';
import { ParameterInputModal } from './components/ParameterInputModal';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { OutlinePanel } from './components/OutlinePanel';
import { ImageLightbox } from './components/ImageLightbox';
import { PresentationMode } from './components/PresentationMode';
import { NoteList } from './components/NoteList';
import { NoteEditorWrapper } from './components/NoteEditorWrapper';
import { AboutModal } from './components/AboutModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { TableInsertModal } from './components/TableInsertModal';
import { ToastContainer, showToast } from './components/Toast';
import { HelpManual } from './components/HelpManual';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { BacklinksPanel } from './components/BacklinksPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileWarning } from './components/MobileWarning';
import './App.css';

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
                recentNoteIds: loaded.preferences.recentNoteIds || [],
                homeViewMode: loaded.preferences.homeViewMode || '3d-carousel',
                emacsMode: loaded.preferences.emacsMode || false,
                showDocumentStats: loaded.preferences.showDocumentStats !== false,
                focusModeBlur: loaded.preferences.focusModeBlur !== false,
                cursorAnimations: loaded.preferences.cursorAnimations || 'subtle',
                sortOrder: loaded.preferences.sortOrder || 'updated',
                singlish: loaded.preferences.singlish || false,
            }
        };
    });
    const sl = data.preferences.singlish ?? false;
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [isKnowledgeGraphOpen, setIsKnowledgeGraphOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [isBacklinksPanelOpen, setIsBacklinksPanelOpen] = useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);
    const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
    const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; src: string | null; alt?: string }>({ isOpen: false, src: null });

    const [isHydrating, setIsHydrating] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Compute all tags from notes
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        data.notes.forEach(note => { note.tags.forEach(tag => tags.add(tag)); });
        return Array.from(tags).sort();
    }, [data.notes]);

    useEffect(() => {
        storage.set(data);
    }, [data]);

    useEffect(() => {
        // Flip off the hydration skeleton after the first paint
        const raf = requestAnimationFrame(() => setIsHydrating(false));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', data.preferences.theme);
    }, [data.preferences.theme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--editor-font-family', data.preferences.fontFamily);
        document.documentElement.style.setProperty('--editor-font-size', `${data.preferences.fontSize}px`);
    }, [data.preferences.fontFamily, data.preferences.fontSize]);


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
        showToast(sl ? 'Note created liao' : 'Note created', 'success');
        navigate(`/note/${newId}`);
    }, [navigate]);

    const handleReorderNotes = useCallback((orderedIds: string[]) => {
        setData(prev => {
            const idToNote = new Map(prev.notes.map(n => [n.id, n]));
            const reordered = orderedIds.map(id => idToNote.get(id)!).filter(Boolean);
            const untouched = prev.notes.filter(n => !orderedIds.includes(n.id));
            return { ...prev, notes: [...reordered, ...untouched] };
        });
    }, []);

    const handlePinNote = useCallback((id: string) => {
        setData(prev => ({
            ...prev,
            notes: prev.notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n)
        }));
    }, []);

    const handleImportNotes = useCallback((importedNotes: Note[]) => {
        if (importedNotes.length === 0) return;
        setData(prev => ({
            ...prev,
            notes: [...importedNotes, ...prev.notes]
        }));
        const msg = importedNotes.length === 1
            ? `Imported "${importedNotes[0].title || 'Untitled'}"`
            : `Imported ${importedNotes.length} notes`;
        showToast(msg, 'success');
    }, []);

    const handleSelectNote = useCallback((id: string) => {
        setData(prev => {
            const recent = [id, ...(prev.preferences.recentNoteIds || []).filter(r => r !== id)].slice(0, 5);
            return { ...prev, preferences: { ...prev.preferences, recentNoteIds: recent } };
        });
        navigate(`/note/${id}`);
    }, [navigate]);

    const handleDuplicateNote = useCallback((id: string, e?: { stopPropagation: () => void }) => {
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
            showToast(sl ? `"${noteToDuplicate.title || 'Untitled'}" copied liao` : `"${noteToDuplicate.title || 'Untitled'}" duplicated`, 'success');
        }
    }, [data.notes]);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; noteId: string | null; isPermanent: boolean }>({ isOpen: false, noteId: null, isPermanent: true });

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

    const handleDeleteNote = useCallback((id: string, e?: { stopPropagation: () => void }) => {
        e?.stopPropagation();
        const note = data.notes.find(n => n.id === id);
        if (!note) return;
        setDeleteConfirmation({ isOpen: true, noteId: id, isPermanent: true });
    }, [data.notes]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const shareData = params.get('share');
        if (shareData) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(shareData);
                if (decompressed) {
                    const parsed = JSON.parse(decompressed);
                    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                        throw new Error('Invalid share data');
                    }
                    // Validate and sanitize individual fields to prevent prototype pollution
                    const title = typeof parsed.title === 'string' ? parsed.title.slice(0, 500) : 'Shared Note';
                    const content = typeof parsed.content === 'string' ? parsed.content.slice(0, 1_000_000) : '';
                    const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
                    const tags = rawTags
                        .filter((t: unknown) => typeof t === 'string')
                        .map((t: string) => t.slice(0, 100)) as string[];
                    const VALID_FORMATS = ['markdown', 'canvas'] as const;
                    const format = VALID_FORMATS.includes(parsed.format) ? parsed.format : 'markdown';
                    const VALID_VIEW_MODES = ['editor', 'mindmap', 'flowchart', 'state', 'drawing'] as const;
                    const viewMode = VALID_VIEW_MODES.includes(parsed.viewMode) ? parsed.viewMode : undefined;
                    const isFavorite = parsed.isFavorite === true;
                    // Merge existing tags with 'shared' tag
                    const existingTags = tags;
                    const mergedTags = existingTags.includes('shared') ? existingTags : [...existingTags, 'shared'];
                    const newNote: Note = {
                        id: crypto.randomUUID(),
                        title,
                        content,
                        format,
                        tags: mergedTags,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        isFavorite,
                        viewMode,
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
                showToast(sl ? 'Cannot load lah, link jialat liao' : 'Failed to load shared note. Link may be corrupted.', 'error');
            }
        }
    }, [location.search, navigate]);

    // Sync from config.toml note to preferences (debounced 300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            const configNote = data.notes.find(n => n.title === 'config.toml');
            if (configNote) {
                try {
                    const parsed = parse(configNote.content) as Record<string, unknown>;
                    const updates: Partial<AppState['preferences']> = {};
                    let hasUpdates = false;

                    const VALID_THEMES = ['light', 'dark', 'sepia-light', 'sepia-dark', 'dracula-light', 'dracula-dark', 'nord-light', 'nord-dark', 'solarized-light', 'solarized-dark', 'gruvbox-light', 'gruvbox-dark', 'everforest-light', 'everforest-dark', 'catppuccin-light', 'catppuccin-dark', 'rose-pine-light', 'rose-pine-dark', 'tokyo-night-light', 'tokyo-night-dark', 'kanagawa-light', 'kanagawa-dark', 'monokai-light', 'monokai-dark', 'ayu-light', 'ayu-dark', 'one-light', 'one-dark', 'zenburn-light', 'zenburn-dark', 'palenight-light', 'palenight-dark', 'material-light', 'material-dark'];
                    const isString = (v: unknown): v is string => typeof v === 'string';
                    const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
                    const isNum = (v: unknown): v is number => typeof v === 'number' && !isNaN(v);
                    const isOneOf = <T extends string>(v: unknown, options: readonly T[]): v is T => isString(v) && (options as readonly string[]).includes(v);

                    if (isOneOf(parsed.theme, VALID_THEMES) && parsed.theme !== data.preferences.theme) { updates.theme = parsed.theme; hasUpdates = true; }
                    if (isBool(parsed.vimMode) && parsed.vimMode !== data.preferences.vimMode) { updates.vimMode = parsed.vimMode; hasUpdates = true; }
                    if (isBool(parsed.emacsMode) && parsed.emacsMode !== data.preferences.emacsMode) { updates.emacsMode = parsed.emacsMode; hasUpdates = true; }
                    if (isBool(parsed.showLineNumbers) && parsed.showLineNumbers !== data.preferences.showLineNumbers) { updates.showLineNumbers = parsed.showLineNumbers; hasUpdates = true; }
                    if (isBool(parsed.focusMode) && parsed.focusMode !== data.preferences.focusMode) { updates.focusMode = parsed.focusMode; hasUpdates = true; }
                    if (isBool(parsed.focusModeBlur) && parsed.focusModeBlur !== data.preferences.focusModeBlur) { updates.focusModeBlur = parsed.focusModeBlur; hasUpdates = true; }
                    if (isBool(parsed.lineWrapping) && parsed.lineWrapping !== data.preferences.lineWrapping) { updates.lineWrapping = parsed.lineWrapping; hasUpdates = true; }
                    if (isOneOf(parsed.editorAlignment, ['left', 'center', 'right'] as const) && parsed.editorAlignment !== data.preferences.editorAlignment) { updates.editorAlignment = parsed.editorAlignment; hasUpdates = true; }
                    if (isString(parsed.fontFamily) && parsed.fontFamily !== data.preferences.fontFamily) { updates.fontFamily = parsed.fontFamily; hasUpdates = true; }
                    if (isNum(parsed.fontSize) && parsed.fontSize >= 8 && parsed.fontSize <= 32 && parsed.fontSize !== data.preferences.fontSize) { updates.fontSize = parsed.fontSize; hasUpdates = true; }
                    if (isOneOf(parsed.homeViewMode, ['3d-carousel', '2d-semicircle'] as const) && parsed.homeViewMode !== data.preferences.homeViewMode) { updates.homeViewMode = parsed.homeViewMode; hasUpdates = true; }
                    if (isOneOf(parsed.sortOrder, ['updated', 'created', 'alpha', 'alpha-reverse'] as const) && parsed.sortOrder !== data.preferences.sortOrder) { updates.sortOrder = parsed.sortOrder; hasUpdates = true; }
                    if (isBool(parsed.showDocumentStats) && parsed.showDocumentStats !== data.preferences.showDocumentStats) { updates.showDocumentStats = parsed.showDocumentStats; hasUpdates = true; }
                    if (isOneOf(parsed.cursorAnimations, ['none', 'subtle', 'particles'] as const) && parsed.cursorAnimations !== data.preferences.cursorAnimations) { updates.cursorAnimations = parsed.cursorAnimations; hasUpdates = true; }

                    if (hasUpdates) {
                        handleUpdatePreferences(updates, false);
                    }
                } catch {
                    // ignore parse errors while typing
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [data.notes, data.preferences, handleUpdatePreferences]);

    const handleOpenConfig = useCallback(() => {
        const existing = data.notes.find(n => n.title === 'config.toml');
        if (existing) {
            handleSelectNote(existing.id);
        } else {
            const newId = crypto.randomUUID();
            setData(prev => {
                const now = Date.now();
                const newNote: Note = {
                    id: newId,
                    title: 'config.toml',
                    content: generateConfigTemplate(prev.preferences),
                    format: 'markdown',
                    tags: ['config'],
                    createdAt: now,
                    updatedAt: now,
                    isFavorite: false,
                };
                return { ...prev, notes: [newNote, ...prev.notes] };
            });
            handleSelectNote(newId);
        }
    }, [data.notes, handleSelectNote]);

    const commands: Command[] = useMemo(() => createCommands({
        notes: data.notes,
        preferences: data.preferences,
        navigate,
        getCurrentNoteId,
        handleCreateNote,
        handleSelectNote,
        handleUpdateNote,
        handleDeleteNote,
        handleDuplicateNote,
        handleUpdatePreferences,
        handleImportNotes,
        handleOpenConfig,
        setIsHelpOpen,
        setIsAboutOpen,
        setIsKnowledgeGraphOpen,
        setIsFindReplaceOpen,
        setIsBacklinksPanelOpen,
        setIsOutlineOpen,
        setIsQuickCaptureOpen,
        setTableModalOpen,
    }), [data.notes, data.preferences, handleCreateNote, handleSelectNote, handleDuplicateNote, handleDeleteNote, getCurrentNoteId, handleUpdatePreferences, handleImportNotes, handleUpdateNote, navigate, handleOpenConfig]);


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
        showToast(sl ? 'Saved to inbox liao' : 'Saved to Inbox', 'success');
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

            // Cmd+/ — open keyboard shortcut cheatsheet
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                setIsHelpOpen(prev => !prev);
                return;
            }

            // Global shortcuts: Cmd+Shift+P or Cmd+K to open command palette
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
                return;
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K') && !e.shiftKey) {
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
            const note = data.notes.find(n => n.id === id);
            // Permanent delete
            setData(prev => ({
                ...prev,
                notes: prev.notes.filter(n => n.id !== id)
            }));
            analytics.track('delete_note');
            showToast(sl ? `"${note?.title || 'Untitled'}" delete liao` : `"${note?.title || 'Untitled'}" deleted`, 'info');
            if (getCurrentNoteId() === id) navigate('/');
        }
        setDeleteConfirmation({ isOpen: false, noteId: null, isPermanent: true });
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
        <SinglishContext.Provider value={data.preferences.singlish ?? false}>
        <div className="app-container">
            <a href="#main-content" className="skip-to-content">Skip to content</a>
            <MobileWarning />
            <main id="main-content">
            <Routes>
                <Route path="/" element={
                    <NoteList
                        notes={data.notes}
                        onSelectNote={handleSelectNote}
                        onDeleteNote={handleDeleteNote}
                        onDuplicateNote={handleDuplicateNote}
                        onPinNote={handlePinNote}
                        onReorderNotes={handleReorderNotes}
                        isLoading={isHydrating}
                        searchQuery={searchQuery}
                        selectedTag={selectedTag}
                        onTagChange={setSelectedTag}
                        viewMode={data.preferences.homeViewMode}
                        sortOrder={data.preferences.sortOrder}
                    />
                } />
                <Route path="/note/:id" element={
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
                        cursorAnimations={data.preferences.cursorAnimations ?? 'subtle'}
                        findReplaceOpen={isFindReplaceOpen}
                        onCloseFindReplace={() => setIsFindReplaceOpen(false)}
                    />
                } />
                <Route path="/note/:id/presentation" element={
                    <ErrorBoundary>
                        <PresentationMode notes={data.notes} theme={data.preferences.theme} />
                    </ErrorBoundary>
                } />
            </Routes>
            </main>
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
                title={sl ? 'Delete or not?' : 'Delete Note'}
                message={sl ? 'Delete liao cannot undo one leh. Sure anot?' : 'Are you sure you want to permanently delete this note? This action cannot be undone.'}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirmation({ isOpen: false, noteId: null, isPermanent: true })}
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

            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

            <QuickCaptureModal
                isOpen={isQuickCaptureOpen}
                onClose={() => setIsQuickCaptureOpen(false)}
                onCapture={handleQuickCapture}
            />

            {isKnowledgeGraphOpen && (
                <ErrorBoundary>
                    <KnowledgeGraph
                        notes={data.notes}
                        onNavigate={(id) => {
                            setIsKnowledgeGraphOpen(false);
                            handleSelectNote(id);
                        }}
                        onClose={() => setIsKnowledgeGraphOpen(false)}
                    />
                </ErrorBoundary>
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
                content={data.notes.find(n => n.id === getCurrentNoteId())?.content || ''}
                noteId={getCurrentNoteId() || ''}
            />

            <ImageLightbox
                src={lightboxState.src}
                alt={lightboxState.alt}
                onClose={() => setLightboxState({ isOpen: false, src: null })}
            />
        </div>
        </SinglishContext.Provider>
    );
}

export default App;