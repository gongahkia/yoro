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
    const [scrollOffset, setScrollOffset] = useState(0);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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
                // File drawer: scroll through files
                const delta = e.deltaY;
                setScrollOffset(prev => prev + delta * 0.3);
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
        // Clean stacked file layout - cards arranged horizontally with offset
        // Hovering raises the card up, scroll shifts through the stack

        // Calculate the center offset to keep cards centered
        const totalWidth = (count - 1) * fileSpacing;
        const startOffset = -totalWidth / 2 - scrollOffset;

        return (
            <div className="file-drawer-container" ref={deckRef}>
                {filteredNotes.length > 0 ? (
                    <div className="file-stack">
                        {filteredNotes.map((note, index) => {
                            const isHovered = hoveredId === note.id;

                            // Position each card with horizontal offset
                            const baseX = startOffset + index * fileSpacing;
                            const baseY = index * 3; // Slight vertical stagger for depth

                            // Hover effect: card rises up
                            const hoverLift = isHovered ? -100 : 0;
                            const hoverScale = isHovered ? 1.05 : 1;

                            // Cards spread apart when one is hovered
                            let spreadOffset = 0;
                            if (hoveredIndex !== null && !isHovered) {
                                const diff = index - hoveredIndex;
                                if (diff < 0) {
                                    spreadOffset = -40; // Push left cards further left
                                } else {
                                    spreadOffset = 40; // Push right cards further right
                                }
                            }

                            // Z-index: hovered on top, otherwise back-to-front
                            const zIndex = isHovered ? 1000 : index;

                            return (
                                <div
                                    key={note.id}
                                    className={`file-card ${isHovered ? 'file-card-hovered' : ''}`}
                                    style={{
                                        transform: `translateX(${baseX + spreadOffset}px) translateY(${baseY + hoverLift}px) scale(${hoverScale})`,
                                        zIndex,
                                    }}
                                    onMouseEnter={() => {
                                        setHoveredId(note.id);
                                        setHoveredIndex(index);
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredId(null);
                                        setHoveredIndex(null);
                                    }}
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
