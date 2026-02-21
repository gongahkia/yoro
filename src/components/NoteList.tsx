import React, { useMemo, useState, useRef } from 'react';
import type { Note } from '../types';
import { useSinglish } from '../contexts/SinglishContext';
import './styles/NoteList.css';

interface NoteListProps {
    notes: Note[];
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    onDuplicateNote: (id: string, e: React.MouseEvent) => void;
    onPinNote?: (id: string) => void;
    onReorderNotes?: (orderedIds: string[]) => void;
    isLoading?: boolean;
    searchQuery: string;
    selectedTag: string | null;
    onTagChange: (tag: string | null) => void;
    viewMode?: 'notion-grid' | 'docs-list';
    sortOrder?: 'updated' | 'created' | 'alpha' | 'alpha-reverse';
    onOpenGraph?: () => void;
}

export const NoteList: React.FC<NoteListProps> = ({
    notes,
    onSelectNote,
    onDeleteNote,
    onDuplicateNote,
    onPinNote,
    onReorderNotes,
    isLoading = false,
    searchQuery,
    selectedTag,
    viewMode = 'docs-list',
    sortOrder = 'updated',
    onOpenGraph,
}) => {
    const sl = useSinglish();
    const dragSrcIdRef = useRef<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesSearch = (note.title + note.content).toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
            return matchesSearch && matchesTag;
        }).sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (sortOrder === 'alpha') return a.title.localeCompare(b.title);
            if (sortOrder === 'alpha-reverse') return b.title.localeCompare(a.title);
            if (sortOrder === 'created') return b.createdAt - a.createdAt;
            return b.updatedAt - a.updatedAt;
        });
    }, [notes, searchQuery, selectedTag, sortOrder]);

    const handleDragStart = (id: string) => { dragSrcIdRef.current = id; };
    const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
    const handleDragEnd = () => { dragSrcIdRef.current = null; setDragOverId(null); };
    const handleDrop = (targetId: string) => {
        const srcId = dragSrcIdRef.current;
        if (!srcId || srcId === targetId || !onReorderNotes) return;
        const ids = filteredNotes.map(n => n.id);
        const srcIdx = ids.indexOf(srcId);
        const tgtIdx = ids.indexOf(targetId);
        if (srcIdx < 0 || tgtIdx < 0) return;
        const reordered = [...ids];
        reordered.splice(srcIdx, 1);
        reordered.splice(tgtIdx, 0, srcId);
        onReorderNotes(reordered);
        dragSrcIdRef.current = null;
        setDragOverId(null);
    };

    const SkeletonCard = ({ style }: { style?: React.CSSProperties }) => (
        <div className="skeleton-card" style={style} aria-hidden="true">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-body" />
            <div className="skeleton-line skeleton-body short" />
        </div>
    );

    const EmptyState = () => (
        <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="12" y="8" width="44" height="56" rx="4" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 3"/>
                <line x1="22" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="22" y1="33" x2="46" y2="33" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="22" y1="42" x2="36" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="58" cy="58" r="13" fill="var(--bg-primary)" stroke="currentColor" strokeWidth="2"/>
                <line x1="54" y1="58" x2="62" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="58" y1="54" x2="58" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="empty-state-text">{sl ? 'No notes leh' : 'No notes yet'}</p>
            <p className="empty-state-sub">{sl ? 'Press Cmd+Shift+P to create one lah' : 'Press Cmd+Shift+P to create your first note'}</p>
        </div>
    );

    const renderNotionGrid = () => {
        if (filteredNotes.length === 0) return <EmptyState />;
        return (
            <div className="notion-grid-container">
                <div className="notion-grid-header">
                    <span className="notion-grid-count">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</span>
                    {selectedTag && <span className="active-filter">{sl ? `#${selectedTag} leh` : `#${selectedTag}`}</span>}
                </div>
                <div className="notion-grid">
                    {filteredNotes.map(note => {
                        const date = new Date(note.updatedAt);
                        const dateStr = date.toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        });
                        const preview = note.content.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*`>\-_[\]()]/g, '').trim().slice(0, 120);
                        return (
                            <div
                                key={note.id}
                                className={`notion-card ${dragOverId === note.id ? 'drag-over' : ''}`}
                                onClick={() => onSelectNote(note.id)}
                                style={note.accentColor ? { borderTop: `3px solid ${note.accentColor}` } : undefined}
                                draggable={!!onReorderNotes}
                                onDragStart={() => handleDragStart(note.id)}
                                onDragOver={(e) => handleDragOver(e, note.id)}
                                onDrop={() => handleDrop(note.id)}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="notion-card-title-row">
                                    {note.icon && <span className="notion-card-icon">{note.icon}</span>}
                                    {note.isPinned && <span className="notion-card-pin" title="Pinned" />}
                                    <span className="notion-card-title">{note.title || 'Untitled'}</span>
                                </div>
                                {preview && <p className="notion-card-preview">{preview}</p>}
                                <div className="notion-card-footer">
                                    <span className="notion-card-date">{dateStr}</span>
                                    <div className="notion-card-tags">
                                        {note.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="notion-card-tag">#{tag}</span>
                                        ))}
                                    </div>
                                    <div className="notion-card-actions" onClick={e => e.stopPropagation()}>
                                        {onPinNote && (
                                            <button className="notion-card-action-btn" onClick={() => onPinNote(note.id)} title={note.isPinned ? 'Unpin' : 'Pin'}>
                                                {note.isPinned ? 'unpin' : 'pin'}
                                            </button>
                                        )}
                                        <button className="notion-card-action-btn" onClick={(e) => onDuplicateNote(note.id, e)} title="Duplicate">dup</button>
                                        <button className="notion-card-action-btn danger" onClick={(e) => onDeleteNote(note.id, e)} title="Delete">del</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDocsList = () => {
        if (filteredNotes.length === 0) return <EmptyState />;

        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const sevenDaysAgo = new Date(startOfToday); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date(startOfToday); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        type GroupKey = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Earlier this month' | 'Older';
        const groups: { key: GroupKey; notes: typeof filteredNotes }[] = [
            { key: 'Today', notes: [] },
            { key: 'Yesterday', notes: [] },
            { key: 'Previous 7 days', notes: [] },
            { key: 'Earlier this month', notes: [] },
            { key: 'Older', notes: [] },
        ];

        for (const note of filteredNotes) {
            const ts = note.updatedAt;
            if (ts >= startOfToday.getTime()) groups[0].notes.push(note);
            else if (ts >= startOfYesterday.getTime()) groups[1].notes.push(note);
            else if (ts >= sevenDaysAgo.getTime()) groups[2].notes.push(note);
            else if (ts >= thirtyDaysAgo.getTime()) groups[3].notes.push(note);
            else groups[4].notes.push(note);
        }

        const formatDate = (ts: number) => {
            const d = new Date(ts);
            return d.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
                year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });
        };

        const DocIcon = () => (
            <svg className="docs-list-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
        );

        return (
            <div className="docs-list-container">
                <div className="docs-list-toolbar">
                    <span className="docs-list-count">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</span>
                    {selectedTag && <span className="active-filter">{sl ? `#${selectedTag} leh` : `#${selectedTag}`}</span>}
                </div>
                <div className="docs-list-table">
                    <div className="docs-list-thead">
                        <div className="docs-list-col docs-list-col-title">Title</div>
                        <div className="docs-list-col docs-list-col-tags">Tags</div>
                        <div className="docs-list-col docs-list-col-date">Last modified</div>
                        <div className="docs-list-col docs-list-col-actions" />
                    </div>
                    {groups.map(group => group.notes.length > 0 && (
                        <div key={group.key} className="docs-list-group">
                            <div className="docs-list-group-label">{group.key}</div>
                            {group.notes.map(note => (
                                <div
                                    key={note.id}
                                    className={`docs-list-row ${dragOverId === note.id ? 'drag-over' : ''}`}
                                    onClick={() => onSelectNote(note.id)}
                                    draggable={!!onReorderNotes}
                                    onDragStart={() => handleDragStart(note.id)}
                                    onDragOver={(e) => handleDragOver(e, note.id)}
                                    onDrop={() => handleDrop(note.id)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="docs-list-col docs-list-col-title">
                                        <DocIcon />
                                        {note.isPinned && <span className="docs-list-pin" title="Pinned" />}
                                        <span className="docs-list-title">{note.title || 'Untitled'}</span>
                                    </div>
                                    <div className="docs-list-col docs-list-col-tags">
                                        {note.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="docs-list-tag">#{tag}</span>
                                        ))}
                                    </div>
                                    <div className="docs-list-col docs-list-col-date">{formatDate(note.updatedAt)}</div>
                                    <div className="docs-list-col docs-list-col-actions" onClick={e => e.stopPropagation()}>
                                        {onPinNote && (
                                            <button className="docs-list-action-btn" onClick={() => onPinNote(note.id)} title={note.isPinned ? 'Unpin' : 'Pin'}>
                                                {note.isPinned ? 'unpin' : 'pin'}
                                            </button>
                                        )}
                                        <button className="docs-list-action-btn" onClick={(e) => onDuplicateNote(note.id, e)} title="Duplicate">dup</button>
                                        <button className="docs-list-action-btn danger" onClick={(e) => onDeleteNote(note.id, e)} title="Delete">del</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? 'Cmd' : 'Ctrl';

    return (
        <div className="note-list-container">
            {(viewMode === 'notion-grid' || viewMode === 'docs-list') && (
                <div className="search-hint">
                    <span className="search-hint-text">Press</span>
                    <span className="keybind-combo">
                        <kbd className="key-chip">{modKey}</kbd>
                        <span className="key-sep">+</span>
                        <kbd className="key-chip">Shift</kbd>
                        <span className="key-sep">+</span>
                        <kbd className="key-chip">P</kbd>
                    </span>
                    <span className="search-hint-text">{sl ? 'to open command palette lah.' : 'to open the command palette.'}</span>
                    {selectedTag && <span className="active-filter">{sl ? `Filtering by #${selectedTag} leh` : `Filtering: #${selectedTag}`}</span>}
                    {onOpenGraph && (
                        <button className="graph-hint-btn" onClick={onOpenGraph} title="Open Knowledge Graph">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
                                <line x1="12" y1="8" x2="5.5" y2="16.5"/><line x1="12" y1="8" x2="18.5" y2="16.5"/>
                            </svg>
                            Graph
                        </button>
                    )}
                </div>
            )}
            {isLoading ? (
                <div className="skeleton-container" aria-label="Loading notes…">
                    {Array.from({ length: 8 }, (_, i) => (
                        <SkeletonCard key={i} style={{ animationDelay: `${i * 0.05}s` }} />
                    ))}
                </div>
            ) : (
                viewMode === 'notion-grid' ? renderNotionGrid() : renderDocsList()
            )}
        </div>
    );
};
