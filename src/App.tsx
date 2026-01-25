import { useState, useEffect } from 'react';
import { storage } from './utils/storage';
import type { AppState, Note } from './types';
import { NoteList } from './components/NoteList';
import './App.css';

function App() {
  const [data, setData] = useState<AppState>(storage.get());

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
  }, [data.notes]); // Dependency on data.notes might be needed if handleCreateNote depends on it, but handleCreateNote uses functional update.
  // Actually handleCreateNote is defined inside component and uses functional update setData(prev => ...), so it is stable? No, it's recreated every render unless wrapped in useCallback.
  // However, handleCreateNote itself doesn't read 'data' from closure for creation logic, but setData(prev => ...).
  // Safest to just add handleCreateNote to dependency or wrap it.

  // Let's wrap handleCreateNote in useCallback for cleanliness before adding effect. Or allow re-binding. Re-binding is fine.

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
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
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      setData(prev => ({
        ...prev,
        notes: prev.notes.filter(n => n.id !== id)
      }));
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
    }
  };

  const handleSelectNote = (id: string) => {
    console.log('Selected note:', id);
    // TODO: Navigate to note editor
  };

  return (
    <div className="app-container">
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
    </div>
  );
}

export default App;
