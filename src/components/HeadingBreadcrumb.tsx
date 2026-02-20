import React, { useState, useEffect, useMemo } from 'react';
import './styles/HeadingBreadcrumb.css';

interface HeadingBreadcrumbProps {
    content: string;
    cursorLine: number;
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

function getAncestorChain(headings: Heading[], cursorLine: number): Heading[] {
    // Find headings before cursor
    const headingsBeforeCursor = headings.filter(h => h.lineNumber <= cursorLine);

    if (headingsBeforeCursor.length === 0) return [];

    // Build ancestor chain: each heading should be higher level than the next
    const chain: Heading[] = [];

    // Start from the last heading before cursor
    let currentLevel = 7; // Start with max level + 1

    // Traverse backwards to build the chain
    for (let i = headingsBeforeCursor.length - 1; i >= 0; i--) {
        const heading = headingsBeforeCursor[i];
        if (heading.level < currentLevel) {
            chain.unshift(heading);
            currentLevel = heading.level;
        }
    }

    return chain;
}

export const HeadingBreadcrumb: React.FC<HeadingBreadcrumbProps> = ({ content, cursorLine, noteId }) => {
    const [isTyping, setIsTyping] = useState(false);

    const headings = useMemo(() => parseHeadings(content), [content]);
    const ancestorChain = useMemo(() => getAncestorChain(headings, cursorLine), [headings, cursorLine]);

    // Fade when content changes (typing)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsTyping(true);
        const timeout = setTimeout(() => setIsTyping(false), 1000);
        return () => clearTimeout(timeout);
    }, [content]);

    const handleClick = (lineNumber: number) => {
        window.dispatchEvent(new CustomEvent('yoro-navigate-line', {
            detail: { noteId, lineNumber }
        }));
    };

    if (ancestorChain.length === 0) return null;

    return (
        <div className={`heading-breadcrumb ${isTyping ? 'faded' : ''}`}>
            {ancestorChain.map((heading, index) => (
                <React.Fragment key={heading.lineNumber}>
                    {index > 0 && <span className="heading-breadcrumb-separator">&gt;</span>}
                    <span
                        className="heading-breadcrumb-item"
                        onClick={() => handleClick(heading.lineNumber)}
                        title={`Jump to ${heading.text} (line ${heading.lineNumber})`}
                    >
                        {'#'.repeat(heading.level)} {heading.text}
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
};
