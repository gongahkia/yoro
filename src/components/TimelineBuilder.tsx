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
        <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', color: 'var(--text-primary)', height: '100vh', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--text-primary)' }}>Timeline Builder</h2>
            <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>Chart Title: </label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                        width: '100%',
                        padding: 8,
                        background: 'var(--bg-tooltip)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 4
                    }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {events.map((ev, idx) => (
                    <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--border-color)', padding: 10, borderRadius: 8, background: 'var(--bg-tooltip)' }}>
                        <span style={{ minWidth: 20 }}>{idx + 1}.</span>
                        <input
                            placeholder="Period (e.g. 2023)"
                            value={ev.period}
                            onChange={(e) => updateEvent(ev.id, { period: e.target.value })}
                            style={{
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                padding: 6,
                                borderRadius: 4
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
                                padding: 6,
                                borderRadius: 4
                            }}
                        />
                        <button onClick={() => removeEvent(ev.id)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>X</button>
                    </div>
                ))}
            </div>

            <button onClick={addEvent} style={{ marginTop: 10, background: 'var(--bg-tooltip)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>+ Add Event</button>

            <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                <button onClick={handleInsert} style={{ padding: 10, background: 'var(--primary)', color: '#fff', border: 'none' }}>Insert Timeline</button>
                <button onClick={() => onUpdateNote(note.id, { viewMode: 'editor' })} style={{ padding: 10, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>Cancel</button>
            </div>
        </div>
    );
};
