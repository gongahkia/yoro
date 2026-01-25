import React from 'react';
import './styles/Sidebar.css';

interface SidebarProps {
    isVisible: boolean;
    onCommand: (command: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isVisible, onCommand }) => {
    if (!isVisible) return null;

    return (
        <div className="sidebar">
            <div className="sidebar-section">
                <h3>Formatting</h3>
                <div className="sidebar-buttons">
                    <button onClick={() => onCommand('bold')} title="Bold">B</button>
                    <button onClick={() => onCommand('italic')} title="Italic">I</button>
                    <button onClick={() => onCommand('strikethrough')} title="Strikethrough">S</button>
                    <button onClick={() => onCommand('h1')} title="Heading 1">H1</button>
                    <button onClick={() => onCommand('h2')} title="Heading 2">H2</button>
                    <button onClick={() => onCommand('h3')} title="Heading 3">H3</button>
                    <button onClick={() => onCommand('blockquote')} title="Blockquote">""</button>
                    <button onClick={() => onCommand('code')} title="Code">{'<>'}</button>
                    <button onClick={() => onCommand('link')} title="Link">🔗</button>
                    <button onClick={() => onCommand('list-ul')} title="Bullet List">•</button>
                    <button onClick={() => onCommand('list-ol')} title="Numbered List">1.</button>
                    <button onClick={() => onCommand('checklist')} title="Checklist">☑</button>
                </div>
            </div>
        </div>
    );
};
