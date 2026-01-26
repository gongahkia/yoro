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
        <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', color: 'var(--text-primary)', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            <div style={{
                marginBottom: 20,
                padding: 20,
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                background: 'var(--bg-primary)'
            }}>
                <div style={{ marginBottom: 10, fontWeight: 'bold', fontSize: '1.2em' }}>Timeline Builder</div>
                <div style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: 15 }}>
                    Define key events in chronological order.<br />
                    Use "Add Event" to insert new points.
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em' }}>Chart Title</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'var(--bg-tooltip)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 4
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleInsert} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Insert Mermaid</button>
                    <button onClick={() => onUpdateNote(note.id, { viewMode: 'editor' })} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1 }}>
                {events.map((ev, idx) => (
                    <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--border-color)', padding: 12, borderRadius: 8, background: 'var(--bg-tooltip)' }}>
                        <span style={{ minWidth: 20, opacity: 0.5 }}>{idx + 1}.</span>
                        <input
                            placeholder="Period (e.g. 2023)"
                            value={ev.period}
                            onChange={(e) => updateEvent(ev.id, { period: e.target.value })}
                            style={{
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                padding: '6px 10px',
                                borderRadius: 4,
                                width: '120px'
                            }}
                        />
                        <input
                            placeholder="Event Title"
                            value={ev.title}
                            onChange={(e) => updateEvent(ev.id, { title: e.target.value })}
                            style={{
                                flexGrow: 1,
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                padding: '6px 10px',
                                borderRadius: 4
                            }}
                        />
                        <button onClick={() => removeEvent(ev.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', opacity: 0.6, cursor: 'pointer', fontSize: '1.2em' }}>&times;</button>
                    </div>
                ))}
            </div>

            <button onClick={addEvent} style={{ marginTop: 20, padding: '10px', background: 'var(--bg-tooltip)', color: 'var(--text-primary)', border: '1px dashed var(--border-color)', borderRadius: 8, cursor: 'pointer' }}>+ Add Event</button>
        </div>
    );
};
