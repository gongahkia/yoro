import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel, useOnSelectionChange, SelectionMode, ReactFlowProvider, Position, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import MindMapNode from './MindMapNode';

interface MindMapProps {
    markdown: string;
    title: string;
    noteId: string;
    onViewModeChange: (mode: 'editor' | 'mindmap') => void;
    onMarkdownChange: (newMarkdown: string) => void;
}

const nodeTypes = {
    mindmap: MindMapNode,
};

const nodeWidth = 250;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 60 });

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
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
        };
    });

    return { nodes: layoutedNodes, edges };
};

interface MindMapNodeData {
    id: string;
    label: string;
    children: MindMapNodeData[];
}

const nodesToMermaid = (rootNode: MindMapNodeData): { code: string; isValid: boolean; error?: string } => {
    const lines: string[] = ['```mermaid', 'mindmap'];

    const sanitizeLabel = (label: string): string => {
        // Remove or escape characters that could break mermaid mindmap syntax
        // Mermaid mindmap is particularly sensitive to: (), [], {}, <>, ", ', `
        return (label || 'Node')
            .replace(/[()[\]{}<>"'`]/g, '')  // Remove problematic characters
            .replace(/\n/g, ' ')              // Replace newlines with space
            .replace(/\s+/g, ' ')             // Collapse multiple spaces
            .replace(/:/g, '-')               // Colons can cause issues
            .trim() || 'Node';
    };

    const traverse = (node: MindMapNodeData, depth: number) => {
        const indent = '  '.repeat(depth);
        const safeLabel = sanitizeLabel(node.label);
        if (depth === 1) {
            // Root node uses special syntax
            lines.push(`${indent}root((${safeLabel}))`);
        } else {
            lines.push(`${indent}${safeLabel}`);
        }
        node.children.forEach(child => traverse(child, depth + 1));
    };

    traverse(rootNode, 1);
    lines.push('```');

    const code = lines.join('\n');
    return { code, isValid: true };
};

const buildTreeFromNodes = (nodes: Node[], edges: Edge[], rootId: string): MindMapNodeData => {
    const nodeMap = new Map<string, Node>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const childrenMap = new Map<string, string[]>();
    edges.forEach(e => {
        const children = childrenMap.get(e.source) || [];
        children.push(e.target);
        childrenMap.set(e.source, children);
    });

    const buildNode = (id: string): MindMapNodeData => {
        const node = nodeMap.get(id);
        const childIds = childrenMap.get(id) || [];
        return {
            id,
            label: (node?.data.label as string) || 'Node',
            children: childIds.map(buildNode),
        };
    };

    return buildNode(rootId);
};

const MindMapInner: React.FC<MindMapProps> = ({ markdown, title, onViewModeChange, onMarkdownChange }) => {
    const rootId = 'root';

    const createInitialState = () => {
        const rootNode: Node = {
            id: rootId,
            data: { label: title || 'Central Topic' },
            position: { x: 0, y: 0 },
            type: 'mindmap',
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
        };
        return getLayoutedElements([rootNode], []);
    };

    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const initialState = createInitialState();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialState.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLabelChange = useCallback((id: string, newLabel: string) => {
        setNodes(nds => nds.map(n =>
            n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n
        ));
    }, [setNodes]);

    const nodesWithCallback = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            onLabelChange: handleLabelChange,
        }
    }));

    useOnSelectionChange({
        onChange: ({ nodes: selectedNds }) => {
            setSelectedNodes(selectedNds.map(n => n.id));
        },
    });

    const addChildNode = useCallback((parentId: string) => {
        const newId = `node-${nodeIdCounter}`;
        setNodeIdCounter(prev => prev + 1);

        const newNode: Node = {
            id: newId,
            data: { label: 'New Node' },
            position: { x: 0, y: 0 },
            type: 'mindmap',
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
        };

        const newEdge: Edge = {
            id: `${parentId}-${newId}`,
            source: parentId,
            target: newId,
            type: 'smoothstep',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setNodes((nds: any) => [...nds, newNode]);
        setEdges(eds => [...eds, newEdge]);
    }, [nodeIdCounter, edges, setNodes, setEdges]);

    const deleteSelectedNodes = useCallback(() => {
        if (selectedNodes.length === 0) return;
        if (selectedNodes.includes(rootId)) return;

        const nodesToDelete = new Set(selectedNodes);

        const findDescendants = (nodeId: string) => {
            edges.forEach(e => {
                if (e.source === nodeId && !nodesToDelete.has(e.target)) {
                    nodesToDelete.add(e.target);
                    findDescendants(e.target);
                }
            });
        };
        selectedNodes.forEach(findDescendants);

        setNodes(nds => nds.filter(n => !nodesToDelete.has(n.id)));
        setEdges(eds => eds.filter(e => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)));
    }, [selectedNodes, edges, setNodes, setEdges]);

    // Debounced layout: batch rapid node add/delete into single dagre run
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    useEffect(() => {
        if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
        layoutTimerRef.current = setTimeout(() => {
            const { nodes: layouted } = getLayoutedElements(nodesRef.current, edges);
            setNodes(layouted);
        }, 150);
        return () => { if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current); };
    }, [edges]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab' && selectedNodes.length === 1) {
                e.preventDefault();
                addChildNode(selectedNodes[0]);
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNodes.length > 0) {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    deleteSelectedNodes();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodes, addChildNode, deleteSelectedNodes]);

    const handleExitMindmap = useCallback(() => {
        const tree = buildTreeFromNodes(nodes, edges, rootId);
        const result = nodesToMermaid(tree);

        if (!result.isValid) {
            console.error('[MindMap] Invalid mermaid:', result.error);
            window.dispatchEvent(new CustomEvent('yoro-toast', {
                detail: { message: result.error || 'Cannot generate mindmap', type: 'error' }
            }));
            return;
        }

        const newMarkdown = markdown + '\n\n' + result.code;
        onMarkdownChange(newMarkdown);
        onViewModeChange('editor');
    }, [nodes, edges, markdown, onMarkdownChange, onViewModeChange]);

    const handleCancel = useCallback(() => {
        onViewModeChange('editor');
    }, [onViewModeChange]);

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <ReactFlow
                nodes={nodesWithCallback}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                style={{ background: 'var(--bg-primary)' }}
                multiSelectionKeyCode={['Meta', 'Ctrl']}
                selectionOnDrag
                panOnScroll
                selectionMode={SelectionMode.Partial}
            >
                <Background color="var(--border-color)" gap={20} />
                <Controls style={{ fill: 'var(--text-primary)', stroke: 'var(--text-primary)' }} />
                <Panel position="top-right" style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Mindmap Editor</div>
                    <div style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '12px' }}>
                        Double-click: Edit label<br/>
                        Tab: Add child node<br/>
                        Delete/Backspace: Remove node
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleExitMindmap}
                            style={{
                                padding: '6px 12px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9em',
                            }}
                        >
                            Insert Mermaid
                        </button>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: '6px 12px',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9em',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};

export const MindMap: React.FC<MindMapProps> = (props) => {
    return (
        <ReactFlowProvider>
            <MindMapInner {...props} />
        </ReactFlowProvider>
    );
};
