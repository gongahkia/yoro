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
        messages.forEach(m => {
            const arrow = m.type === 'solid' ? '->>' : '-->>';
            code += `    ${m.from}${arrow}${m.to}: ${m.text}\n`;
        });
        code += '```';
        const newContent = note.content + '\n\n' + code;
        onUpdateNote(note.id, { content: newContent, viewMode: 'editor' });
    };

    const inputStyle = {
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        padding: '6px 10px',
        borderRadius: '4px'
    };

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', height: '100vh', overflowY: 'auto', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

            <div style={{
                marginBottom: 20,
                padding: 20,
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                background: 'var(--bg-primary)'
            }}>
                <div style={{ marginBottom: 10, fontWeight: 'bold', fontSize: '1.2em' }}>Sequence Diagram Builder</div>
                <div style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: 15 }}>
                    Define participants and the sequence of messages between them.
                </div>

                <div style={{ marginBottom: 15 }}>
                    <div style={{ fontWeight: 500, marginBottom: 8, fontSize: '0.95em' }}>Participants</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        {participants.map(p => (
                            <span key={p.id} style={{ padding: '4px 10px', background: 'var(--bg-tooltip)', color: 'var(--text-primary)', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: '0.9em' }}>{p.name}</span>
                        ))}
                        <button onClick={addParticipant} style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: 12, cursor: 'pointer', fontSize: '0.9em' }}>+ Add</button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleInsert} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Insert Mermaid</button>
                    <button onClick={() => onUpdateNote(note.id, { viewMode: 'editor' })} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1 }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 2fr auto', gap: 10, alignItems: 'center', marginBottom: 10, padding: 12, border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-tooltip)' }}>
                        <select value={msg.from} onChange={e => updateMessage(msg.id, { from: e.target.value })} style={inputStyle}>
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>

                        <select value={msg.type} onChange={e => updateMessage(msg.id, { type: e.target.value as any })} style={inputStyle}>
                            <option value="solid">-&gt;</option>
                            <option value="dotted">--&gt;</option>
                        </select>

                        <select value={msg.to} onChange={e => updateMessage(msg.id, { to: e.target.value })} style={inputStyle}>
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>

                        <input value={msg.text} onChange={e => updateMessage(msg.id, { text: e.target.value })} style={inputStyle} />

                        <button onClick={() => removeMessage(msg.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.2em', cursor: 'pointer', opacity: 0.6 }}>&times;</button>
                    </div>
                ))}
            </div>

            <button onClick={addMessage} style={{ marginTop: 20, padding: '10px', background: 'var(--bg-tooltip)', color: 'var(--text-primary)', border: '1px dashed var(--border-color)', borderRadius: 8, cursor: 'pointer' }}>+ Add Step</button>
        </div>
    );
};
