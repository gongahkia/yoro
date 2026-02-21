import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Note } from '../types';
import './styles/DrawingCanvas.css';

interface Point {
    x: number;
    y: number;
}

interface DrawPath {
    points: Point[];
    color: string;
    width: number;
    isEraser: boolean;
}

interface DrawingCanvasProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

function pointsToPathD(points: Point[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) {
        const { x, y } = points[0];
        return `M ${x} ${y} L ${x + 0.1} ${y}`;
    }
    const [first, ...rest] = points;
    const segments = rest.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ${segments}`;
}

function pathsToSVG(paths: DrawPath[], bgColor: string): string {
    const pathElements = paths.map(path => {
        const d = pointsToPathD(path.points);
        if (!d) return '';
        const color = path.isEraser ? bgColor : path.color;
        return `  <path d="${d}" stroke="${color}" stroke-width="${path.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }).filter(Boolean).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" style="background:${bgColor}">\n${pathElements}\n</svg>`;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ note, onUpdateNote }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [paths, setPaths] = useState<DrawPath[]>([]);
    const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [color, setColor] = useState('#333333');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const isDrawing = useRef(false);

    // Sync default color with theme on mount
    useEffect(() => {
        const themeColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-primary').trim();
        if (themeColor) setColor(themeColor);
    }, []);

    const getSVGPoint = useCallback((e: React.PointerEvent<SVGSVGElement>): Point => {
        const svg = svgRef.current!;
        const rect = svg.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        e.preventDefault();
        (e.target as Element).setPointerCapture(e.pointerId);
        isDrawing.current = true;
        const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-primary').trim() || '#ffffff';
        const newPath: DrawPath = {
            points: [getSVGPoint(e)],
            color: tool === 'eraser' ? bgColor : color,
            width: tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
            isEraser: tool === 'eraser',
        };
        setCurrentPath(newPath);
    }, [tool, color, strokeWidth, getSVGPoint]);

    const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawing.current || !currentPath) return;
        e.preventDefault();
        setCurrentPath(prev => {
            if (!prev) return null;
            return { ...prev, points: [...prev.points, getSVGPoint(e)] };
        });
    }, [currentPath, getSVGPoint]);

    const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        e.preventDefault();
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (currentPath && currentPath.points.length > 0) {
            setPaths(prev => [...prev, currentPath]);
        }
        setCurrentPath(null);
    }, [currentPath]);

    const handleUndo = useCallback(() => {
        setPaths(prev => prev.slice(0, -1));
    }, []);

    const handleClear = useCallback(() => {
        setPaths([]);
        setCurrentPath(null);
    }, []);

    const handleInsert = useCallback(() => {
        const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-primary').trim() || '#ffffff';
        const allPaths = currentPath ? [...paths, currentPath] : paths;
        const svgString = pathsToSVG(allPaths, bgColor);
        const encoded = btoa(unescape(encodeURIComponent(svgString)));
        const dataUri = `data:image/svg+xml;base64,${encoded}`;
        const insertion = `\n\n![drawing](${dataUri})\n\n`;
        onUpdateNote(note.id, {
            content: note.content + insertion,
            viewMode: 'editor',
        });
    }, [paths, currentPath, note.id, note.content, onUpdateNote]);

    const handleCancel = useCallback(() => {
        onUpdateNote(note.id, { viewMode: 'editor' });
    }, [note.id, onUpdateNote]);

    const allPaths = currentPath ? [...paths, currentPath] : paths;

    return (
        <div className="drawing-canvas-container">
            <div className="drawing-toolbar">
                <div className="drawing-toolbar-left">
                    <button
                        className={`drawing-tool-btn ${tool === 'pen' ? 'active' : ''}`}
                        onClick={() => setTool('pen')}
                        title="Pen (P)"
                    >
                        ✏️ Pen
                    </button>
                    <button
                        className={`drawing-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setTool('eraser')}
                        title="Eraser (E)"
                    >
                        🧹 Eraser
                    </button>
                    <div className="drawing-separator" />
                    <label className="drawing-color-label">
                        <span>Color</span>
                        <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            disabled={tool === 'eraser'}
                        />
                    </label>
                    <label className="drawing-width-label">
                        <span>Width</span>
                        <input
                            type="range"
                            min={1}
                            max={20}
                            value={strokeWidth}
                            onChange={e => setStrokeWidth(Number(e.target.value))}
                        />
                        <span className="drawing-width-value">{strokeWidth}px</span>
                    </label>
                    <div className="drawing-separator" />
                    <button
                        className="drawing-action-btn"
                        onClick={handleUndo}
                        disabled={paths.length === 0}
                        title="Undo (Ctrl+Z)"
                    >
                        ↩ Undo
                    </button>
                    <button
                        className="drawing-action-btn drawing-clear-btn"
                        onClick={handleClear}
                        disabled={paths.length === 0 && !currentPath}
                        title="Clear canvas"
                    >
                        🗑 Clear
                    </button>
                </div>
                <div className="drawing-toolbar-right">
                    <span className="drawing-note-title">{note.title}</span>
                    <button className="drawing-cancel-btn" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button className="drawing-insert-btn" onClick={handleInsert}>
                        Insert Drawing
                    </button>
                </div>
            </div>
            <div className="drawing-svg-wrapper">
                <svg
                    ref={svgRef}
                    className="drawing-svg"
                    viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                >
                    {allPaths.map((path, i) => (
                        <path
                            key={i}
                            d={pointsToPathD(path.points)}
                            stroke={path.color}
                            strokeWidth={path.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};
