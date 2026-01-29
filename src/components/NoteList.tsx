import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { Note } from '../types';
import { NoteCard } from './NoteCard';
import './styles/NoteList.css';

interface NoteListProps {
    notes: Note[];
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    onDuplicateNote: (id: string, e: React.MouseEvent) => void;
    onRestoreNote?: (id: string, e: React.MouseEvent) => void;
    searchQuery: string;
    selectedTag: string | null;
    onTagChange: (tag: string | null) => void;
    viewMode?: '3d-carousel' | '2d-semicircle';
    sortOrder?: 'updated' | 'created' | 'alpha' | 'alpha-reverse';
}

export const NoteList: React.FC<NoteListProps> = ({
    notes,
    onSelectNote,
    onDeleteNote,
    onDuplicateNote,
    onRestoreNote,
    searchQuery,
    selectedTag,
    onTagChange,
    viewMode = '3d-carousel',
    sortOrder = 'updated'
}) => {
    // Circular Deck State (3D)
    const [rotation, setRotation] = useState(0);
    // 2D Timeline State
    const [activeIndex, setActiveIndex] = useState(0); // Which card is selected
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const deckRef = useRef<HTMLDivElement>(null);

    // View transition state
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [displayMode, setDisplayMode] = useState(viewMode);
    const prevViewMode = useRef(viewMode);

    // Handle view mode transitions with animation
    useEffect(() => {
        if (prevViewMode.current !== viewMode) {
            setIsTransitioning(true);
            // Wait for exit animation, then switch mode
            const timer = setTimeout(() => {
                setDisplayMode(viewMode);
                // Small delay then end transition
                setTimeout(() => setIsTransitioning(false), 50);
            }, 300);
            prevViewMode.current = viewMode;
            return () => clearTimeout(timer);
        }
    }, [viewMode]);

    useEffect(() => {
        const handleOpenBin = () => onTagChange('bin');
        window.addEventListener('yoro-open-bin', handleOpenBin);

        return () => {
            window.removeEventListener('yoro-open-bin', handleOpenBin);
        };
    }, [onTagChange]);

    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            // Hide config.toml from note list (accessible via command palette only)
            if (note.title === 'config.toml') return false;

            if (selectedTag === 'bin') {
                // Bin View: Only show deleted notes
                if (!note.deletedAt) return false;
            } else {
                // Normal View: Hide deleted notes
                if (note.deletedAt) return false;
            }

            const matchesSearch = (note.title + note.content).toLowerCase().includes(searchQuery.toLowerCase());
            // Filter by tag if selected and not 'bin' (bin is handled above as a mode)
            const matchesTag = (selectedTag && selectedTag !== 'bin') ? note.tags.includes(selectedTag) : true;

            return matchesSearch && matchesTag;
        }).sort((a, b) => {
            if (sortOrder === 'alpha') return a.title.localeCompare(b.title);
            if (sortOrder === 'alpha-reverse') return b.title.localeCompare(a.title);
            if (sortOrder === 'created') return b.createdAt - a.createdAt;
            return b.updatedAt - a.updatedAt; // default 'updated'
        });
    }, [notes, searchQuery, selectedTag, sortOrder]);

    // Constants for layout
    const cardWidth = 300; // slightly more than 280
    const count = filteredNotes.length;

    // Reset activeIndex if it goes out of bounds (e.g., notes filtered/deleted)
    useEffect(() => {
        if (count > 0 && activeIndex >= count) {
            setActiveIndex(count - 1);
        }
    }, [count, activeIndex]);

    // Handle Wheel Rotation for 3D carousel, scroll for timeline
    useEffect(() => {
        const container = deckRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (viewMode === '3d-carousel') {
                e.preventDefault();
                // Rotate based on scroll
                const delta = e.deltaY * 0.1; // Sensitivity
                setRotation(prev => prev + delta);
            } else {
                // Timeline: scroll to navigate between cards
                e.preventDefault();
                const direction = e.deltaY > 0 ? 1 : -1;
                setActiveIndex(prev => {
                    const next = prev + direction;
                    return Math.max(0, Math.min(count - 1, next));
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [viewMode, count]);

    // Keyboard navigation for timeline
    useEffect(() => {
        if (viewMode === '3d-carousel') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => Math.min(count - 1, prev + 1));
            } else if (e.key === 'Enter' && filteredNotes[activeIndex]) {
                onSelectNote(filteredNotes[activeIndex].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, count, activeIndex, filteredNotes, onSelectNote]);

    // 3D Carousel layout constants
    // Radius depends on count to avoid overlap
    // Circumference ~ Count * CardWidth. 2*PI*R = N * W. R = (N*W) / 2PI.
    const dynamicRadius = Math.max(450, (count * cardWidth) / (2 * Math.PI));

    // Tilt the deck slightly for better 3D view
    const deckTilt = -5; // degrees X-axis

    const render3DCarousel = () => (
        <div className="circular-deck-container" ref={deckRef}>
            {filteredNotes.length > 0 ? (
                <div
                    className="circular-deck"
                    style={{
                        transform: `rotateX(${deckTilt}deg) rotateY(${rotation}deg)`
                    }}
                >
                    {filteredNotes.map((note, index) => {
                        const angle = index * (360 / Math.max(count, 1));
                        const isHovered = hoveredId === note.id;

                        // 3D Cylinder Transform
                        // Rotate Y to position on ring, Push out Z to radius.
                        // We don't rotate the card itself to face center?
                        // Yes, rotateY(angle) makes it face outward from center.

                        // Hover: Pull UP (Y-) and OUT (Z+)
                        const hoverTransform = isHovered
                            ? `translateY(-40px) translateZ(40px) scale(1.1)`
                            : `translateY(0) translateZ(0) scale(1)`;

                        const transform = `rotateY(${angle}deg) translateZ(${dynamicRadius}px) ${hoverTransform}`;

                        return (
                            <div
                                key={note.id}
                                className="circular-card-wrapper"
                                style={{
                                    transform,
                                    zIndex: isHovered ? 1000 : 1 // Ensure hovered is on top (though 3D usually handles this, z-index helps with interactions)
                                }}
                                onMouseEnter={() => setHoveredId(note.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <NoteCard
                                    note={note}
                                    onClick={onSelectNote}
                                    onDelete={(e) => onDeleteNote(note.id, e)}
                                    onDuplicate={(e) => onDuplicateNote(note.id, e)}
                                    onRestore={(e) => onRestoreNote?.(note.id, e)}
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">No notes found</div>
            )}
        </div>
    );

    const render2DTimeline = () => {
        // Horizontal timeline - cards in a row, center card is focused
        // Scroll horizontally to navigate through time

        const cardSpacing = 320; // Space between card centers

        return (
            <div className="timeline-container" ref={deckRef}>
                {filteredNotes.length > 0 ? (
                    <>
                        {/* Timeline track */}
                        <div className="timeline-track" />

                        <div className="timeline-cards">
                            {filteredNotes.map((note, index) => {
                                const isActive = index === activeIndex;
                                const isHovered = hoveredId === note.id;

                                // Calculate distance from active card
                                const distance = index - activeIndex;
                                const absDistance = Math.abs(distance);

                                // Position based on distance from center
                                const translateX = distance * cardSpacing;

                                // Scale: active is 1, others shrink based on distance
                                const scale = isActive ? 1 : Math.max(0.7, 1 - absDistance * 0.12);

                                // Opacity: fade out distant cards
                                const opacity = isActive ? 1 : Math.max(0.4, 1 - absDistance * 0.2);

                                // Z-index: active on top
                                const zIndex = isActive ? 100 : 50 - absDistance;

                                // Format date for timeline
                                const date = new Date(note.updatedAt);
                                const dateStr = date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                });

                                return (
                                    <div
                                        key={note.id}
                                        className={`timeline-card ${isActive ? 'timeline-card-active' : ''} ${isHovered ? 'timeline-card-hovered' : ''}`}
                                        style={{
                                            transform: `translateX(${translateX}px) scale(${scale})`,
                                            opacity,
                                            zIndex,
                                        }}
                                        onMouseEnter={() => setHoveredId(note.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        onClick={() => setActiveIndex(index)}
                                    >
                                        <NoteCard
                                            note={note}
                                            onClick={onSelectNote}
                                            onDelete={(e) => onDeleteNote(note.id, e)}
                                            onDuplicate={(e) => onDuplicateNote(note.id, e)}
                                            onRestore={(e) => onRestoreNote?.(note.id, e)}
                                        />

                                        {/* Date marker below card */}
                                        <div className="timeline-date">
                                            <div className="timeline-dot" />
                                            <span>{dateStr}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Navigation hints */}
                        <div className="timeline-nav">
                            <button
                                className="timeline-nav-btn timeline-nav-prev"
                                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                                disabled={activeIndex === 0}
                            >
                                ←
                            </button>
                            <span className="timeline-position">{activeIndex + 1} / {count}</span>
                            <button
                                className="timeline-nav-btn timeline-nav-next"
                                onClick={() => setActiveIndex(prev => Math.min(count - 1, prev + 1))}
                                disabled={activeIndex === count - 1}
                            >
                                →
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">No notes found</div>
                )}
            </div>
        );
    };

    return (
        <div className="note-list-container">
            <div className="search-hint">
                Press <kbd>{navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'}+Shift+P</kbd> to open the command palette.
                {selectedTag && <span className="active-filter">Filtering: #{selectedTag}</span>}
            </div>
            <div className={`view-transition-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
                {displayMode === '3d-carousel' ? render3DCarousel() : render2DTimeline()}
            </div>
        </div>
    );
};
