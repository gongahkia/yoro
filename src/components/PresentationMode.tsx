import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import type { Note } from '../types';
import './styles/PresentationMode.css';

interface PresentationModeProps {
    notes: Note[];
    theme: string;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({ notes, theme }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const note = notes.find(n => n.id === id);
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = useMemo(() => {
        if (!note) return [];
        // Split by H1 or H2
        const content = note.content;
        const lines = content.split('\n');
        const slides: string[] = [];
        let currentSlideContent: string[] = [];

        lines.forEach(line => {
            if (line.match(/^#{1,2}\s/)) {
                if (currentSlideContent.length > 0) {
                    slides.push(currentSlideContent.join('\n'));
                }
                currentSlideContent = [line];
            } else {
                currentSlideContent.push(line);
            }
        });
        if (currentSlideContent.length > 0) {
            slides.push(currentSlideContent.join('\n'));
        }
        
        // If no headings, just one slide
        if (slides.length === 0 && content.trim()) {
            return [content];
        }

        return slides;
    }, [note]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
            } else if (e.key === 'ArrowLeft') {
                setCurrentSlide(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Escape') {
                navigate(`/note/${id}`);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length, navigate, id]);

    if (!note) return <div>Note not found</div>;

    const getHtml = (markdown: string) => {
        return marked.parse(markdown) as string;
    };

    return (
        <div className="presentation-container" data-theme={theme}>
            <div 
                className="slide-content"
                dangerouslySetInnerHTML={{ __html: getHtml(slides[currentSlide] || '') }} 
            />
            <div className="presentation-controls">
                <button onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))} disabled={currentSlide === 0}>
                    &larr;
                </button>
                <span>{currentSlide + 1} / {slides.length}</span>
                <button onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))} disabled={currentSlide === slides.length - 1}>
                    &rarr;
                </button>
                <button className="exit-btn" onClick={() => navigate(`/note/${id}`)}>Exit</button>
            </div>
            <div className="progress-bar" style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }} />
        </div>
    );
};
