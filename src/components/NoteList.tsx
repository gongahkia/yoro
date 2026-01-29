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
    // 2D File Drawer State
    const [activeIndex, setActiveIndex] = useState(0); // Which card is raised
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const scrollAccumulator = useRef(0); // Accumulate scroll delta for smoother cycling
    const deckRef = useRef<HTMLDivElement>(null);

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

    // Handle Wheel Rotation/Scroll
    useEffect(() => {
        const container = deckRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (viewMode === '3d-carousel') {
                // Rotate based on scroll
                const delta = e.deltaY * 0.1; // Sensitivity
                setRotation(prev => prev + delta);
            } else {
                // File drawer: scroll cycles through which card is active (raised)
                scrollAccumulator.current += e.deltaY;
                const threshold = 50; // Pixels of scroll needed to switch cards

                if (Math.abs(scrollAccumulator.current) >= threshold) {
                    const direction = scrollAccumulator.current > 0 ? 1 : -1;
                    scrollAccumulator.current = 0; // Reset accumulator

                    setActiveIndex(prev => {
                        // Wrap around endlessly
                        const next = prev + direction;
                        if (next < 0) return count - 1;
                        if (next >= count) return 0;
                        return next;
                    });
                }
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [viewMode, count]);

    // 3D Carousel layout constants
    // Radius depends on count to avoid overlap
    // Circumference ~ Count * CardWidth. 2*PI*R = N * W. R = (N*W) / 2PI.
    const dynamicRadius = Math.max(450, (count * cardWidth) / (2 * Math.PI));

    // Tilt the deck slightly for better 3D view
    const deckTilt = -5; // degrees X-axis

    // 2D File Drawer constants
    const fileSpacing = 60; // Horizontal spacing between stacked cards

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

    const render2DFileDrawer = () => {
        // Stacked file layout - scroll cycles through which card is raised
        // Cards stack on top of each other, active card rises up

        return (
            <div className="file-drawer-container" ref={deckRef}>
                {filteredNotes.length > 0 ? (
                    <div className="file-stack">
                        {filteredNotes.map((note, index) => {
                            const isActive = index === activeIndex;
                            const isHovered = hoveredId === note.id;

                            // Stack cards with slight offset for depth effect
                            const stackOffset = index * 4;
                            const baseX = stackOffset;
                            const baseY = stackOffset;

                            // Active card rises up prominently
                            const lift = isActive ? -120 : 0;
                            const scale = isActive ? 1.08 : 1;

                            // Cards spread apart from active card
                            let spreadX = 0;
                            let spreadY = 0;
                            if (!isActive) {
                                const diff = index - activeIndex;
                                if (diff < 0) {
                                    // Cards before active go left and down
                                    spreadX = diff * 15;
                                    spreadY = Math.abs(diff) * 5;
                                } else {
                                    // Cards after active go right and down
                                    spreadX = diff * 15;
                                    spreadY = diff * 5;
                                }
                            }

                            // Z-index: active on top, then by position
                            const zIndex = isActive ? 1000 : (isHovered ? 999 : count - Math.abs(index - activeIndex));

                            return (
                                <div
                                    key={note.id}
                                    className={`file-card ${isActive ? 'file-card-active' : ''} ${isHovered ? 'file-card-hovered' : ''}`}
                                    style={{
                                        transform: `translateX(${baseX + spreadX}px) translateY(${baseY + lift + spreadY}px) scale(${scale})`,
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
                                </div>
                            );
                        })}
                    </div>
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
            {viewMode === '3d-carousel' ? render3DCarousel() : render2DFileDrawer()}
        </div>
    );
};
