import { useState, useEffect } from 'react';
import { storage } from './utils/storage';
import { AppState } from './types';
import { NoteList } from './components/NoteList';
import './App.css';

function App() {
  const [data, setData] = useState<AppState>(storage.get());

  useEffect(() => {
    // Basic verification that storage works
    console.log('Loaded notes:', data.notes.length);
  }, [data]);

  const handleSelectNote = (id: string) => {
    console.log('Selected note:', id);
    // TODO: Navigate to note editor
  };

  return (
    <div className="app-container">
      <NoteList notes={data.notes} onSelectNote={handleSelectNote} />
    </div>
  );
}

export default App;
