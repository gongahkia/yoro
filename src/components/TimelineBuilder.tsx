import React, { useState } from 'react';
import type { Note } from '../types';

interface TimelineEvent {
    id: string;
    period: string; // e.g. "2002"
    title: string;  // e.g. "LinkedIn"
}

interface TimelineBuilderProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
}

export const TimelineBuilder: React.FC<TimelineBuilderProps> = ({ note, onUpdateNote }) => {
    const [title, setTitle] = useState('Timeline Title');
    const [events, setEvents] = useState<TimelineEvent[]>([
        { id: '1', period: '2023', title: 'Event 1' }
    ]);

    const addEvent = () => {
        setEvents([...events, { id: crypto.randomUUID(), period: 'Year', title: 'New Event' }]);
    };

    const updateEvent = (id: string, updates: Partial<TimelineEvent>) => {
        setEvents(events.map(e => e.id === id ? { ...e, ...updates } : e));
    };

    const removeEvent = (id: string) => {
        setEvents(events.filter(e => e.id !== id));
    };

    const handleInsert = () => {
        let code = '```mermaid\ntimeline\n';
        code += `    title ${title}\n`;
        events.forEach(e => {
            code += `    ${e.period} : ${e.title}\n`;
        });
        code += '```';
        const newContent = note.content + '\n\n' + code;
        onUpdateNote(note.id, { content: newContent, viewMode: 'editor' });
    };

    return (
        <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
            <h2>Timeline Builder</h2>
            <div style={{ marginBottom: 20 }}>
                <label>Chart Title: </label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: 8 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {events.map((ev, idx) => (
                    <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #ccc', padding: 10 }}>
                        <span>{idx + 1}.</span>
                        <input
                            placeholder="Period (e.g. 2023)"
                            value={ev.period}
                            onChange={(e) => updateEvent(ev.id, { period: e.target.value })}
                        />
                        <input
                            placeholder="Event Title"
                            value={ev.title}
                            onChange={(e) => updateEvent(ev.id, { title: e.target.value })}
                            style={{ flexGrow: 1 }}
                        />
                        <button onClick={() => removeEvent(ev.id)}>X</button>
                    </div>
                ))}
            </div>

            <button onClick={addEvent} style={{ marginTop: 10 }}>+ Add Event</button>

            <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                <button onClick={handleInsert} style={{ padding: 10, background: 'var(--primary)', color: 'white' }}>Insert Timeline</button>
                <button onClick={() => onUpdateNote(note.id, { viewMode: 'editor' })} style={{ padding: 10 }}>Cancel</button>
            </div>
        </div>
    );
};
