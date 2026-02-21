import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import './styles/ImageToolbar.css';

export interface SelectedImage {
    element: HTMLElement;
    src: string;
    alt: string; // raw alt including |width|align annotations
}

interface ImageToolbarProps {
    selected: SelectedImage | null;
    onClose: () => void;
    onResize: (src: string, alt: string, width: number) => void;
    onAlign: (src: string, alt: string, align: 'left' | 'center' | 'right') => void;
    onEditDrawing: (src: string, alt: string) => void;
    onOpenLightbox: (src: string, alt: string) => void;
}

type HandleDir = 'NW' | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W';
const HANDLES: HandleDir[] = ['NW', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W'];

function parseAlt(alt: string) {
    const parts = alt.split('|');
    return {
        baseAlt: parts[0] || '',
        width: parts[1] ? parseInt(parts[1]) : undefined,
        align: (parts[2] || 'left') as 'left' | 'center' | 'right',
    };
}

export const ImageToolbar: React.FC<ImageToolbarProps> = ({
    selected, onClose, onResize, onAlign, onEditDrawing, onOpenLightbox,
}) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [widthInput, setWidthInput] = useState<number>(0);

    const updateRect = useCallback(() => {
        if (!selected) return;
        const r = selected.element.getBoundingClientRect();
        setRect(r);
        setWidthInput(Math.round(r.width));
    }, [selected]);

    useLayoutEffect(() => {
        updateRect();
    }, [updateRect]);

    useEffect(() => {
        if (!selected) return;
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);
        return () => {
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('resize', updateRect);
        };
    }, [selected, updateRect]);

    // Click-outside to close
    useEffect(() => {
        if (!selected) return;
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (overlayRef.current?.contains(target)) return;
            if (toolbarRef.current?.contains(target)) return;
            if (selected.element === target || selected.element.contains(target)) return;
            onClose();
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [selected, onClose]);

    const handleDrag = useCallback((e: React.MouseEvent, dir: HandleDir) => {
        if (!selected || !rect) return;
        e.preventDefault();
        e.stopPropagation();

        const imgEl = selected.element as HTMLImageElement;
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = rect.width;
        const startH = rect.height;
        const isLeft = dir.includes('W');
        const isTop = dir.includes('N');
        const isHoriz = dir === 'E' || dir === 'W';
        const isVert = dir === 'N' || dir === 'S';

        const onMouseMove = (me: MouseEvent) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;
            let newW = startW;
            let newH = startH;

            if (!isVert) newW = Math.max(50, isLeft ? startW - dx : startW + dx);
            if (!isHoriz) newH = Math.max(50, isTop ? startH - dy : startH + dy);

            // For corners, maintain aspect ratio
            if (!isHoriz && !isVert) {
                const ratio = startH / startW;
                newH = newW * ratio;
            }

            imgEl.style.width = `${Math.round(newW)}px`;
            if (isVert || (!isHoriz && !isVert)) imgEl.style.height = isVert ? `${Math.round(newH)}px` : 'auto';
            setWidthInput(Math.round(newW));
            updateRect();
        };

        const onMouseUp = (me: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            const dx = me.clientX - startX;
            const newW = Math.max(50, isLeft ? startW - dx : startW + dx);
            onResize(selected.src, selected.alt, Math.round(newW));
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [selected, rect, onResize, updateRect]);

    const handleWidthCommit = (w: number) => {
        if (!selected) return;
        const imgEl = selected.element as HTMLImageElement;
        imgEl.style.width = `${w}px`;
        imgEl.style.height = 'auto';
        updateRect();
        onResize(selected.src, selected.alt, w);
    };

    if (!selected || !rect) return null;

    const { align } = parseAlt(selected.alt);
    const isSvgDrawing = selected.src.startsWith('data:image/svg+xml') && selected.alt.startsWith('drawing');
    const toolbarTop = rect.bottom + 8;
    const toolbarLeft = rect.left;

    return (
        <>
            {/* Selection overlay */}
            <div
                ref={overlayRef}
                className="img-overlay"
                style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            >
                <div className="img-selection-border" />
                {HANDLES.map(dir => (
                    <div
                        key={dir}
                        className={`img-resize-handle img-resize-handle-${dir}`}
                        onMouseDown={(e) => handleDrag(e, dir)}
                    />
                ))}
            </div>

            {/* Formatting toolbar */}
            <div
                ref={toolbarRef}
                className="img-toolbar-bar"
                style={{ top: toolbarTop, left: toolbarLeft }}
            >
                {/* Width input */}
                <div className="img-toolbar-width">
                    <span>W</span>
                    <input
                        type="number"
                        value={widthInput}
                        min={50}
                        max={3000}
                        onChange={e => setWidthInput(Number(e.target.value))}
                        onBlur={e => handleWidthCommit(Math.max(50, Number(e.target.value)))}
                        onKeyDown={e => { if (e.key === 'Enter') handleWidthCommit(Math.max(50, widthInput)); }}
                    />
                    <span>px</span>
                </div>

                <div className="img-toolbar-sep" />

                {/* Alignment */}
                <button
                    className={`img-toolbar-btn ${align === 'left' ? 'active' : ''}`}
                    onClick={() => onAlign(selected.src, selected.alt, 'left')}
                    title="Align left"
                >⇤ Left</button>
                <button
                    className={`img-toolbar-btn ${align === 'center' ? 'active' : ''}`}
                    onClick={() => onAlign(selected.src, selected.alt, 'center')}
                    title="Center"
                >⇔ Center</button>
                <button
                    className={`img-toolbar-btn ${align === 'right' ? 'active' : ''}`}
                    onClick={() => onAlign(selected.src, selected.alt, 'right')}
                    title="Align right"
                >⇥ Right</button>

                <div className="img-toolbar-sep" />

                {/* Action buttons */}
                {isSvgDrawing && (
                    <button
                        className="img-toolbar-btn"
                        onClick={() => onEditDrawing(selected.src, selected.alt)}
                        title="Re-edit this drawing"
                    >✏ Edit Drawing</button>
                )}
                <button
                    className="img-toolbar-btn"
                    onClick={() => onOpenLightbox(selected.src, selected.alt)}
                    title="Open fullscreen"
                >⤢ Fullscreen</button>
            </div>
        </>
    );
};
