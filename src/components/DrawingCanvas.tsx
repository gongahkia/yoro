import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Note } from '../types';
import './styles/DrawingCanvas.css';

interface Point {
    x: number;
    y: number;
}

export type DrawTool = 'pencil' | 'pen' | 'highlighter' | 'marker' | 'crayon' | 'eraser';

interface DrawPath {
    points: Point[];
    color: string;
    width: number;
    tool: DrawTool;
    opacity: number;
}

interface DrawingCanvasProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
    /** If provided, the canvas will be pre-loaded with this SVG content for editing */
    existingSvg?: string;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

// Tool characteristics
const TOOL_DEFAULTS: Record<DrawTool, { width: number; opacity: number; label: string; defaultColors: string[] }> = {
    pencil:      { width: 2,  opacity: 0.75, label: 'Pencil',      defaultColors: ['#333333','#666666','#999999','#cccccc','#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7','#dda0dd'] },
    pen:         { width: 3,  opacity: 1.0,  label: 'Pen',         defaultColors: ['#000000','#1a1a2e','#16213e','#0f3460','#533483','#e94560','#2c3e50','#27ae60','#e74c3c','#8e44ad'] },
    highlighter: { width: 20, opacity: 0.35, label: 'Highlighter', defaultColors: ['#ffff00','#ff9900','#00ff00','#ff69b4','#00ffff','#ff6347','#adff2f','#ffd700','#ff1493','#7fff00'] },
    marker:      { width: 8,  opacity: 0.9,  label: 'Marker',      defaultColors: ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#e91e63','#00bcd4'] },
    crayon:      { width: 6,  opacity: 0.65, label: 'Crayon',      defaultColors: ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd','#00d2d3','#ff9f43','#10ac84','#ee5a24'] },
    eraser:      { width: 20, opacity: 1.0,  label: 'Eraser',      defaultColors: [] },
};

const TOOL_KEYS: Record<string, DrawTool> = {
    '1': 'pencil', '2': 'pen', '3': 'highlighter', '4': 'marker', '5': 'crayon', 'e': 'eraser',
};

const STORAGE_KEY_PREFIX = 'yoro-drawing-colors-';

function loadToolColors(tool: DrawTool): string[] {
    if (tool === 'eraser') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PREFIX + tool);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.slice(0, 10);
        }
    } catch { /* ignore */ }
    return [...TOOL_DEFAULTS[tool].defaultColors];
}

function saveToolColors(tool: DrawTool, colors: string[]) {
    if (tool === 'eraser') return;
    localStorage.setItem(STORAGE_KEY_PREFIX + tool, JSON.stringify(colors.slice(0, 10)));
}

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
        const color = path.tool === 'eraser' ? bgColor : path.color;
        const filter = path.tool === 'crayon'
            ? ` filter="url(#crayon-texture)"`
            : '';
        return `  <path d="${d}" stroke="${color}" stroke-width="${path.width}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${path.opacity}"${filter}/>`;
    }).filter(Boolean).join('\n');

    const defs = `  <defs>
    <filter id="crayon-texture">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" style="background:${bgColor}">\n${defs}\n${pathElements}\n</svg>`;
}

/** Parse paths from an existing SVG data URI for re-editing */
function parseSVGPaths(svgString: string): DrawPath[] {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const pathEls = doc.querySelectorAll('path');
        const paths: DrawPath[] = [];
        pathEls.forEach(el => {
            const d = el.getAttribute('d') || '';
            const stroke = el.getAttribute('stroke') || '#000000';
            const width = parseFloat(el.getAttribute('stroke-width') || '3');
            const opacity = parseFloat(el.getAttribute('opacity') || '1');
            if (!d) return;
            // Convert path d back to points (approximate: extract M/L coords)
            const coords = d.match(/-?\d+\.?\d*/g);
            if (!coords || coords.length < 2) return;
            const points: Point[] = [];
            for (let i = 0; i + 1 < coords.length; i += 2) {
                points.push({ x: parseFloat(coords[i]), y: parseFloat(coords[i + 1]) });
            }
            paths.push({ points, color: stroke, width, tool: 'pen', opacity });
        });
        return paths;
    } catch {
        return [];
    }
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ note, onUpdateNote, existingSvg }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [paths, setPaths] = useState<DrawPath[]>(() => existingSvg ? parseSVGPaths(existingSvg) : []);
    const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);
    const [tool, setTool] = useState<DrawTool>('pen');
    const [toolColors, setToolColors] = useState<Record<DrawTool, string[]>>(() => {
        const tools: DrawTool[] = ['pencil', 'pen', 'highlighter', 'marker', 'crayon', 'eraser'];
        return Object.fromEntries(tools.map(t => [t, loadToolColors(t)])) as Record<DrawTool, string[]>;
    });
    const [color, setColor] = useState(() => loadToolColors('pen')[0] || '#000000');
    const [strokeWidth, setStrokeWidth] = useState(TOOL_DEFAULTS['pen'].width);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [editingColorIdx, setEditingColorIdx] = useState<number | null>(null);
    const isDrawing = useRef(false);

    // Sync color/width when tool changes
    useEffect(() => {
        if (tool !== 'eraser') {
            setColor(toolColors[tool][0] || TOOL_DEFAULTS[tool].defaultColors[0]);
        }
        setStrokeWidth(TOOL_DEFAULTS[tool].width);
    }, [tool]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            // Tool switching: 1-5 + E
            const newTool = TOOL_KEYS[e.key.toLowerCase()];
            if (newTool) { setTool(newTool); return; }
            // Undo: Ctrl/Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                setPaths(prev => prev.slice(0, -1));
                return;
            }
            // Width: [ to decrease, ] to increase
            if (e.key === '[') { setStrokeWidth(w => Math.max(1, w - 1)); return; }
            if (e.key === ']') { setStrokeWidth(w => Math.min(50, w + 1)); return; }
            // Color picker: C
            if (e.key === 'c' || e.key === 'C') { setShowColorPicker(p => !p); return; }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
            width: tool === 'eraser' ? strokeWidth : strokeWidth,
            tool,
            opacity: TOOL_DEFAULTS[tool].opacity,
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

    const handleColorSelect = (selectedColor: string) => {
        setColor(selectedColor);
        setShowColorPicker(false);
    };

    const handleColorEdit = (idx: number, newColor: string) => {
        setToolColors(prev => {
            const updated = [...prev[tool]];
            updated[idx] = newColor;
            saveToolColors(tool, updated);
            return { ...prev, [tool]: updated };
        });
        setColor(newColor);
    };

    const handleAddColor = () => {
        setToolColors(prev => {
            const current = prev[tool];
            if (current.length >= 10) return prev;
            const updated = [...current, color];
            saveToolColors(tool, updated);
            return { ...prev, [tool]: updated };
        });
    };

    const handleRemoveColor = (idx: number) => {
        setToolColors(prev => {
            const updated = prev[tool].filter((_, i) => i !== idx);
            saveToolColors(tool, updated);
            return { ...prev, [tool]: updated };
        });
    };

    const allPaths = currentPath ? [...paths, currentPath] : paths;
    const currentColors = tool !== 'eraser' ? toolColors[tool] : [];

    const getCursor = () => {
        if (tool === 'eraser') return 'cell';
        if (tool === 'highlighter') return 'crosshair';
        return 'crosshair';
    };

    return (
        <div className="drawing-canvas-container">
            <div className="drawing-toolbar">
                <div className="drawing-toolbar-left">
                    {/* Tool buttons */}
                    {(Object.keys(TOOL_DEFAULTS) as DrawTool[]).map((t, i) => (
                        <button
                            key={t}
                            className={`drawing-tool-btn ${tool === t ? 'active' : ''}`}
                            onClick={() => setTool(t)}
                            title={`${TOOL_DEFAULTS[t].label} (${t === 'eraser' ? 'E' : i + 1})`}
                        >
                            {TOOL_DEFAULTS[t].label}
                        </button>
                    ))}

                    <div className="drawing-separator" />

                    {/* Color palette */}
                    {tool !== 'eraser' && (
                        <div className="drawing-color-palette">
                            {currentColors.map((c, idx) => (
                                <div key={idx} className="drawing-color-swatch-wrapper">
                                    <button
                                        className={`drawing-color-swatch ${c === color ? 'active' : ''}`}
                                        style={{ background: c }}
                                        onClick={() => handleColorSelect(c)}
                                        title={c}
                                    />
                                    {editingColorIdx === idx && (
                                        <input
                                            type="color"
                                            className="drawing-color-inline-picker"
                                            value={c}
                                            onChange={e => handleColorEdit(idx, e.target.value)}
                                            onBlur={() => setEditingColorIdx(null)}
                                            autoFocus
                                        />
                                    )}
                                    <button
                                        className="drawing-color-edit-btn"
                                        onClick={() => setEditingColorIdx(editingColorIdx === idx ? null : idx)}
                                        title="Edit colour"
                                    >
                                        ...
                                    </button>
                                    <button
                                        className="drawing-color-remove-btn"
                                        onClick={() => handleRemoveColor(idx)}
                                        title="Remove colour"
                                    >
                                        x
                                    </button>
                                </div>
                            ))}
                            {currentColors.length < 10 && (
                                <button
                                    className="drawing-color-add-btn"
                                    onClick={handleAddColor}
                                    title={`Add current colour (${color})`}
                                    style={{ borderColor: color }}
                                >
                                    +
                                </button>
                            )}
                            <label className="drawing-color-label" title="Pick colour (C)">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                />
                            </label>
                        </div>
                    )}

                    <div className="drawing-separator" />

                    {/* Width control */}
                    <label className="drawing-width-label">
                        <span>Width</span>
                        <input
                            type="range"
                            min={1}
                            max={50}
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
                        Undo
                    </button>
                    <button
                        className="drawing-action-btn drawing-clear-btn"
                        onClick={handleClear}
                        disabled={paths.length === 0 && !currentPath}
                        title="Clear canvas"
                    >
                        Clear
                    </button>
                </div>
                <div className="drawing-toolbar-right">
                    <div className="drawing-keybind-hint">1-5: tools · E: eraser · [/]: width · C: colour · Ctrl+Z: undo</div>
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
                    style={{ cursor: getCursor() }}
                >
                    <defs>
                        <filter id="crayon-texture">
                            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
                        </filter>
                    </defs>
                    {allPaths.map((path, i) => (
                        <path
                            key={i}
                            d={pointsToPathD(path.points)}
                            stroke={path.color}
                            strokeWidth={path.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            opacity={path.opacity}
                            filter={path.tool === 'crayon' ? 'url(#crayon-texture)' : undefined}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};
