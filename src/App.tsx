import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import JSZip from 'jszip';
import { storage } from './utils/storage';
import { analytics } from './utils/analytics';
import type { AppState, Note } from './types';
import { CommandPalette, type Command } from './components/CommandPalette';
import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import './App.css';

interface NoteEditorWrapperProps {
  notes: Note[];
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  vimMode: boolean;
  focusMode: boolean;
}

const NoteEditorWrapper: React.FC<NoteEditorWrapperProps> = ({ notes, onUpdateNote, vimMode, focusMode }) => {
  const { id } = useParams<{ id: string }>();
  const note = notes.find(n => n.id === id);

  if (!note) return <div>Note not found</div>;

  return (
    <Editor
      note={note}
      onChange={(content) => onUpdateNote(note.id, { content })}
      onTitleChange={(title) => onUpdateNote(note.id, { title })}
      vimMode={vimMode}
      focusMode={focusMode}
    />
  );
};

function App() {
  const [data, setData] = useState<AppState>(storage.get());
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    storage.set(data);
  }, [data]);

  const handleUpdatePreferences = (updates: Partial<AppState['preferences']>) => {
    setData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates }
    }));
  };

  const getCurrentNoteId = () => {
    const match = location.pathname.match(/\/note\/(.+)/);
    return match ? match[1] : null;
  };

  const commands: Command[] = [
    {
      id: 'new-note',
      label: 'Create New Note',
      shortcut: 'Cmd+N',
      action: () => handleCreateNote(),
      category: 'General'
    },
    {
      id: 'toggle-vim',
      label: 'Toggle Vim Mode',
      action: () => handleUpdatePreferences({ vimMode: !data.preferences.vimMode }),
      category: 'Editor'
    },
    {
        id: 'toggle-sidebar',
        label: 'Toggle Sidebar',
        action: () => handleUpdatePreferences({ sidebarVisible: !data.preferences.sidebarVisible }),
        category: 'View'
    },
    {
        id: 'toggle-line-numbers',
        label: 'Toggle Line Numbers',
        action: () => handleUpdatePreferences({ showLineNumbers: !data.preferences.showLineNumbers }),
        category: 'View'
    },
    {
        id: 'toggle-focus-mode',
        label: 'Toggle Focus Mode',
        action: () => handleUpdatePreferences({ focusMode: !data.preferences.focusMode }),
        category: 'View'
    },
    {
        id: 'theme-light',
        label: 'Theme: Light',
        action: () => handleUpdatePreferences({ theme: 'light' }),
        category: 'Theme'
    },
    {
        id: 'theme-dark',
        label: 'Theme: Dark',
        action: () => handleUpdatePreferences({ theme: 'dark' }),
        category: 'Theme'
    },
    {
        id: 'theme-sepia',
        label: 'Theme: Sepia',
        action: () => handleUpdatePreferences({ theme: 'sepia' }),
        category: 'Theme'
    },
    {
        id: 'theme-dracula',
        label: 'Theme: Dracula',
        action: () => handleUpdatePreferences({ theme: 'dracula' }),
        category: 'Theme'
    },
    // Note Navigation Commands
    ...data.notes.map(note => ({
        id: `open-note-${note.id}`,
        label: `Open Note: ${note.title || 'Untitled'}`,
        action: () => handleSelectNote(note.id),
        category: 'Navigation'
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
    // Current Note Actions
    ...(getCurrentNoteId() ? [
        {
            id: 'delete-note',
            label: 'Delete Current Note',
            action: () => {
                const id = getCurrentNoteId();
                if (id) handleDeleteNote(id, { stopPropagation: () => {} } as React.MouseEvent);
            },
            category: 'Note'
        },
        {
            id: 'duplicate-note',
            label: 'Duplicate Current Note',
            action: () => {
                const id = getCurrentNoteId();
                if (id) handleDuplicateNote(id, { stopPropagation: () => {} } as React.MouseEvent);
            },
            category: 'Note'
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
            category: 'Export'
        },
        // Editor Insert Commands
        {
            id: 'insert-table',
            label: 'Insert Table',
            action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-table' } })),
            category: 'Editor'
        },
        {
            id: 'insert-code-block',
            label: 'Insert Code Block',
            action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-code-block' } })),
            category: 'Editor'
        },
        {
            id: 'insert-hr',
            label: 'Insert Horizontal Rule',
            action: () => window.dispatchEvent(new CustomEvent('yoro-editor-cmd', { detail: { command: 'insert-horizontal-rule' } })),
            category: 'Editor'
        }
    ] : [])
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]); // Add data to dep array if commands use it closure-wise, or use refs/functional updates

  const handleCreateNote = () => {
    const newId = crypto.randomUUID();
    const newNote: Note = {
      id: newId,
      title: '',
      content: '',
      format: 'markdown',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };
    setData(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));
    analytics.track('create_note');
    navigate(`/note/${newId}`);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      setData(prev => ({
        ...prev,
        notes: prev.notes.filter(n => n.id !== id)
      }));
      analytics.track('delete_note');
    }
  };

  const handleDuplicateNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)
    }));
  };

  const handleSelectNote = (id: string) => {
    navigate(`/note/${id}`);
  };

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={
          <>
            <div className="app-header">
              <button className="btn-primary" onClick={handleCreateNote}>
                + New Note
              </button>
            </div>
            <NoteList
              notes={data.notes}
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
              onDuplicateNote={handleDuplicateNote}
            />
          </>
        } />
        <Route path="/note/:id" element={<NoteEditorWrapper notes={data.notes} onUpdateNote={handleUpdateNote} vimMode={data.preferences.vimMode} focusMode={data.preferences.focusMode} />} />
      </Routes>
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
        commands={commands} 
      />
    </div>
  );
}

export default App;
