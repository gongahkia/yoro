import React, { useMemo } from 'react';
import './styles/OutlinePanel.css';

interface OutlinePanelProps {
    isOpen: boolean;
    content: string;
    noteId: string;
}

interface Heading {
    level: number;
    text: string;
    lineNumber: number;
}

function parseHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            headings.push({
                level: match[1].length,
                text: match[2].trim(),
                lineNumber: i + 1 // 1-indexed
            });
        }
    }

    return headings;
}

export const OutlinePanel: React.FC<OutlinePanelProps> = ({ isOpen, content, noteId }) => {
    const headings = useMemo(() => parseHeadings(content), [content]);

    const handleClick = (lineNumber: number) => {
        window.dispatchEvent(new CustomEvent('yoro-navigate-line', {
            detail: { noteId, lineNumber }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="outline-panel" role="region" aria-label="Outline">
            <div className="outline-header">
                <h3>Outline</h3>
            </div>
            <div className="outline-body">
                {headings.length === 0 ? (
                    <p className="no-headings">No headings found.</p>
                ) : (
                    <ul className="outline-list">
                        {headings.map((heading, index) => (
                            <li
                                key={`${heading.lineNumber}-${index}`}
                                className={`outline-item level-${heading.level}`}
                                onClick={() => handleClick(heading.lineNumber)}
                            >
                                <span className="outline-text">{heading.text}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
