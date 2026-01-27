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
    viewMode = '3d-carousel'
}) => {
    // Circular Deck State (3D)
    const [rotation, setRotation] = useState(0);
    // 2D Semicircle State
    const [rotation2D, setRotation2D] = useState(0);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
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
        });
    }, [notes, searchQuery, selectedTag]);

    // Handle Wheel Rotation
    useEffect(() => {
        const container = deckRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            // Rotate based on scroll
            const delta = e.deltaY * 0.1; // Sensitivity
            if (viewMode === '3d-carousel') {
                setRotation(prev => prev + delta);
            } else {
                setRotation2D(prev => prev + delta);
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [viewMode]);

    // Constants for layout
    // Radius depends on count to avoid overlap?
    // Circumference ~ Count * CardWidth. 2*PI*R = N * W. R = (N*W) / 2PI.
    // Let's make it dynamic or fixed large enough.
    const cardWidth = 300; // slightly more than 280
    const count = filteredNotes.length;
    const dynamicRadius = Math.max(450, (count * cardWidth) / (2 * Math.PI));

    // Tilt the deck slightly for better 3D view
    const deckTilt = -5; // degrees X-axis

    // 2D Semicircle constants
    // Use dynamic radius similar to 3D view to prevent overlap
    const semicircleRadius = Math.max(400, (count * cardWidth) / (2 * Math.PI));

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

    const render2DSemicircle = () => {
        // Cards are distributed evenly around the full 360° circle
        // (same as 3D carousel), but only the bottom semicircle is visible
        // This ensures cards never overlap regardless of count

        return (
            <div className="semicircle-deck-container" ref={deckRef}>
                {filteredNotes.length > 0 ? (
                    <div
                        className="semicircle-deck"
                        style={{
                            transform: `rotate(${rotation2D}deg)`
                        }}
                    >
                        {filteredNotes.map((note, index) => {
                            const isHovered = hoveredId === note.id;

                            // Distribute evenly around full 360° circle (like 3D carousel)
                            // Start at 270° (bottom center) so first card appears at bottom
                            const angleStep = 360 / Math.max(count, 1);
                            const angle = 270 + index * angleStep;

                            // Convert angle to radians
                            const rad = (angle * Math.PI) / 180;

                            // Calculate position on circle
                            const x = Math.cos(rad) * semicircleRadius;
                            const y = Math.sin(rad) * semicircleRadius;

                            // Card rotation to face outward from circle center
                            const cardRotation = angle - 270;

                            const hoverOffset = isHovered ? -30 : 0;

                            // Z-index: cards closer to bottom (270°) should be on top
                            // Normalize angle to 0-360, then calculate distance from 270
                            const normalizedAngle = ((angle % 360) + 360) % 360;
                            const distanceFrom270 = Math.abs(normalizedAngle - 270);
                            const baseZIndex = Math.round(100 - distanceFrom270 / 3.6);

                            return (
                                <div
                                    key={note.id}
                                    className="semicircle-card-wrapper"
                                    style={{
                                        transform: `translate(${x}px, ${y + hoverOffset}px) rotate(${cardRotation}deg) scale(${isHovered ? 1.08 : 1})`,
                                        zIndex: isHovered ? 1000 : baseZIndex
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
    };

    return (
        <div className="note-list-container">
            <div className="search-hint">
                Press <kbd>{navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'}+Shift+P</kbd> to open the command palette.
                {selectedTag && <span className="active-filter">Filtering: #{selectedTag}</span>}
            </div>
            {viewMode === '3d-carousel' ? render3DCarousel() : render2DSemicircle()}
        </div>
    );
};
