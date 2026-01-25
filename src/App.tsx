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
