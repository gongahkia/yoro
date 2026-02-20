import React, { useState, useEffect } from 'react';
import './styles/DocumentStats.css';

interface DocumentStatsProps {
    content: string;
    visible: boolean;
}

interface Stats {
    words: number;
    characters: number;
    paragraphs: number;
    readingTime: number;
}

function calculateStats(content: string): Stats {
    // Remove frontmatter (YAML between ---)
    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');

    // Words: split by whitespace, filter empty
    const words = contentWithoutFrontmatter
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0).length;

    // Characters (excluding whitespace)
    const characters = contentWithoutFrontmatter.replace(/\s/g, '').length;

    // Paragraphs: count blocks separated by blank lines
    const paragraphs = contentWithoutFrontmatter
        .split(/\n\s*\n/)
        .filter(p => p.trim().length > 0).length;

    // Reading time: ~200 words per minute
    const readingTime = Math.max(1, Math.ceil(words / 200));

    return { words, characters, paragraphs, readingTime };
}

export const DocumentStats: React.FC<DocumentStatsProps> = ({ content, visible }) => {
    const [stats, setStats] = useState<Stats>({ words: 0, characters: 0, paragraphs: 0, readingTime: 0 });

    useEffect(() => {
        // Debounce stats calculation
        const timeout = setTimeout(() => {
            setStats(calculateStats(content));
        }, 300);

        return () => clearTimeout(timeout);
    }, [content]);

    if (!visible) return null;

    return (
        <div className="document-stats" role="status" aria-live="polite">
            <span className="document-stats-item">{stats.words} words</span>
            <span className="document-stats-separator">|</span>
            <span className="document-stats-item">{stats.characters} chars</span>
            <span className="document-stats-separator">|</span>
            <span className="document-stats-item">{stats.paragraphs} paragraphs</span>
            <span className="document-stats-separator">|</span>
            <span className="document-stats-item">{stats.readingTime} min read</span>
        </div>
    );
};
