import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import katex from 'katex';
import mermaid from 'mermaid';
import hljs from 'highlight.js';
import type { Note } from '../types';
import './styles/PresentationMode.css';

interface PresentationModeProps {
    notes: Note[];
    theme: string;
}

// Initialize mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// Configure marked to use highlight.js for code blocks via extension
marked.use({
    renderer: {
        code(token: { text: string; lang?: string }) {
            const { text, lang } = token;

            // Skip mermaid blocks - they're handled separately
            if (lang === 'mermaid') {
                return `<pre><code class="language-mermaid">${text}</code></pre>`;
            }

            let highlightedCode = text;
            if (lang && hljs.getLanguage(lang)) {
                try {
                    highlightedCode = hljs.highlight(text, { language: lang }).value;
                } catch {
                    // Fall through to auto-detect or plain text
                }
            } else if (text.trim()) {
                try {
                    highlightedCode = hljs.highlightAuto(text).value;
                } catch {
                    // Use plain text
                }
            }

            const langClass = lang ? ` class="language-${lang}"` : '';
            return `<pre><code${langClass}>${highlightedCode}</code></pre>`;
        }
    }
});

export const PresentationMode: React.FC<PresentationModeProps> = ({ notes, theme }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const note = notes.find(n => n.id === id);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [slideDirection, setSlideDirection] = useState<'next' | 'prev' | null>(null);

    const slides = useMemo(() => {
        if (!note) return [];
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

        if (slides.length === 0 && content.trim()) {
            return [content];
        }

        return slides;
    }, [note]);

    const goToSlide = useCallback((index: number, direction: 'next' | 'prev') => {
        if (index >= 0 && index < slides.length) {
            setSlideDirection(direction);
            setCurrentSlide(index);
            setTimeout(() => setSlideDirection(null), 300);
        }
    }, [slides.length]);

    const nextSlide = useCallback(() => {
        if (currentSlide < slides.length - 1) {
            goToSlide(currentSlide + 1, 'next');
        }
    }, [currentSlide, slides.length, goToSlide]);

    const prevSlide = useCallback(() => {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1, 'prev');
        }
    }, [currentSlide, goToSlide]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case ' ':
                case 'PageDown':
                    e.preventDefault();
                    nextSlide();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    prevSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    goToSlide(0, 'prev');
                    break;
                case 'End':
                    e.preventDefault();
                    goToSlide(slides.length - 1, 'next');
                    break;
                case 'Escape':
                    navigate(`/note/${id}`);
                    break;
                case 'f':
                case 'F':
                    toggleFullscreen();
                    break;
            }
        };

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        let hideTimeout: number;
        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(hideTimeout);
            hideTimeout = window.setTimeout(() => setShowControls(false), 3000);
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(hideTimeout);
        };
    }, [slides.length, navigate, id, nextSlide, prevSlide, goToSlide, toggleFullscreen]);

    // Render mermaid diagrams after slide change
    useEffect(() => {
        const renderMermaid = async () => {
            const container = document.querySelector('.slide-content');
            if (!container) return;

            const mermaidBlocks = container.querySelectorAll('.mermaid-placeholder');
            for (let i = 0; i < mermaidBlocks.length; i++) {
                const block = mermaidBlocks[i];
                const code = block.getAttribute('data-mermaid');
                if (code) {
                    try {
                        const { svg } = await mermaid.render(`pres-mermaid-${currentSlide}-${i}`, code);
                        block.innerHTML = svg;
                        block.classList.remove('mermaid-placeholder');
                        block.classList.add('mermaid-rendered');
                    } catch {
                        block.innerHTML = `<pre class="mermaid-error">${code}</pre>`;
                    }
                }
            }
        };
        renderMermaid();
    }, [currentSlide]);

    if (!note) return <div className="presentation-error">Note not found</div>;

    const processMarkdown = (markdown: string): string => {
        let processed = markdown;

        // Process math blocks
        processed = processed.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
            try {
                return `<div class="katex-block">${katex.renderToString(math.trim(), { displayMode: true })}</div>`;
            } catch {
                return `<pre class="math-error">${math}</pre>`;
            }
        });

        // Process inline math
        processed = processed.replace(/\$([^$\n]+)\$/g, (_, math) => {
            try {
                return katex.renderToString(math.trim(), { displayMode: false });
            } catch {
                return `<code class="math-error">${math}</code>`;
            }
        });

        // Process mermaid blocks - store for later rendering
        processed = processed.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
            return `<div class="mermaid-placeholder" data-mermaid="${encodeURIComponent(code.trim())}"><div class="mermaid-loading">Loading diagram...</div></div>`;
        });

        // Parse with marked
        const html = marked.parse(processed) as string;

        // Decode mermaid data attributes
        return html.replace(/data-mermaid="([^"]+)"/g, (_, encoded) => {
            return `data-mermaid="${decodeURIComponent(encoded)}"`;
        });
    };

    return (
        <div className={`presentation-container ${slideDirection ? `slide-${slideDirection}` : ''}`} data-theme={theme}>
            {/* Slide number indicator */}
            <div className={`slide-number ${showControls ? 'visible' : ''}`}>
                {currentSlide + 1} / {slides.length}
            </div>

            {/* Main slide content */}
            <div className="slide-wrapper">
                <div
                    className="slide-content"
                    dangerouslySetInnerHTML={{ __html: processMarkdown(slides[currentSlide] || '') }}
                />
            </div>

            {/* Navigation hints */}
            <div className={`nav-hint nav-hint-left ${currentSlide > 0 ? 'active' : ''} ${showControls ? 'visible' : ''}`}
                onClick={prevSlide}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </div>
            <div className={`nav-hint nav-hint-right ${currentSlide < slides.length - 1 ? 'active' : ''} ${showControls ? 'visible' : ''}`}
                onClick={nextSlide}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </div>

            {/* Controls bar */}
            <div className={`presentation-controls ${showControls ? 'visible' : ''}`}>
                <button onClick={prevSlide} disabled={currentSlide === 0} title="Previous (Left Arrow)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>

                <div className="slide-dots">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            className={`slide-dot ${i === currentSlide ? 'active' : ''}`}
                            onClick={() => goToSlide(i, i > currentSlide ? 'next' : 'prev')}
                            title={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>

                <button onClick={nextSlide} disabled={currentSlide === slides.length - 1} title="Next (Right Arrow)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>

                <div className="controls-divider" />

                <button onClick={toggleFullscreen} title="Fullscreen (F)">
                    {isFullscreen ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    )}
                </button>

                <button className="exit-btn" onClick={() => navigate(`/note/${id}`)} title="Exit (Escape)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Progress bar */}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }} />
            </div>

            {/* Keyboard hints */}
            <div className={`keyboard-hints ${showControls ? 'visible' : ''}`}>
                <span><kbd>←</kbd><kbd>→</kbd> Navigate</span>
                <span><kbd>F</kbd> Fullscreen</span>
                <span><kbd>Esc</kbd> Exit</span>
            </div>
        </div>
    );
};
