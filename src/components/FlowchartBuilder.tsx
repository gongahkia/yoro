import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel, addEdge, Position, type Node, type Edge, type Connection, MarkerType, Handle, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { Note } from '../types';

interface FlowchartBuilderProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
}

const nodeWidth = 150;
const nodeHeight = 50;

const EditableNode = ({ data, id }: NodeProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState((data.label as string) || '');
    const [prevLabel, setPrevLabel] = useState(data.label);
    const inputRef = useRef<HTMLInputElement>(null);

    if (data.label !== prevLabel) {
        setLabel((data.label as string) || '');
        setPrevLabel(data.label);
    }

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (data.onLabelChange && typeof data.onLabelChange === 'function') {
            (data.onLabelChange as (id: string, val: string) => void)(id, label);
        }
    };

    const handleKeyDown = (evt: React.KeyboardEvent) => {
        if (evt.key === 'Enter') {
            handleBlur();
        }
    };

    return (
        <div
            onDoubleClick={handleDoubleClick}
            style={{
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: 'var(--bg-primary)',
                minWidth: '100px',
                textAlign: 'center',
                color: 'var(--text-primary)',
                position: 'relative'
            }}
        >
            <Handle type="target" position={Position.Top} />
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        outline: 'none'
                    }}
                />
            ) : (
                <span>{label}</span>
            )}
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

const nodeTypes = {
    custom: EditableNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const targetPosition = direction === 'LR' ? Position.Left : Position.Top;
        const sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

        return {
            ...node,
            targetPosition,
            sourcePosition,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

export const FlowchartBuilder: React.FC<FlowchartBuilderProps> = React.memo(({ note, onUpdateNote }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

    const onLabelChange = useCallback((id: string, newLabel: string) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, label: newLabel } };
            }
            return node;
        }));
    }, [setNodes]);

    const getInitialState = useCallback(() => {
        const rootNode: Node = {
            id: 'node-0',
            data: { label: 'Start', onLabelChange },
            position: { x: 0, y: 0 },
            type: 'custom',
        };
        return getLayoutedElements([rootNode], []);
    }, [onLabelChange]);

    useEffect(() => {
        if (nodes.length === 0 && nodeIdCounter === 1) {
            const state = getInitialState();
            setNodes(state.nodes);
            setEdges(state.edges);
        }
    }, [getInitialState, nodes.length, nodeIdCounter, setNodes, setEdges]);

    useEffect(() => {
        setNodes((nds) => nds.map(n => ({
            ...n,
            data: { ...n.data, onLabelChange }
        })));
    }, [onLabelChange, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
        [setEdges]
    );

    const handleAddNode = useCallback(() => {
        const newId = `node-${nodeIdCounter}`;
        setNodeIdCounter(prev => prev + 1);

        const newNode: Node = {
            id: newId,
            data: { label: 'New Node', onLabelChange },
            position: { x: 0, y: 0 },
            type: 'custom'
        };

        const newEdges = [...edges];
        if (selectedNodes.length === 1) {
            const parentId = selectedNodes[0];
            newEdges.push({
                id: `${parentId}-${newId}`,
                source: parentId,
                target: newId,
                markerEnd: { type: MarkerType.ArrowClosed },
                type: 'smoothstep'
            });
        }

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements([...nodes, newNode], newEdges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [nodes, edges, nodeIdCounter, selectedNodes, setNodes, setEdges, onLabelChange]);

    const handleDelete = useCallback(() => {
        const remainingNodes = nodes.filter(n => !selectedNodes.includes(n.id));
        const remainingEdges = edges.filter(e => !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target));
        setNodes(remainingNodes);
        setEdges(remainingEdges);
        setSelectedNodes([]);
    }, [nodes, edges, selectedNodes, setNodes, setEdges]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key === 'Tab') {
                e.preventDefault();
                handleAddNode();
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleDelete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleAddNode, handleDelete]);

    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        setSelectedNodes(nodes.map(n => n.id));
    }, []);

    const generateMermaid = (): { code: string; isValid: boolean; error?: string } => {
        if (nodes.length === 0) {
            return { code: '', isValid: false, error: 'Flowchart has no nodes' };
        }

        // Helper to create valid mermaid node ID (alphanumeric only)
        const toNodeId = (id: string): string => {
            return id.replace(/-/g, '_');
        };

        // Helper to sanitize labels for mermaid
        const sanitizeLabel = (label: string): string => {
            return (label || 'Node')
                .replace(/"/g, "'")          // Replace double quotes with single
                .replace(/[\[\]{}()<>]/g, '') // Remove brackets and special chars
                .replace(/\n/g, ' ')          // Replace newlines with space
                .replace(/\s+/g, ' ')         // Collapse multiple spaces
                .trim() || 'Node';
        };

        let code = '```mermaid\nflowchart TD\n';
        nodes.forEach(n => {
            const nodeId = toNodeId(n.id);
            const label = sanitizeLabel(n.data.label as string);
            code += `    ${nodeId}["${label}"]\n`;
        });
        edges.forEach(e => {
            code += `    ${toNodeId(e.source)} --> ${toNodeId(e.target)}\n`;
        });
        code += '```';
        return { code, isValid: true };
    };

    const handleInsert = () => {
        try {
            const result = generateMermaid();
            if (!result.isValid) {
                console.error('[Flowchart] Invalid mermaid:', result.error);
                window.dispatchEvent(new CustomEvent('yoro-toast', {
                    detail: { message: result.error || 'Cannot generate flowchart', type: 'error' }
                }));
                return;
            }
            const newContent = note.content + '\n\n' + result.code;
            onUpdateNote(note.id, { content: newContent, viewMode: 'editor' });
        } catch (err) {
            console.error('[Flowchart] Failed to generate mermaid:', err);
            window.dispatchEvent(new CustomEvent('yoro-toast', {
                detail: { message: `Flowchart error: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' }
            }));
        }
    };

    const handleCancel = () => {
        onUpdateNote(note.id, { viewMode: 'editor' });
    };

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
                multiSelectionKeyCode={['Meta', 'Ctrl']}
            >
                <Background color="var(--border-color)" gap={20} />
                <Controls style={{ fill: 'var(--text-primary)', stroke: 'var(--text-primary)' }} />
                <Panel position="top-right" style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Flowchart Editor</div>
                    <div style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '12px' }}>
                        Double-click: Edit label<br />
                        Tab: Add linked node<br />
                        Delete/Backspace: Remove node<br />
                        Drag handles to connect
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleInsert} style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>Insert Mermaid</button>
                        <button onClick={handleCancel} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>Cancel</button>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
});
