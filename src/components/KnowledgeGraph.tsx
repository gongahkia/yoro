import React, { useMemo, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Panel,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
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
}

const nodeWidth = 180;
const nodeHeight = 60;

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
        matches.push(match[1]); // Return the link text (title)
    }
    return matches;
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: 'TB',
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

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
            targetPosition: Position.Top,
            sourcePosition: Position.Bottom,
        };
    });

    return { nodes: layoutedNodes, edges };
};

const GraphNode: React.FC<{ data: GraphNodeData }> = ({ data }) => {
    return (
        <div className="knowledge-graph-node">
            <div className="node-label">
                {data.label || 'Untitled'}
            </div>
            <div className="node-count">
                {data.linkCount} link{data.linkCount !== 1 ? 's' : ''}
            </div>
        </div>
    );
};

const nodeTypes = {
    graphNode: GraphNode,
};

const KnowledgeGraphInner: React.FC<KnowledgeGraphProps> = ({ notes, onNavigate, onClose }) => {
    // Build graph data from notes
    const { initialNodes, initialEdges } = useMemo(() => {
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

        // Initialize link counts
        activeNotes.forEach(note => linkCounts.set(note.id, 0));

        // Parse all notes for links
        activeNotes.forEach(note => {
            const wikilinks = parseWikilinks(note.content);
            const internalLinks = parseInternalLinks(note.content);

            [...wikilinks, ...internalLinks].forEach(linkTitle => {
                const targetNote = noteByTitle.get(linkTitle);
                if (targetNote && targetNote.id !== note.id) {
                    const edgeId = `${note.id}-${targetNote.id}`;
                    // Avoid duplicate edges
                    if (!edges.find(e => e.id === edgeId)) {
                        edges.push({
                            id: edgeId,
                            source: note.id,
                            target: targetNote.id,
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: 'var(--primary)', strokeWidth: 2 },
                        });
                        linkCounts.set(note.id, (linkCounts.get(note.id) || 0) + 1);
                        linkCounts.set(targetNote.id, (linkCounts.get(targetNote.id) || 0) + 1);
                    }
                }
            });
        });

        const nodes: Node<GraphNodeData>[] = activeNotes.map(note => ({
            id: note.id,
            type: 'graphNode',
            data: {
                label: note.title || 'Untitled',
                noteId: note.id,
                linkCount: linkCounts.get(note.id) || 0,
            },
            position: { x: 0, y: 0 },
        }));

        const layouted = getLayoutedElements(nodes, edges);
        return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
    }, [notes]);

    const [flowNodes, , onNodesChange] = useNodesState(initialNodes);
    const [flowEdges, , onEdgesChange] = useEdgesState(initialEdges);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        onNavigate(node.id);
    }, [onNavigate]);

    const connectedCount = useMemo(() => {
        const connected = new Set<string>();
        initialEdges.forEach(edge => {
            connected.add(edge.source);
            connected.add(edge.target);
        });
        return connected.size;
    }, [initialEdges]);

    return (
        <div className="knowledge-graph-container">
            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                style={{ background: 'var(--bg-primary)' }}
            >
                <Background color="var(--border-color)" gap={20} />
                <Controls />
                <Panel position="top-right" className="knowledge-graph-panel">
                    <div className="panel-title">Knowledge Graph</div>
                    <div className="panel-stats">
                        {flowNodes.length} notes, {initialEdges.length} connections
                        <br />
                        {connectedCount} connected, {flowNodes.length - connectedCount} isolated
                    </div>
                    <div className="panel-help">
                        Click a node to open the note
                        <br />
                        Scroll to zoom, drag to pan
                    </div>
                    <button className="panel-close-btn" onClick={onClose}>
                        Close Graph
                    </button>
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
