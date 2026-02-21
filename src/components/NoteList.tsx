import React, { useMemo, useEffect, useState, useRef } from 'react';
import JSZip from 'jszip';
import type { Note } from '../types';
import { NoteCard } from './NoteCard';
import { useSinglish } from '../contexts/SinglishContext';
import './styles/NoteList.css';

interface NoteListProps {
    notes: Note[];
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    onDuplicateNote: (id: string, e: React.MouseEvent) => void;
    onImportNotes: (notes: Note[]) => void;
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
    onImportNotes,
    searchQuery,
    selectedTag,
    viewMode = '3d-carousel',
    sortOrder = 'updated'
}) => {
    const sl = useSinglish();

    // Import refs
    const mdInputRef = useRef<HTMLInputElement>(null);
    const zipInputRef = useRef<HTMLInputElement>(null);

    const mdFileFromContent = (filename: string, content: string): Note => {
        const now = Date.now();
        const title = filename.replace(/\.md$/i, '');
        return {
            id: crypto.randomUUID(),
            title,
            content,
            format: 'markdown',
            tags: [],
            createdAt: now,
            updatedAt: now,
            isFavorite: false,
        };
    };

    const handleMdImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        const readers = files.map(file => new Promise<Note>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(mdFileFromContent(file.name, reader.result as string));
            reader.readAsText(file);
        }));
        Promise.all(readers).then(importedNotes => {
            onImportNotes(importedNotes);
        });
        e.target.value = '';
    };

    const handleZipImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const zip = await JSZip.loadAsync(reader.result as ArrayBuffer);
                const mdEntries = Object.entries(zip.files).filter(
                    ([name, entry]) => !entry.dir && name.toLowerCase().endsWith('.md')
                );
                const importedNotes = await Promise.all(
                    mdEntries.map(async ([name, entry]) => {
                        const content = await entry.async('string');
                        const filename = name.split('/').pop() ?? name;
                        return mdFileFromContent(filename, content);
                    })
                );
                onImportNotes(importedNotes);
            } catch {
                window.dispatchEvent(new CustomEvent('yoro-toast', {
                    detail: { message: 'Failed to read ZIP file', type: 'error' }
                }));
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

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
            // eslint-disable-next-line react-hooks/set-state-in-effect
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

    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            if (note.title === 'config.toml') return false;
            const matchesSearch = (note.title + note.content).toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;

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
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
                // Larger scrolls move multiple cards, but capped
                e.preventDefault();
                const scrollThreshold = 400; // Pixels per card movement
                const maxCardsPerScroll = 3; // Cap to prevent jumping too far
                const scrollAmount = Math.abs(e.deltaY);
                const cardsToMove = Math.min(maxCardsPerScroll, Math.max(1, Math.floor(scrollAmount / scrollThreshold)));
                const direction = e.deltaY > 0 ? 1 : -1;
                setActiveIndex(prev => {
                    const next = prev + (direction * cardsToMove);
                    return Math.max(0, Math.min(count - 1, next));
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [viewMode, count]);

    // Keyboard navigation (timeline + 3D carousel)
    useEffect(() => {
        const degPerCard = count > 0 ? 360 / count : 0;
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.command-palette-modal')) {
                return;
            }
            if (viewMode === '3d-carousel') {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setRotation(prev => prev - degPerCard);
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    setRotation(prev => prev + degPerCard);
                }
            } else {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex(prev => Math.max(0, prev - 1));
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex(prev => Math.min(count - 1, prev + 1));
                } else if (e.key === 'Enter' && filteredNotes[activeIndex]) {
                    onSelectNote(filteredNotes[activeIndex].id);
                }
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

    // window visible cards for 3D carousel (±120deg from front)
    const visibleCarouselIndices = useMemo(() => {
        if (count === 0) return new Set<number>();
        const visible = new Set<number>();
        const buffer = 120;
        for (let i = 0; i < count; i++) {
            const cardAngle = i * (360 / count);
            const relAngle = ((cardAngle - rotation) % 360 + 360) % 360;
            if (relAngle <= buffer || relAngle >= 360 - buffer) visible.add(i);
        }
        return visible;
    }, [count, rotation]);

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
                        if (!visibleCarouselIndices.has(index)) return null;
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
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">{sl ? 'No notes leh' : 'No notes found'}</div>
            )}
        </div>
    );

    const render2DTimeline = () => {
        // Horizontal timeline - cards in a row, center card is focused
        // Scroll horizontally to navigate through time

        const cardSpacing = 320; // Space between card centers

        const timelineWindow = 15; // render ±15 cards from active
        const winStart = Math.max(0, activeIndex - timelineWindow);
        const winEnd = Math.min(count - 1, activeIndex + timelineWindow);

        return (
            <div className="timeline-container" ref={deckRef}>
                {filteredNotes.length > 0 ? (
                    <>
                        {/* Timeline track */}
                        <div className="timeline-track" />

                        <div className="timeline-cards">
                            {filteredNotes.map((note, index) => {
                                if (index < winStart || index > winEnd) return null;
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
                    </>
                ) : (
                    <div className="empty-state">{sl ? 'No notes leh' : 'No notes found'}</div>
                )}
            </div>
        );
    };

    return (
        <div className="note-list-container">
            {/* Hidden file inputs */}
            <input
                ref={mdInputRef}
                type="file"
                accept=".md"
                multiple
                style={{ display: 'none' }}
                onChange={handleMdImport}
            />
            <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={handleZipImport}
            />
            <div className="search-hint">
                Press <kbd>{navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'}+K</kbd> {sl ? 'to open command palette lah.' : 'to open the command palette.'}
                {selectedTag && <span className="active-filter">{sl ? `Filtering by #${selectedTag} leh` : `Filtering: #${selectedTag}`}</span>}
                <span className="import-actions">
                    <button
                        className="import-btn"
                        title={sl ? 'Import .md files lah' : 'Import .md files'}
                        onClick={() => mdInputRef.current?.click()}
                    >
                        Import .md
                    </button>
                    <button
                        className="import-btn"
                        title={sl ? 'Import .zip of .md files lah' : 'Import .zip of .md files'}
                        onClick={() => zipInputRef.current?.click()}
                    >
                        Import .zip
                    </button>
                </span>
            </div>
            <div className={`view-transition-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
                {displayMode === '3d-carousel' ? render3DCarousel() : render2DTimeline()}
            </div>
        </div>
    );
};
