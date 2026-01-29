import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow,
    Position,
    type Node,
    type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { Note } from '../types';
import './styles/KnowledgeGraph.css';

interface KnowledgeGraphProps {
    notes: Note[];
    onNavigate: (noteId: string) => void;
    onClose: () => void;
}

interface GraphNodeData extends Record<string, unknown> {
    label: string;
    noteId: string;
    linkCount: number;
    tags: string[];
    preview: string;
    isHighlighted: boolean;
    isDimmed: boolean;
    color: string;
}

type LayoutType = 'hierarchical' | 'force' | 'radial' | 'circular';

const nodeWidth = 180;
const nodeHeight = 60;

// Color palette for tags
const tagColors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
];

// Parse wikilinks from note content
const parseWikilinks = (content: string): string[] => {
    const regex = /\[\[(.*?)\]\]/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.push(match[1]);
    }
    return matches;
};

// Parse internal markdown links
const parseInternalLinks = (content: string): string[] => {
    const regex = /\[([^\]]+)\]\(\/note\/([a-zA-Z0-9-]+)\)/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.push(match[1]);
    }
    return matches;
};

// Get preview text from content
const getPreview = (content: string, maxLength = 100): string => {
    const cleaned = content
        .replace(/^#+ .*/gm, '') // Remove headings
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
        .replace(/\[\[([^\]]+)\]\]/g, '$1') // Replace wikilinks with text
        .replace(/[*_`~]/g, '') // Remove formatting
        .trim();

    const firstLine = cleaned.split('\n').find(line => line.trim().length > 0) || '';
    return firstLine.length > maxLength
        ? firstLine.slice(0, maxLength) + '...'
        : firstLine || 'No content';
};

// Hierarchical layout using dagre
const getHierarchicalLayout = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: direction,
        ranksep: 100,
        nodesep: 80,
        edgesep: 50
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
            targetPosition: direction === 'TB' ? Position.Top : Position.Left,
            sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
        };
    });
};

// Force-directed layout (simple spring simulation)
const getForceLayout = (nodes: Node[], edges: Edge[]): Node[] => {
    const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    const width = 1200;
    const height = 800;

    // Initialize random positions
    nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length;
        const radius = Math.min(width, height) / 3;
        positions.set(node.id, {
            x: width / 2 + radius * Math.cos(angle),
            y: height / 2 + radius * Math.sin(angle),
            vx: 0,
            vy: 0
        });
    });

    // Create adjacency for faster lookup
    const adjacency = new Map<string, Set<string>>();
    nodes.forEach(n => adjacency.set(n.id, new Set()));
    edges.forEach(e => {
        adjacency.get(e.source)?.add(e.target);
        adjacency.get(e.target)?.add(e.source);
    });

    // Run simulation
    const iterations = 100;
    const repulsion = 5000;
    const attraction = 0.05;
    const damping = 0.9;

    for (let i = 0; i < iterations; i++) {
        // Repulsion between all nodes
        nodes.forEach(n1 => {
            const p1 = positions.get(n1.id)!;
            nodes.forEach(n2 => {
                if (n1.id === n2.id) return;
                const p2 = positions.get(n2.id)!;
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = repulsion / (dist * dist);
                p1.vx += (dx / dist) * force;
                p1.vy += (dy / dist) * force;
            });
        });

        // Attraction along edges
        edges.forEach(e => {
            const p1 = positions.get(e.source);
            const p2 = positions.get(e.target);
            if (!p1 || !p2) return;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = dist * attraction;
            p1.vx += (dx / dist) * force;
            p1.vy += (dy / dist) * force;
            p2.vx -= (dx / dist) * force;
            p2.vy -= (dy / dist) * force;
        });

        // Apply velocities with damping
        positions.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= damping;
            p.vy *= damping;
            // Keep in bounds
            p.x = Math.max(nodeWidth, Math.min(width - nodeWidth, p.x));
            p.y = Math.max(nodeHeight, Math.min(height - nodeHeight, p.y));
        });
    }

    return nodes.map(node => {
        const pos = positions.get(node.id)!;
        return {
            ...node,
            position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
            targetPosition: Position.Top,
            sourcePosition: Position.Bottom,
        };
    });
};

// Radial layout
const getRadialLayout = (nodes: Node[], edges: Edge[]): Node[] => {
    // Find the most connected node as center
    const linkCounts = new Map<string, number>();
    nodes.forEach(n => linkCounts.set(n.id, 0));
    edges.forEach(e => {
        linkCounts.set(e.source, (linkCounts.get(e.source) || 0) + 1);
        linkCounts.set(e.target, (linkCounts.get(e.target) || 0) + 1);
    });

    const sortedNodes = [...nodes].sort((a, b) =>
        (linkCounts.get(b.id) || 0) - (linkCounts.get(a.id) || 0)
    );

    const centerX = 600;
    const centerY = 400;
    const baseRadius = 150;

    return sortedNodes.map((node, i) => {
        if (i === 0) {
            // Center node
            return {
                ...node,
                position: { x: centerX - nodeWidth / 2, y: centerY - nodeHeight / 2 },
                targetPosition: Position.Top,
                sourcePosition: Position.Bottom,
            };
        }

        // Calculate ring and position
        const ring = Math.ceil(Math.sqrt(i));
        const nodesInRing = ring * 6; // Approximate nodes per ring
        const positionInRing = (i - (ring - 1) * (ring - 1) * 6 / 4);
        const angle = (2 * Math.PI * positionInRing) / nodesInRing;
        const radius = baseRadius * ring;

        return {
            ...node,
            position: {
                x: centerX + radius * Math.cos(angle) - nodeWidth / 2,
                y: centerY + radius * Math.sin(angle) - nodeHeight / 2,
            },
            targetPosition: Position.Top,
            sourcePosition: Position.Bottom,
        };
    });
};

// Circular layout
const getCircularLayout = (nodes: Node[]): Node[] => {
    const centerX = 600;
    const centerY = 400;
    const radius = Math.max(200, nodes.length * 20);

    return nodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
        return {
            ...node,
            position: {
                x: centerX + radius * Math.cos(angle) - nodeWidth / 2,
                y: centerY + radius * Math.sin(angle) - nodeHeight / 2,
            },
            targetPosition: Position.Top,
            sourcePosition: Position.Bottom,
        };
    });
};

const GraphNode: React.FC<{ data: GraphNodeData }> = ({ data }) => {
    const [showPreview, setShowPreview] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    // Calculate size based on link count
    const scale = Math.min(1.3, 1 + data.linkCount * 0.05);

    return (
        <div
            ref={nodeRef}
            className={`knowledge-graph-node ${data.isHighlighted ? 'highlighted' : ''} ${data.isDimmed ? 'dimmed' : ''}`}
            style={{
                transform: `scale(${scale})`,
                borderColor: data.color,
                boxShadow: data.isHighlighted
                    ? `0 0 20px ${data.color}40`
                    : undefined
            }}
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
        >
            <div className="node-label" title={data.label}>
                {data.label || 'Untitled'}
            </div>
            <div className="node-meta">
                <span className="node-count">
                    {data.linkCount} link{data.linkCount !== 1 ? 's' : ''}
                </span>
                {data.tags.length > 0 && (
                    <span className="node-tag" style={{ background: data.color + '30', color: data.color }}>
                        #{data.tags[0]}
                    </span>
                )}
            </div>
            {showPreview && (
                <div className="node-preview">
                    {data.preview}
                </div>
            )}
        </div>
    );
};

const nodeTypes = {
    graphNode: GraphNode,
};

const KnowledgeGraphInner: React.FC<KnowledgeGraphProps> = ({ notes, onNavigate, onClose }) => {
    const [layout, setLayout] = useState<LayoutType>('force');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [showIsolated, setShowIsolated] = useState(true);
    const { fitView } = useReactFlow();

    // Collect all unique tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        notes.forEach(note => {
            if (!note.deletedAt && note.title !== 'config.toml') {
                note.tags.forEach(t => tags.add(t));
            }
        });
        return Array.from(tags).sort();
    }, [notes]);

    // Assign colors to tags
    const tagColorMap = useMemo(() => {
        const map = new Map<string, string>();
        allTags.forEach((tag, i) => {
            map.set(tag, tagColors[i % tagColors.length]);
        });
        return map;
    }, [allTags]);

    // Build graph data from notes
    const { baseNodes, baseEdges, adjacencyMap } = useMemo(() => {
        const noteByTitle = new Map<string, Note>();
        const noteById = new Map<string, Note>();

        // Filter out deleted notes and config
        const activeNotes = notes.filter(n => !n.deletedAt && n.title !== 'config.toml');

        activeNotes.forEach(note => {
            noteByTitle.set(note.title || 'Untitled', note);
            noteById.set(note.id, note);
        });

        const edges: Edge[] = [];
        const linkCounts = new Map<string, number>();
        const adjacency = new Map<string, Set<string>>();

        // Initialize
        activeNotes.forEach(note => {
            linkCounts.set(note.id, 0);
            adjacency.set(note.id, new Set());
        });

        // Parse all notes for links
        activeNotes.forEach(note => {
            const wikilinks = parseWikilinks(note.content);
            const internalLinks = parseInternalLinks(note.content);

            [...wikilinks, ...internalLinks].forEach(linkTitle => {
                const targetNote = noteByTitle.get(linkTitle);
                if (targetNote && targetNote.id !== note.id) {
                    const edgeId = `${note.id}-${targetNote.id}`;
                    if (!edges.find(e => e.id === edgeId)) {
                        edges.push({
                            id: edgeId,
                            source: note.id,
                            target: targetNote.id,
                            type: 'smoothstep',
                            animated: false,
                            style: { stroke: 'var(--primary)', strokeWidth: 2 },
                        });
                        linkCounts.set(note.id, (linkCounts.get(note.id) || 0) + 1);
                        linkCounts.set(targetNote.id, (linkCounts.get(targetNote.id) || 0) + 1);
                        adjacency.get(note.id)?.add(targetNote.id);
                        adjacency.get(targetNote.id)?.add(note.id);
                    }
                }
            });
        });

        const nodes: Node<GraphNodeData>[] = activeNotes.map(note => {
            const primaryTag = note.tags[0];
            const color = primaryTag ? tagColorMap.get(primaryTag) || 'var(--primary)' : 'var(--primary)';

            return {
                id: note.id,
                type: 'graphNode',
                data: {
                    label: note.title || 'Untitled',
                    noteId: note.id,
                    linkCount: linkCounts.get(note.id) || 0,
                    tags: note.tags,
                    preview: getPreview(note.content),
                    isHighlighted: false,
                    isDimmed: false,
                    color,
                },
                position: { x: 0, y: 0 },
            };
        });

        return { baseNodes: nodes, baseEdges: edges, adjacencyMap: adjacency };
    }, [notes, tagColorMap]);

    // Filter and process nodes
    const { filteredNodes, filteredEdges } = useMemo(() => {
        let nodes = baseNodes;
        let edges = baseEdges;

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchingIds = new Set(
                nodes
                    .filter(n => (n.data as GraphNodeData).label.toLowerCase().includes(query))
                    .map(n => n.id)
            );
            nodes = nodes.filter(n => matchingIds.has(n.id));
            edges = edges.filter(e => matchingIds.has(e.source) && matchingIds.has(e.target));
        }

        // Filter by tags
        if (selectedTags.size > 0) {
            const matchingIds = new Set(
                nodes
                    .filter(n => (n.data as GraphNodeData).tags.some(t => selectedTags.has(t)))
                    .map(n => n.id)
            );
            nodes = nodes.filter(n => matchingIds.has(n.id));
            edges = edges.filter(e => matchingIds.has(e.source) && matchingIds.has(e.target));
        }

        // Filter isolated nodes
        if (!showIsolated) {
            const connectedIds = new Set<string>();
            edges.forEach(e => {
                connectedIds.add(e.source);
                connectedIds.add(e.target);
            });
            nodes = nodes.filter(n => connectedIds.has(n.id));
        }

        // Apply focus highlighting
        if (focusedNodeId) {
            const connectedToFocus = adjacencyMap.get(focusedNodeId) || new Set();
            nodes = nodes.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    isHighlighted: n.id === focusedNodeId || connectedToFocus.has(n.id),
                    isDimmed: n.id !== focusedNodeId && !connectedToFocus.has(n.id),
                } as GraphNodeData
            }));
            edges = edges.map(e => ({
                ...e,
                animated: e.source === focusedNodeId || e.target === focusedNodeId,
                style: {
                    ...e.style,
                    opacity: (e.source === focusedNodeId || e.target === focusedNodeId) ? 1 : 0.2,
                    strokeWidth: (e.source === focusedNodeId || e.target === focusedNodeId) ? 3 : 1,
                }
            }));
        }

        return { filteredNodes: nodes, filteredEdges: edges };
    }, [baseNodes, baseEdges, searchQuery, selectedTags, showIsolated, focusedNodeId, adjacencyMap]);

    // Apply layout
    const layoutedNodes = useMemo(() => {
        switch (layout) {
            case 'hierarchical':
                return getHierarchicalLayout(filteredNodes, filteredEdges);
            case 'force':
                return getForceLayout(filteredNodes, filteredEdges);
            case 'radial':
                return getRadialLayout(filteredNodes, filteredEdges);
            case 'circular':
                return getCircularLayout(filteredNodes);
            default:
                return filteredNodes;
        }
    }, [filteredNodes, filteredEdges, layout]);

    const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(filteredEdges);

    // Update nodes when layout or filters change
    useEffect(() => {
        setFlowNodes(layoutedNodes);
        setFlowEdges(filteredEdges);
        // Fit view after layout change
        setTimeout(() => fitView({ padding: 0.2 }), 50);
    }, [layoutedNodes, filteredEdges, setFlowNodes, setFlowEdges, fitView]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (focusedNodeId === node.id) {
            // Double-click behavior: navigate to note
            onNavigate(node.id);
        } else {
            // Single click: focus on node
            setFocusedNodeId(node.id);
        }
    }, [focusedNodeId, onNavigate]);

    const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
        onNavigate(node.id);
    }, [onNavigate]);

    const onPaneClick = useCallback(() => {
        setFocusedNodeId(null);
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => {
            const next = new Set(prev);
            if (next.has(tag)) {
                next.delete(tag);
            } else {
                next.add(tag);
            }
            return next;
        });
    };

    const stats = useMemo(() => {
        const connected = new Set<string>();
        filteredEdges.forEach(edge => {
            connected.add(edge.source);
            connected.add(edge.target);
        });
        return {
            total: flowNodes.length,
            connections: filteredEdges.length,
            connected: connected.size,
            isolated: flowNodes.length - connected.size
        };
    }, [flowNodes, filteredEdges]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (focusedNodeId) {
                    setFocusedNodeId(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusedNodeId, onClose]);

    return (
        <div className="knowledge-graph-container">
            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
                style={{ background: 'var(--bg-primary)' }}
            >
                <Background color="var(--border-color)" gap={20} />
                <Controls />
                <MiniMap
                    nodeColor={(node) => (node.data as GraphNodeData).color}
                    maskColor="rgba(0, 0, 0, 0.2)"
                    style={{ background: 'var(--bg-primary)' }}
                />

                {/* Search and Filter Panel */}
                <Panel position="top-left" className="knowledge-graph-controls">
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="graph-search"
                    />

                    <div className="layout-buttons">
                        <button
                            className={layout === 'force' ? 'active' : ''}
                            onClick={() => setLayout('force')}
                            title="Force-directed layout"
                        >
                            Force
                        </button>
                        <button
                            className={layout === 'hierarchical' ? 'active' : ''}
                            onClick={() => setLayout('hierarchical')}
                            title="Hierarchical layout"
                        >
                            Tree
                        </button>
                        <button
                            className={layout === 'radial' ? 'active' : ''}
                            onClick={() => setLayout('radial')}
                            title="Radial layout"
                        >
                            Radial
                        </button>
                        <button
                            className={layout === 'circular' ? 'active' : ''}
                            onClick={() => setLayout('circular')}
                            title="Circular layout"
                        >
                            Circle
                        </button>
                    </div>

                    <label className="toggle-option">
                        <input
                            type="checkbox"
                            checked={showIsolated}
                            onChange={(e) => setShowIsolated(e.target.checked)}
                        />
                        Show isolated notes
                    </label>

                    {allTags.length > 0 && (
                        <div className="tag-filters">
                            <div className="tag-filters-label">Filter by tag:</div>
                            <div className="tag-chips">
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        className={`tag-chip ${selectedTags.has(tag) ? 'selected' : ''}`}
                                        onClick={() => toggleTag(tag)}
                                        style={{
                                            '--tag-color': tagColorMap.get(tag)
                                        } as React.CSSProperties}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Info Panel */}
                <Panel position="top-right" className="knowledge-graph-panel">
                    <div className="panel-header">
                        <div className="panel-title">Knowledge Graph</div>
                        <button className="panel-close-icon" onClick={onClose} title="Close (Esc)">
                            ×
                        </button>
                    </div>

                    <div className="panel-stats">
                        <div className="stat-row">
                            <span className="stat-label">Notes</span>
                            <span className="stat-value">{stats.total}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Connections</span>
                            <span className="stat-value">{stats.connections}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Connected</span>
                            <span className="stat-value">{stats.connected}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Isolated</span>
                            <span className="stat-value">{stats.isolated}</span>
                        </div>
                    </div>

                    {focusedNodeId && (
                        <div className="focused-note-info">
                            <div className="focused-label">Selected Note</div>
                            <div className="focused-title">
                                {(flowNodes.find(n => n.id === focusedNodeId)?.data as GraphNodeData)?.label}
                            </div>
                            <button
                                className="open-note-btn"
                                onClick={() => onNavigate(focusedNodeId)}
                            >
                                Open Note
                            </button>
                        </div>
                    )}

                    <div className="panel-help">
                        <strong>Controls:</strong>
                        <ul>
                            <li>Click node to focus</li>
                            <li>Double-click to open</li>
                            <li>Scroll to zoom</li>
                            <li>Drag to pan</li>
                            <li>Esc to unfocus/close</li>
                        </ul>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = (props) => {
    return (
        <ReactFlowProvider>
            <KnowledgeGraphInner {...props} />
        </ReactFlowProvider>
    );
};
