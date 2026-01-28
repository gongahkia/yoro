import React from 'react';
import './styles/Sidebar.css';

interface SidebarProps {
    isVisible: boolean;
    onCommand: (command: string) => void;
}

interface ButtonGroup {
    buttons: Array<{
        command: string;
        icon: string;
        title: string;
    }>;
}

const buttonGroups: ButtonGroup[] = [
    {
        // Text Style
        buttons: [
            { command: 'bold', icon: 'B', title: 'Bold' },
            { command: 'italic', icon: 'I', title: 'Italic' },
            { command: 'strikethrough', icon: 'S', title: 'Strikethrough' },
            { command: 'code', icon: '<>', title: 'Code' },
        ]
    },
    {
        // Headings
        buttons: [
            { command: 'h1', icon: 'H1', title: 'Heading 1' },
            { command: 'h2', icon: 'H2', title: 'Heading 2' },
            { command: 'h3', icon: 'H3', title: 'Heading 3' },
        ]
    },
    {
        // Blocks
        buttons: [
            { command: 'blockquote', icon: '""', title: 'Blockquote' },
            { command: 'link', icon: '🔗', title: 'Link' },
        ]
    },
    {
        // Lists
        buttons: [
            { command: 'list-ul', icon: '•', title: 'Bullet List' },
            { command: 'list-ol', icon: '1.', title: 'Numbered List' },
            { command: 'checklist', icon: '☑', title: 'Checklist' },
        ]
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ isVisible, onCommand }) => {
    if (!isVisible) return null;

    return (
        <div className="sidebar">
            {buttonGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="sidebar-section">
                    <div className="sidebar-buttons">
                        {group.buttons.map(btn => (
                            <button
                                key={btn.command}
                                onClick={() => onCommand(btn.command)}
                                title={btn.title}
                            >
                                {btn.icon}
                            </button>
                        ))}
                    </div>
                    {groupIndex < buttonGroups.length - 1 && (
                        <div className="sidebar-divider" />
                    )}
                </div>
            ))}
        </div>
    );
};
