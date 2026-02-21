import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Note } from '../types';
import './styles/DrawingCanvas.css';

interface Point { x: number; y: number; }

export type DrawTool = 'move' | 'pencil' | 'pen' | 'highlighter' | 'marker' | 'crayon' | 'eraser';

interface DrawPath {
    kind: 'path';
    points: Point[];
    color: string;
    width: number;
    tool: DrawTool;
    opacity: number;
}

interface ImageElement {
    kind: 'image';
    src: string; // data URL
    x: number;
    y: number;
    width: number;
    height: number;
}

type CanvasElement = DrawPath | ImageElement;

interface DrawingCanvasProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
    existingSvg?: string;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

const TOOL_DEFAULTS: Record<DrawTool, { width: number; opacity: number; label: string; defaultColors: string[] }> = {
    move:        { width: 0,  opacity: 1.0,  label: 'Move',        defaultColors: [] },
    pencil:      { width: 2,  opacity: 0.75, label: 'Pencil',      defaultColors: ['#333333','#666666','#999999','#cccccc','#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7','#dda0dd'] },
    pen:         { width: 3,  opacity: 1.0,  label: 'Pen',         defaultColors: ['#000000','#1a1a2e','#16213e','#0f3460','#533483','#e94560','#2c3e50','#27ae60','#e74c3c','#8e44ad'] },
    highlighter: { width: 20, opacity: 0.35, label: 'Highlighter', defaultColors: ['#ffff00','#ff9900','#00ff00','#ff69b4','#00ffff','#ff6347','#adff2f','#ffd700','#ff1493','#7fff00'] },
    marker:      { width: 8,  opacity: 0.9,  label: 'Marker',      defaultColors: ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#e91e63','#00bcd4'] },
    crayon:      { width: 6,  opacity: 0.65, label: 'Crayon',      defaultColors: ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd','#00d2d3','#ff9f43','#10ac84','#ee5a24'] },
    eraser:      { width: 20, opacity: 1.0,  label: 'Eraser',      defaultColors: [] },
};

const TOOL_KEYS: Record<string, DrawTool> = {
    'm': 'move', '1': 'pencil', '2': 'pen', '3': 'highlighter', '4': 'marker', '5': 'crayon', 'e': 'eraser',
};

const STORAGE_KEY_PREFIX = 'yoro-drawing-colors-';

function loadToolColors(tool: DrawTool): string[] {
    if (tool === 'eraser' || tool === 'move') return [];
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
    if (tool === 'eraser' || tool === 'move') return;
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

function elementsToSVG(elements: CanvasElement[], bgColor: string): string {
    const defs = `  <defs>
    <filter id="crayon-texture">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>`;

    // explicit background rect (outside isolated group so destination-out reveals it)
    const bgRect = `  <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${bgColor}"/>`;

    const nodes = elements.map(el => {
        if (el.kind === 'image') {
            return `  <image href="${el.src}" x="${el.x.toFixed(0)}" y="${el.y.toFixed(0)}" width="${el.width.toFixed(0)}" height="${el.height.toFixed(0)}" preserveAspectRatio="xMidYMid meet"/>`;
        }
        const d = pointsToPathD(el.points);
        if (!d) return '';
        if (el.tool === 'eraser') {
            // true erase via destination-out inside isolated group
            return `  <path d="${d}" fill="black" stroke="black" stroke-width="${el.width}" stroke-linecap="round" stroke-linejoin="round" style="mix-blend-mode: destination-out"/>`;
        }
        const filter = el.tool === 'crayon' ? ` filter="url(#crayon-texture)"` : '';
        return `  <path d="${d}" stroke="${el.color}" stroke-width="${el.width}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${el.opacity}"${filter}/>`;
    }).filter(Boolean).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">\n${defs}\n${bgRect}\n<g style="isolation: isolate">\n${nodes}\n</g>\n</svg>`;
}

function parseSVGElements(svgString: string): CanvasElement[] {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const elements: CanvasElement[] = [];

        doc.querySelectorAll('image').forEach(el => {
            const src = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
            const x = parseFloat(el.getAttribute('x') || '0');
            const y = parseFloat(el.getAttribute('y') || '0');
            const width = parseFloat(el.getAttribute('width') || '200');
            const height = parseFloat(el.getAttribute('height') || '200');
            if (src) elements.push({ kind: 'image', src, x, y, width, height });
        });

        doc.querySelectorAll('path').forEach(el => {
            const d = el.getAttribute('d') || '';
            const style = el.getAttribute('style') || '';
            const isEraser = style.includes('destination-out');
            const stroke = el.getAttribute('stroke') || '#000000';
            const width = parseFloat(el.getAttribute('stroke-width') || '3');
            const opacity = parseFloat(el.getAttribute('opacity') || '1');
            if (!d) return;
            const coords = d.match(/-?\d+\.?\d*/g);
            if (!coords || coords.length < 2) return;
            const points: Point[] = [];
            for (let i = 0; i + 1 < coords.length; i += 2) {
                points.push({ x: parseFloat(coords[i]), y: parseFloat(coords[i + 1]) });
            }
            elements.push({
                kind: 'path',
                points,
                color: isEraser ? '#000000' : stroke,
                width,
                tool: isEraser ? 'eraser' : 'pen',
                opacity: isEraser ? 1 : opacity,
            });
        });

        return elements;
    } catch { return []; }
}

function decodeSvgDataUri(uri: string): string {
    try {
        const b64 = uri.replace(/^data:image\/svg\+xml;base64,/, '');
        return decodeURIComponent(escape(atob(b64)));
    } catch { return ''; }
}

async function imageFileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function svgToPngDataUrl(svgString: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const encoded = btoa(unescape(encodeURIComponent(svgString)));
        const dataUri = `data:image/svg+xml;base64,${encoded}`;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = dataUri;
    });
}

function hitTest(elements: CanvasElement[], px: number, py: number): number {
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.kind === 'image') {
            if (px >= el.x && px <= el.x + el.width && py >= el.y && py <= el.y + el.height) return i;
        } else if (el.kind === 'path') {
            const threshold = Math.max(el.width * 2, 12);
            if (el.points.some(p => Math.hypot(p.x - px, p.y - py) < threshold)) return i;
        }
    }
    return -1;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ note, onUpdateNote, existingSvg }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // History-based undo/redo
    const initElements = useRef<CanvasElement[]>(existingSvg ? parseSVGElements(decodeSvgDataUri(existingSvg)) : []);
    const historyRef = useRef<CanvasElement[][]>([initElements.current]);
    const historyIndexRef = useRef(0);
    const [elements, setElementsRaw] = useState<CanvasElement[]>(initElements.current);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const updateHistoryFlags = () => {
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    };

    const pushHistory = useCallback((newElements: CanvasElement[]) => {
        // truncate future on new action
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current.push(newElements);
        historyIndexRef.current = historyRef.current.length - 1;
        setElementsRaw(newElements);
        updateHistoryFlags();
    }, []);

    const handleUndo = useCallback(() => {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current--;
        setElementsRaw(historyRef.current[historyIndexRef.current]);
        setSelectedIdx(null);
        updateHistoryFlags();
    }, []);

    const handleRedo = useCallback(() => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current++;
        setElementsRaw(historyRef.current[historyIndexRef.current]);
        setSelectedIdx(null);
        updateHistoryFlags();
    }, []);

    const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);
    const [tool, setTool] = useState<DrawTool>('pen');
    const [toolColors, setToolColors] = useState<Record<DrawTool, string[]>>(() => {
        const tools: DrawTool[] = ['move', 'pencil', 'pen', 'highlighter', 'marker', 'crayon', 'eraser'];
        return Object.fromEntries(tools.map(t => [t, loadToolColors(t)])) as Record<DrawTool, string[]>;
    });
    const [color, setColor] = useState(() => loadToolColors('pen')[0] || '#000000');
    const [strokeWidth, setStrokeWidth] = useState(TOOL_DEFAULTS['pen'].width);
    const [editingColorIdx, setEditingColorIdx] = useState<number | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const isDrawing = useRef(false);
    const moveRef = useRef<{ idx: number; startX: number; startY: number } | null>(null);
    // snapshot of elements when move began (for single history entry per drag)
    const moveStartElementsRef = useRef<CanvasElement[] | null>(null);

    useEffect(() => {
        if (tool !== 'eraser' && tool !== 'move') {
            setColor(toolColors[tool][0] || TOOL_DEFAULTS[tool].defaultColors[0]);
        }
        setStrokeWidth(TOOL_DEFAULTS[tool].width);
        if (tool !== 'move') setSelectedIdx(null);
    }, [tool]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const newTool = TOOL_KEYS[e.key.toLowerCase()];
            if (newTool) { setTool(newTool); return; }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                handleRedo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                handleUndo();
                return;
            }
            if (e.key === '[') { setStrokeWidth(w => Math.max(1, w - 1)); return; }
            if (e.key === ']') { setStrokeWidth(w => Math.min(50, w + 1)); return; }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx !== null) {
                e.preventDefault();
                pushHistory(elements.filter((_, i) => i !== selectedIdx));
                setSelectedIdx(null);
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIdx, elements, handleUndo, handleRedo, pushHistory]);

    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = Array.from(e.clipboardData?.items ?? []);
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (!file) continue;
                    const dataUrl = await imageFileToDataUrl(file);
                    const img = new Image();
                    img.onload = () => {
                        const maxW = Math.min(img.naturalWidth, CANVAS_WIDTH * 0.5);
                        const scale = maxW / img.naturalWidth;
                        pushHistory([...elements, {
                            kind: 'image',
                            src: dataUrl,
                            x: (CANVAS_WIDTH - maxW) / 2,
                            y: 50,
                            width: maxW,
                            height: img.naturalHeight * scale,
                        }]);
                    };
                    img.src = dataUrl;
                    e.preventDefault();
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [elements, pushHistory]);

    const addImageFromFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const dataUrl = await imageFileToDataUrl(file);
        const img = new Image();
        img.onload = () => {
            const maxW = Math.min(img.naturalWidth, CANVAS_WIDTH * 0.5);
            const scale = maxW / img.naturalWidth;
            pushHistory([...elements, {
                kind: 'image',
                src: dataUrl,
                x: (CANVAS_WIDTH - maxW) / 2,
                y: 50,
                width: maxW,
                height: img.naturalHeight * scale,
            }]);
        };
        img.src = dataUrl;
    }, [elements, pushHistory]);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragOver(false), []);
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        for (const file of Array.from(e.dataTransfer.files)) {
            await addImageFromFile(file);
        }
    }, [addImageFromFile]);

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
        const pt = getSVGPoint(e);

        if (tool === 'move') {
            const idx = hitTest(elements, pt.x, pt.y);
            if (idx >= 0) {
                setSelectedIdx(idx);
                moveRef.current = { idx, startX: pt.x, startY: pt.y };
                moveStartElementsRef.current = elements.map(el => ({ ...el }));
            } else {
                setSelectedIdx(null);
                moveRef.current = null;
                moveStartElementsRef.current = null;
            }
            return;
        }

        isDrawing.current = true;
        const newPath: DrawPath = {
            kind: 'path',
            points: [pt],
            color: tool === 'eraser' ? '#000000' : color,
            width: strokeWidth,
            tool,
            opacity: TOOL_DEFAULTS[tool].opacity,
        };
        setCurrentPath(newPath);
    }, [tool, color, strokeWidth, getSVGPoint, elements]);

    const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        e.preventDefault();
        const pt = getSVGPoint(e);

        if (tool === 'move' && moveRef.current) {
            const { idx, startX, startY } = moveRef.current;
            const dx = pt.x - startX;
            const dy = pt.y - startY;
            moveRef.current = { idx, startX: pt.x, startY: pt.y };

            setElementsRaw(prev => prev.map((el, i) => {
                if (i !== idx) return el;
                if (el.kind === 'image') return { ...el, x: el.x + dx, y: el.y + dy };
                return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            }));
            return;
        }

        if (!isDrawing.current || !currentPath) return;
        setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
    }, [tool, currentPath, getSVGPoint]);

    const handlePointerUp = useCallback(() => {
        if (tool === 'move') {
            if (moveRef.current !== null && moveStartElementsRef.current) {
                // commit the move as a single history entry
                // elements has been updated live via setElementsRaw; push to history
                setElementsRaw(current => {
                    pushHistory(current);
                    return current;
                });
            }
            moveRef.current = null;
            moveStartElementsRef.current = null;
            return;
        }

        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (currentPath && currentPath.points.length > 0) {
            pushHistory([...elements, currentPath]);
        }
        setCurrentPath(null);
    }, [tool, currentPath, elements, pushHistory]);

    const handleClear = useCallback(() => {
        pushHistory([]);
        setCurrentPath(null);
        setSelectedIdx(null);
    }, [pushHistory]);

    const handleInsert = useCallback(() => {
        const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-primary').trim() || '#ffffff';
        const allElements: CanvasElement[] = currentPath ? [...elements, currentPath] : elements;
        const svgString = elementsToSVG(allElements, bgColor);
        const encoded = btoa(unescape(encodeURIComponent(svgString)));
        const dataUri = `data:image/svg+xml;base64,${encoded}`;
        const insertion = `![drawing](${dataUri})`;

        let newContent: string;
        if (existingSvg && note.content.includes(existingSvg)) {
            newContent = note.content.replace(`![drawing](${existingSvg})`, insertion);
        } else {
            newContent = note.content + `\n\n${insertion}\n\n`;
        }

        onUpdateNote(note.id, {
            content: newContent,
            viewMode: 'editor',
            drawingEditSrc: undefined,
        });
    }, [elements, currentPath, note.id, note.content, existingSvg, onUpdateNote]);

    const handleExportSVG = useCallback(() => {
        const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-primary').trim() || '#ffffff';
        const allElements: CanvasElement[] = currentPath ? [...elements, currentPath] : elements;
        const svgString = elementsToSVG(allElements, bgColor);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title || 'drawing'}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }, [elements, currentPath, note.title]);

    const handleExportPNG = useCallback(async () => {
        const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-primary').trim() || '#ffffff';
        const allElements: CanvasElement[] = currentPath ? [...elements, currentPath] : elements;
        const svgString = elementsToSVG(allElements, bgColor);
        const pngUrl = await svgToPngDataUrl(svgString, CANVAS_WIDTH, CANVAS_HEIGHT);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${note.title || 'drawing'}.png`;
        a.click();
    }, [elements, currentPath, note.title]);

    const handleCancel = useCallback(() => {
        onUpdateNote(note.id, { viewMode: 'editor', drawingEditSrc: undefined });
    }, [note.id, onUpdateNote]);

    const handleColorSelect = (selectedColor: string) => setColor(selectedColor);
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

    const allElements: CanvasElement[] = currentPath ? [...elements, currentPath] : elements;
    const currentColors = (tool !== 'eraser' && tool !== 'move') ? toolColors[tool] : [];
    const showColorControls = tool !== 'eraser' && tool !== 'move';

    const getCursor = () => {
        if (tool === 'move') return moveRef.current ? 'grabbing' : 'grab';
        if (tool === 'eraser') return 'cell';
        return 'crosshair';
    };

    const getSelectionBounds = (el: CanvasElement) => {
        if (el.kind === 'image') return { x: el.x, y: el.y, w: el.width, h: el.height };
        if (el.points.length === 0) return null;
        const xs = el.points.map(p => p.x);
        const ys = el.points.map(p => p.y);
        const pad = el.width / 2 + 4;
        return {
            x: Math.min(...xs) - pad, y: Math.min(...ys) - pad,
            w: Math.max(...xs) - Math.min(...xs) + pad * 2,
            h: Math.max(...ys) - Math.min(...ys) + pad * 2,
        };
    };

    return (
        <div className="drawing-canvas-container">
            <div className="drawing-toolbar">
                <div className="drawing-toolbar-left">
                    <button
                        className={`drawing-tool-btn ${tool === 'move' ? 'active' : ''}`}
                        onClick={() => setTool('move')}
                        title="Move / Select (M)"
                    >Move</button>

                    <div className="drawing-separator" />

                    {(['pencil', 'pen', 'highlighter', 'marker', 'crayon', 'eraser'] as DrawTool[]).map((t, i) => (
                        <button
                            key={t}
                            className={`drawing-tool-btn ${tool === t ? 'active' : ''}`}
                            onClick={() => setTool(t)}
                            title={`${TOOL_DEFAULTS[t].label} (${t === 'eraser' ? 'E' : i + 1})`}
                        >{TOOL_DEFAULTS[t].label}</button>
                    ))}

                    <div className="drawing-separator" />

                    {showColorControls && (
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
                                    <button className="drawing-color-edit-btn" onClick={() => setEditingColorIdx(editingColorIdx === idx ? null : idx)} title="Edit colour">...</button>
                                    <button className="drawing-color-remove-btn" onClick={() => handleRemoveColor(idx)} title="Remove colour">x</button>
                                </div>
                            ))}
                            {currentColors.length < 10 && (
                                <button className="drawing-color-add-btn" onClick={handleAddColor} title="Save current colour" style={{ borderColor: color }}>+</button>
                            )}
                            <label className="drawing-color-label" title="Pick colour">
                                <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                            </label>
                        </div>
                    )}

                    {showColorControls && <div className="drawing-separator" />}

                    {tool !== 'move' && (
                        <label className="drawing-width-label">
                            <span>Width</span>
                            <input type="range" min={1} max={50} value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} />
                            <span className="drawing-width-value">{strokeWidth}px</span>
                        </label>
                    )}

                    {tool !== 'move' && <div className="drawing-separator" />}

                    <button className="drawing-action-btn" onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
                    <button className="drawing-action-btn" onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">Redo</button>
                    <button className="drawing-action-btn drawing-clear-btn" onClick={handleClear} disabled={elements.length === 0 && !currentPath} title="Clear canvas">Clear</button>

                    <div className="drawing-separator" />

                    <button className="drawing-action-btn" onClick={handleExportSVG} title="Export as SVG">SVG</button>
                    <button className="drawing-action-btn" onClick={handleExportPNG} title="Export as PNG">PNG</button>
                </div>
                <div className="drawing-toolbar-right">
                    <div className="drawing-keybind-hint">M: move · 1-5: tools · E: eraser · [/]: width · Ctrl+Z: undo · Ctrl+Shift+Z: redo · Del: remove</div>
                    <span className="drawing-note-title">{note.title}</span>
                    <button className="drawing-cancel-btn" onClick={handleCancel}>Cancel</button>
                    <button className="drawing-insert-btn" onClick={handleInsert}>
                        {existingSvg ? 'Update Drawing' : 'Insert Drawing'}
                    </button>
                </div>
            </div>
            <div
                ref={wrapperRef}
                className={`drawing-svg-wrapper ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragOver && <div className="drawing-drop-overlay">Drop image here</div>}
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
                    {/* explicit bg rect so destination-out has something to reveal */}
                    <rect
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        fill={getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#ffffff'}
                    />
                    {/* isolated group so eraser destination-out is scoped */}
                    <g style={{ isolation: 'isolate' }}>
                        {allElements.map((el, i) => {
                            const isSelected = tool === 'move' && selectedIdx === i;
                            if (el.kind === 'image') {
                                return (
                                    <g key={i}>
                                        <image href={el.src} x={el.x} y={el.y} width={el.width} height={el.height} preserveAspectRatio="xMidYMid meet" />
                                        {isSelected && (
                                            <rect x={el.x - 2} y={el.y - 2} width={el.width + 4} height={el.height + 4} fill="none" stroke="var(--primary, #0070f3)" strokeWidth={2} strokeDasharray="6 3" />
                                        )}
                                    </g>
                                );
                            }
                            const bounds = isSelected ? getSelectionBounds(el) : null;
                            const isEraser = el.tool === 'eraser';
                            return (
                                <g key={i}>
                                    <path
                                        d={pointsToPathD(el.points)}
                                        stroke={isEraser ? 'black' : el.color}
                                        strokeWidth={el.width}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill={isEraser ? 'black' : 'none'}
                                        opacity={isEraser ? 1 : el.opacity}
                                        filter={el.tool === 'crayon' ? 'url(#crayon-texture)' : undefined}
                                        style={isEraser ? { mixBlendMode: 'destination-out' } : undefined}
                                    />
                                    {isSelected && bounds && (
                                        <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="none" stroke="var(--primary, #0070f3)" strokeWidth={1.5} strokeDasharray="6 3" />
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
};
