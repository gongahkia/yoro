import React, { useState, useEffect, useRef } from 'react';
import './styles/SearchPalette.css';

interface SearchPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedTag: string | null;
    onTagSelect: (tag: string | null) => void;
    allTags: string[];
}

export const SearchPalette: React.FC<SearchPaletteProps> = ({
    isOpen,
    onClose,
    searchQuery,
    onSearchChange,
    selectedTag,
    onTagSelect,
    allTags
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedTagIndex, setSelectedTagIndex] = useState(0);

    // "All" is index 0, then tags follow
    const totalOptions = 1 + allTags.length;

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            // Set selected index based on current selectedTag
            if (selectedTag === null) {
                setSelectedTagIndex(0);
            } else {
                const idx = allTags.indexOf(selectedTag);
                setSelectedTagIndex(idx >= 0 ? idx + 1 : 0);
            }
        }
    }, [isOpen, selectedTag, allTags]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedTagIndex(prev => (prev + 1) % totalOptions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedTagIndex(prev => (prev - 1 + totalOptions) % totalOptions);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedTagIndex === 0) {
                onTagSelect(null);
            } else {
                onTagSelect(allTags[selectedTagIndex - 1]);
            }
            onClose();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="search-palette-overlay" onClick={onClose}>
            <div className="search-palette-modal" onClick={e => e.stopPropagation()}>
                <div className="search-palette-search">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search notes..."
                    />
                </div>
                <div className="search-palette-tags">
                    <div className="search-palette-tags-label">Filter by tag</div>
                    <ul className="search-palette-list">
                        <li
                            className={`search-palette-item ${selectedTagIndex === 0 ? 'selected' : ''}`}
                            onClick={() => {
                                onTagSelect(null);
                                onClose();
                            }}
                            onMouseEnter={() => setSelectedTagIndex(0)}
                        >
                            <span className="tag-label">All</span>
                            {selectedTag === null && <span className="tag-active">Active</span>}
                        </li>
                        {allTags.map((tag, index) => (
                            <li
                                key={tag}
                                className={`search-palette-item ${selectedTagIndex === index + 1 ? 'selected' : ''}`}
                                onClick={() => {
                                    onTagSelect(tag);
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedTagIndex(index + 1)}
                            >
                                <span className="tag-label">#{tag}</span>
                                {selectedTag === tag && <span className="tag-active">Active</span>}
                            </li>
                        ))}
                        {allTags.length === 0 && (
                            <li className="search-palette-empty">No tags found</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};
