import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import LZString from 'lz-string';
import { storage } from './utils/storage';
import { analytics } from './utils/analytics';
import { createCommands } from './commands';
import { SinglishContext } from './contexts/SinglishContext';
import type { AppState, Note } from './types';
import { CommandPalette, type Command } from './components/CommandPalette';
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
import { ImageToolbar, type SelectedImage } from './components/ImageToolbar';
import './App.css';

function parseAlt(alt: string) {
    const parts = alt.split('|');
    return {
        baseAlt: parts[0] || '',
        width: parts[1] ? parseInt(parts[1]) : undefined,
        align: (parts[2] || 'left') as 'left' | 'center' | 'right',
    };
}

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
                homeViewMode: loaded.preferences.homeViewMode || 'docs-list',
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
    const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

    const [isHydrating, setIsHydrating] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // keep a ref to current data for event handlers without stale closures
    const dataRef = useRef(data);
    useEffect(() => { dataRef.current = data; }, [data]);

    // track unsaved state (set true on note edit, false after yoro-save)
    const hasUnsavedRef = useRef(false);

    // Compute all tags from notes
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        data.notes.forEach(note => { note.tags.forEach(tag => tags.add(tag)); });
        return Array.from(tags).sort();
    }, [data.notes]);

    useEffect(() => {
        // flip off the hydration skeleton after the first paint
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

    useEffect(() => {
        const bg = data.preferences.customBackground;
        if (bg) {
            document.documentElement.style.setProperty('--custom-bg', bg);
            document.documentElement.setAttribute('data-custom-bg', '1');
        } else {
            document.documentElement.style.removeProperty('--custom-bg');
            document.documentElement.removeAttribute('data-custom-bg');
        }
    }, [data.preferences.customBackground]);

    // explicit save via yoro-save event (dispatched by :w / Ctrl+S)
    useEffect(() => {
        const handleSave = () => {
            storage.set(dataRef.current);
            hasUnsavedRef.current = false;
            window.dispatchEvent(new Event('yoro-data-saved'));
        };
        window.addEventListener('yoro-save', handleSave);
        return () => window.removeEventListener('yoro-save', handleSave);
    }, []);

    // warn before unload if unsaved changes exist
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // close all panels when navigating home
    useEffect(() => {
        if (location.pathname === '/') {
            setIsKnowledgeGraphOpen(false);
            setIsBacklinksPanelOpen(false);
            setIsOutlineOpen(false);
            setIsFindReplaceOpen(false);
            setSelectedImage(null);
        }
    }, [location.pathname]);

    const handleUpdatePreferences = useCallback((updates: Partial<AppState['preferences']>) => {
        setData(prev => ({
            ...prev,
            preferences: { ...prev.preferences, ...updates }
        }));
    }, []);

    const handleUpdateNote = useCallback((id: string, updates: Partial<Note>) => {
        setData(prev => ({
            ...prev,
            notes: prev.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)
        }));
        hasUnsavedRef.current = true;
    }, []);

    // position-only update: doesn't mark unsaved, doesn't change updatedAt
    const handleUpdateNotePosition = useCallback((id: string, cursorPos: number, scrollPos: number) => {
        setData(prev => ({
            ...prev,
            notes: prev.notes.map(n => n.id === id
                ? { ...n, lastCursorPosition: cursorPos, lastScrollPosition: scrollPos }
                : n)
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
            return { ...prev, notes: [newNote, ...prev.notes] };
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
        setData(prev => ({ ...prev, notes: [...importedNotes, ...prev.notes] }));
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
            setData(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
            analytics.track('duplicate_note');
            showToast(sl ? `"${noteToDuplicate.title || 'Untitled'}" copied liao` : `"${noteToDuplicate.title || 'Untitled'}" duplicated`, 'success');
        }
    }, [data.notes]);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; noteId: string | null; isPermanent: boolean }>({ isOpen: false, noteId: null, isPermanent: true });

    const [tableModalOpen, setTableModalOpen] = useState(false);
    const [paramModalOpen, setParamModalOpen] = useState(false);
    const [paramModalCommand, setParamModalCommand] = useState<Command | null>(null);

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
                    const mergedTags = tags.includes('shared') ? tags : [...tags, 'shared'];
                    const newNote: Note = {
                        id: crypto.randomUUID(),
                        title, content, format,
                        tags: mergedTags,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        isFavorite, viewMode,
                    };
                    setTimeout(() => {
                        setData(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
                        navigate(`/note/${newNote.id}`, { replace: true });
                    }, 0);
                }
            } catch {
                console.error('Failed to import shared note:');
                showToast(sl ? 'Cannot load lah, link jialat liao' : 'Failed to load shared note. Link may be corrupted.', 'error');
            }
        }
    }, [location.search, navigate]);

    // double-click on image: open lightbox or re-edit drawing
    useEffect(() => {
        const handleImageClick = (e: CustomEvent) => {
            const { src, alt } = e.detail;
            setSelectedImage(null); // close toolbar
            const noteId = getCurrentNoteId();
            const baseAlt = alt.split('|')[0];
            if (baseAlt === 'drawing' && src && src.startsWith('data:image/svg+xml')) {
                if (noteId) {
                    handleUpdateNote(noteId, { viewMode: 'drawing', drawingEditSrc: src });
                    return;
                }
            }
            setLightboxState({ isOpen: true, src, alt });
        };
        window.addEventListener('yoro-image-click', handleImageClick as EventListener);
        return () => window.removeEventListener('yoro-image-click', handleImageClick as EventListener);
    }, [getCurrentNoteId, handleUpdateNote]);

    // single-click on image: show inline toolbar
    useEffect(() => {
        const handleImageSelect = (e: CustomEvent) => {
            const { src, alt, element } = e.detail;
            setSelectedImage({ src, alt, element });
        };
        window.addEventListener('yoro-image-select', handleImageSelect as EventListener);
        return () => window.removeEventListener('yoro-image-select', handleImageSelect as EventListener);
    }, []);

    const handleImageResize = useCallback((src: string, alt: string, width: number) => {
        const noteId = getCurrentNoteId();
        if (!noteId) return;
        const { baseAlt, align } = parseAlt(alt);
        const newAlt = `${baseAlt}|${width}|${align}`;
        const note = dataRef.current.notes.find(n => n.id === noteId);
        if (!note) return;
        const newContent = note.content.split(`![${alt}](${src})`).join(`![${newAlt}](${src})`);
        handleUpdateNote(noteId, { content: newContent });
        setSelectedImage(prev => prev ? { ...prev, alt: newAlt } : null);
    }, [getCurrentNoteId, handleUpdateNote]);

    const handleImageAlign = useCallback((src: string, alt: string, align: 'left' | 'center' | 'right') => {
        const noteId = getCurrentNoteId();
        if (!noteId) return;
        const { baseAlt, width } = parseAlt(alt);
        const newAlt = `${baseAlt}|${width ?? ''}|${align}`;
        const note = dataRef.current.notes.find(n => n.id === noteId);
        if (!note) return;
        const newContent = note.content.split(`![${alt}](${src})`).join(`![${newAlt}](${src})`);
        handleUpdateNote(noteId, { content: newContent });
        setSelectedImage(prev => prev ? { ...prev, alt: newAlt } : null);
    }, [getCurrentNoteId, handleUpdateNote]);

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
        setIsAboutOpen,
        setIsKnowledgeGraphOpen,
        setIsFindReplaceOpen,
        setIsBacklinksPanelOpen,
        setIsOutlineOpen,
        setTableModalOpen,
    }), [data.notes, data.preferences, handleCreateNote, handleSelectNote, handleDuplicateNote, handleDeleteNote, getCurrentNoteId, handleUpdatePreferences, handleImportNotes, handleUpdateNote, navigate]);

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
        const lines = text.split('\n');
        const title = lines[0]?.slice(0, 50) || 'Quick Capture';
        const newNote: Note = {
            id: newId,
            title, content: text,
            format: 'markdown',
            tags: ['inbox'],
            createdAt: now, updatedAt: now,
            isFavorite: false,
        };
        setData(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
        analytics.track('quick_capture');
        showToast(sl ? 'Saved to inbox liao' : 'Saved to Inbox', 'success');
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+Shift+I — quick capture
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                setIsQuickCaptureOpen(true);
                return;
            }
            // Cmd+/ — keyboard shortcut cheatsheet
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                setIsHelpOpen(prev => !prev);
                return;
            }
            // Cmd+Shift+P — command palette
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
                return;
            }
            // Ctrl+S — save
            if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S') && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                window.dispatchEvent(new Event('yoro-save'));
                return;
            }
            // Cmd+Alt+F — find and replace (editor only)
            if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'f' || e.key === 'F')) {
                if (location.pathname.startsWith('/note/')) {
                    e.preventDefault();
                    setIsFindReplaceOpen(prev => !prev);
                    return;
                }
            }
            // check command shortcuts
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
            setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
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
            return { ...prev, preferences: { ...prev.preferences, recentCommandIds: recent } };
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
                        onOpenGraph={() => setIsKnowledgeGraphOpen(true)}
                    />
                } />
                <Route path="/note/:id" element={
                    <NoteEditorWrapper
                        notes={data.notes}
                        onUpdateNote={handleUpdateNote}
                        onUpdateNotePosition={handleUpdateNotePosition}
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
                commandGroups={[]}
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
                onClose={() => { setParamModalOpen(false); setParamModalCommand(null); }}
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
                        onNavigate={(id) => { setIsKnowledgeGraphOpen(false); handleSelectNote(id); }}
                        onClose={() => setIsKnowledgeGraphOpen(false)}
                    />
                </ErrorBoundary>
            )}

            <BacklinksPanel
                isOpen={isBacklinksPanelOpen}
                onClose={() => setIsBacklinksPanelOpen(false)}
                currentNote={data.notes.find(n => n.id === getCurrentNoteId()) || null}
                notes={data.notes}
                onNavigate={(id) => { setIsBacklinksPanelOpen(false); handleSelectNote(id); }}
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

            <ImageToolbar
                selected={selectedImage}
                onClose={() => setSelectedImage(null)}
                onResize={handleImageResize}
                onAlign={handleImageAlign}
                onEditDrawing={(src, _alt) => {
                    setSelectedImage(null);
                    const noteId = getCurrentNoteId();
                    if (noteId) handleUpdateNote(noteId, { viewMode: 'drawing', drawingEditSrc: src });
                }}
                onOpenLightbox={(src, alt) => {
                    setSelectedImage(null);
                    setLightboxState({ isOpen: true, src, alt });
                }}
            />
        </div>
        </SinglishContext.Provider>
    );
}

export default App;
