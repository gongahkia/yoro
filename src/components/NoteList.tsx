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
    const [fanSpread, setFanSpread] = useState(0.5); // 0 = collapsed, 1 = fully spread
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
                // File drawer: scroll through files and adjust fan spread
                const delta = e.deltaY;

                // Scroll through the file drawer
                setScrollOffset(prev => {
                    const maxScroll = Math.max(0, (count - 1) * 60);
                    return Math.max(0, Math.min(maxScroll, prev + delta * 0.5));
                });

                // Adjust fan spread based on horizontal scroll (deltaX) or shift+scroll
                if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    const spreadDelta = (e.deltaX || e.deltaY) * 0.002;
                    setFanSpread(prev => Math.max(0.2, Math.min(1, prev + spreadDelta)));
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
    const fileSpacing = 40 * fanSpread + 15; // Spacing between files (adjustable via scroll)
    const fileAngle = 3 * fanSpread; // Slight angle for each file tab
    const maxVisibleFiles = 12; // Maximum files visible at once

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
        // Files arranged like a file drawer/folder - stacked with tabs visible
        // Scrolling moves through the drawer, hovering raises files up

        // Calculate which files are visible based on scroll
        const scrollIndex = Math.floor(scrollOffset / 60);
        const visibleStartIndex = Math.max(0, scrollIndex - 2);

        return (
            <div className="file-drawer-container" ref={deckRef}>
                {filteredNotes.length > 0 ? (
                    <div className="file-drawer">
                        {/* Drawer frame */}
                        <div className="drawer-frame">
                            <div className="drawer-label">Files ({filteredNotes.length})</div>
                        </div>

                        {/* File tabs */}
                        <div className="file-stack">
                            {filteredNotes.map((note, index) => {
                                const isHovered = hoveredId === note.id;
                                const relativeIndex = index - visibleStartIndex;

                                // Position each file with stacking effect
                                const baseX = relativeIndex * fileSpacing;
                                const baseY = relativeIndex * 2; // Slight vertical offset for depth
                                const rotation = (relativeIndex - (hoveredIndex ?? relativeIndex)) * fileAngle * 0.3;

                                // Hover effect: file emerges and raises
                                const hoverLift = isHovered ? -80 : 0;
                                const hoverScale = isHovered ? 1.08 : 1;
                                const hoverRotation = isHovered ? 0 : rotation;

                                // Files before hovered one lean back, files after lean forward
                                let neighborEffect = 0;
                                if (hoveredIndex !== null && !isHovered) {
                                    if (index < hoveredIndex) {
                                        neighborEffect = -8 * (1 - Math.abs(index - hoveredIndex) * 0.15);
                                    } else {
                                        neighborEffect = 8 * (1 - Math.abs(index - hoveredIndex) * 0.15);
                                    }
                                }

                                // Fade out files that are far from view
                                const distanceFromCenter = Math.abs(relativeIndex - maxVisibleFiles / 2);
                                const opacity = Math.max(0.3, 1 - distanceFromCenter * 0.08);

                                // Z-index: hovered on top, otherwise based on position
                                const zIndex = isHovered ? 1000 : count - index;

                                return (
                                    <div
                                        key={note.id}
                                        className={`file-tab ${isHovered ? 'file-tab-hovered' : ''}`}
                                        style={{
                                            transform: `
                                                translateX(${baseX}px)
                                                translateY(${baseY + hoverLift}px)
                                                rotate(${hoverRotation + neighborEffect}deg)
                                                scale(${hoverScale})
                                            `,
                                            zIndex,
                                            opacity: isHovered ? 1 : opacity,
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
                                        {/* File tab label */}
                                        <div className="file-tab-label">
                                            {note.title.substring(0, 20)}{note.title.length > 20 ? '...' : ''}
                                        </div>

                                        {/* Full card (visible on hover) */}
                                        <div className="file-card-content">
                                            <NoteCard
                                                note={note}
                                                onClick={onSelectNote}
                                                onDelete={(e) => onDeleteNote(note.id, e)}
                                                onDuplicate={(e) => onDuplicateNote(note.id, e)}
                                                onRestore={(e) => onRestoreNote?.(note.id, e)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Scroll indicator */}
                        {count > maxVisibleFiles && (
                            <div className="scroll-indicator">
                                <span>Scroll to browse • Shift+Scroll to spread</span>
                            </div>
                        )}
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
