import React, { useState } from 'react';
import type { Note } from '../types';

interface Message {
    id: string;
    from: string;
    to: string;
    text: string;
    type: 'solid' | 'dotted'; // solid ->>, dotted -->>
}

interface Item {
    id: string;
    name: string;
}

interface SequenceBuilderProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
}

export const SequenceBuilder: React.FC<SequenceBuilderProps> = ({ note, onUpdateNote }) => {
    const [participants, setParticipants] = useState<Item[]>([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
    ]);
    const [messages, setMessages] = useState<Message[]>([
        { id: 'm1', from: 'Alice', to: 'Bob', text: 'Hello', type: 'solid' }
    ]);

    const addParticipant = () => {
        const name = prompt("Participant Name:");
        if (name) setParticipants([...participants, { id: crypto.randomUUID(), name }]);
    };

    const addMessage = () => {
        if (participants.length < 2) return alert("Need at least 2 participants");
        setMessages([...messages, {
            id: crypto.randomUUID(),
            from: participants[0].name,
            to: participants[1].name,
            text: 'Message',
            type: 'solid'
        }]);
    };

    const updateMessage = (id: string, updates: Partial<Message>) => {
        setMessages(messages.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const removeMessage = (id: string) => {
        setMessages(messages.filter(m => m.id !== id));
    };

    const handleInsert = () => {
        let code = '```mermaid\nsequenceDiagram\n';
        // Participants implicit or explicit? Let's rely on usage, but maybe define aliases?
        // Mermaid supports auto-discovery.
        messages.forEach(m => {
            const arrow = m.type === 'solid' ? '->>' : '-->>';
            code += `    ${m.from}${arrow}${m.to}: ${m.text}\n`;
        });
        code += '```';
        const newContent = note.content + '\n\n' + code;
        onUpdateNote(note.id, { content: newContent, viewMode: 'editor' });
    };

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', height: '100vh', overflowY: 'auto' }}>
            <h2>Sequence Diagram Builder</h2>

            <div style={{ marginBottom: 20, padding: 10, border: '1px solid var(--border-color)' }}>
                <h3>Participants</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {participants.map(p => (
                        <span key={p.id} style={{ padding: '4px 8px', background: '#eee', borderRadius: 4 }}>{p.name}</span>
                    ))}
                    <button onClick={addParticipant}>+ Add</button>
                </div>
            </div>

            <div>
                <h3>Messages</h3>
                {messages.map((msg, idx) => (
                    <div key={msg.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 2fr auto', gap: 10, alignItems: 'center', marginBottom: 10, padding: 10, border: '1px solid #eee' }}>
                        <select value={msg.from} onChange={e => updateMessage(msg.id, { from: e.target.value })}>
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>

                        <select value={msg.type} onChange={e => updateMessage(msg.id, { type: e.target.value as any })}>
                            <option value="solid">-&gt;</option>
                            <option value="dotted">--&gt;</option>
                        </select>

                        <select value={msg.to} onChange={e => updateMessage(msg.id, { to: e.target.value })}>
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>

                        <input value={msg.text} onChange={e => updateMessage(msg.id, { text: e.target.value })} />

                        <button onClick={() => removeMessage(msg.id)}>X</button>
                    </div>
                ))}
                <button onClick={addMessage}>+ Add Step</button>
            </div>

            <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                <button onClick={handleInsert} style={{ padding: 10, background: 'var(--primary)', color: 'white' }}>Insert Diagram</button>
                <button onClick={() => onUpdateNote(note.id, { viewMode: 'editor' })} style={{ padding: 10 }}>Cancel</button>
            </div>
        </div>
    );
};
