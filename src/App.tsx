import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { storage } from './utils/storage';
import { analytics } from './utils/analytics';
import type { AppState, Note } from './types';
import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import './App.css';

function App() {
  const [data, setData] = useState<AppState>(storage.get());
  const navigate = useNavigate();

  useEffect(() => {
    storage.set(data);
  }, [data]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const EditorRoute = () => {
    const { id } = useParams<{ id: string }>();
    const note = data.notes.find(n => n.id === id);

    if (!note) return <div>Note not found</div>;

    return (
      <Editor
        note={note}
        onChange={(content) => handleUpdateNote(note.id, { content })}
        onTitleChange={(title) => handleUpdateNote(note.id, { title })}
      />
    );
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
        <Route path="/note/:id" element={<EditorRoute />} />
      </Routes>
    </div>
  );
}

export default App;
