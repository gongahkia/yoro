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
}

export const NoteList: React.FC<NoteListProps> = ({
    notes,
    onSelectNote,
    onDeleteNote,
    onDuplicateNote,
    onRestoreNote,
    searchQuery,
    selectedTag,
    onTagChange
}) => {
    // Circular Deck State
    const [rotation, setRotation] = useState(0);
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
            setRotation(prev => prev + delta);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // Constants for layout
    // Radius depends on count to avoid overlap? 
    // Circumference ~ Count * CardWidth. 2*PI*R = N * W. R = (N*W) / 2PI.
    // Let's make it dynamic or fixed large enough.
    const cardWidth = 300; // slightly more than 280
    const count = filteredNotes.length;
    const dynamicRadius = Math.max(450, (count * cardWidth) / (2 * Math.PI));
    
    // Tilt the deck slightly for better 3D view
    const deckTilt = -5; // degrees X-axis

    return (
        <div className="note-list-container">
            <div className="search-hint">
                Press <kbd>/</kbd> to search
                {selectedTag && <span className="active-filter">Filtering: #{selectedTag}</span>}
            </div>
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
        </div>
    );
};
