import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel, addEdge, Position, type Node, type Edge, type Connection, MarkerType, Handle, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { Note } from '../types';

interface StateDiagramBuilderProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
}

const nodeWidth = 150;
const nodeHeight = 50;

// Start state node - filled black circle
const StartStateNode = ({ id }: NodeProps) => {
    return (
        <div
            style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--text-primary)',
                position: 'relative',
            }}
        >
            <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-primary)' }} />
        </div>
    );
};

// End state node - hollow circle with inner filled circle
const EndStateNode = ({ id }: NodeProps) => {
    return (
        <div
            style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '2px solid var(--text-primary)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: 'var(--text-primary)' }} />
            <div
                style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: 'var(--text-primary)',
                }}
            />
        </div>
    );
};

// Regular state node - rounded rectangle
const StateNode = ({ data, id }: NodeProps) => {
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
                padding: '12px 20px',
                border: '2px solid var(--border-color)',
                borderRadius: '20px',
                background: 'var(--bg-primary)',
                minWidth: '80px',
                textAlign: 'center',
                color: 'var(--text-primary)',
                position: 'relative',
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: 'var(--text-primary)' }} />
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
                        outline: 'none',
                        fontSize: '14px',
                    }}
                />
            ) : (
                <span style={{ fontSize: '14px' }}>{label}</span>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-primary)' }} />
        </div>
    );
};

const nodeTypes = {
    startState: StartStateNode,
    endState: EndStateNode,
    state: StateNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        const width = node.type === 'startState' || node.type === 'endState' ? 30 : nodeWidth;
        const height = node.type === 'startState' || node.type === 'endState' ? 30 : nodeHeight;
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const width = node.type === 'startState' || node.type === 'endState' ? 30 : nodeWidth;
        const height = node.type === 'startState' || node.type === 'endState' ? 30 : nodeHeight;
        const targetPosition = direction === 'LR' ? Position.Left : Position.Top;
        const sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

        return {
            ...node,
            targetPosition,
            sourcePosition,
            position: {
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - height / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

export const StateDiagramBuilder: React.FC<StateDiagramBuilderProps> = ({ note, onUpdateNote }) => {
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
        const startNode: Node = {
            id: 'start',
            data: { label: '[*]' },
            position: { x: 0, y: 0 },
            type: 'startState',
        };
        return getLayoutedElements([startNode], []);
    }, []);

    useEffect(() => {
        if (nodes.length === 0 && nodeIdCounter === 1) {
            const state = getInitialState();
            setNodes(state.nodes);
            setEdges(state.edges);
        }
    }, [getInitialState, nodes.length, nodeIdCounter, setNodes, setEdges]);

    useEffect(() => {
        setNodes((nds) => nds.map(n => {
            if (n.type === 'state') {
                return { ...n, data: { ...n.data, onLabelChange } };
            }
            return n;
        }));
    }, [onLabelChange, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
        [setEdges]
    );

    const handleAddState = useCallback(() => {
        const newId = `state-${nodeIdCounter}`;
        setNodeIdCounter(prev => prev + 1);

        const newNode: Node = {
            id: newId,
            data: { label: 'State', onLabelChange },
            position: { x: 0, y: 0 },
            type: 'state'
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

    const handleAddEndState = useCallback(() => {
        // Check if end state already exists
        const hasEndState = nodes.some(n => n.type === 'endState');
        if (hasEndState) return;

        const newId = 'end';

        const newNode: Node = {
            id: newId,
            data: { label: '[*]' },
            position: { x: 0, y: 0 },
            type: 'endState'
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
    }, [nodes, edges, selectedNodes, setNodes, setEdges]);

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
                handleAddState();
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleDelete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleAddState, handleDelete]);

    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        setSelectedNodes(nodes.map(n => n.id));
    }, []);

    const generateMermaid = () => {
        let code = '```mermaid\nstateDiagram-v2\n';

        // Define states (skip start and end markers)
        nodes.forEach(n => {
            if (n.type === 'state') {
                const label = n.data.label as string;
                code += `    ${label}\n`;
            }
        });

        // Define transitions
        edges.forEach(e => {
            const sourceNode = nodes.find(n => n.id === e.source);
            const targetNode = nodes.find(n => n.id === e.target);
            if (sourceNode && targetNode) {
                const sLabel = sourceNode.type === 'startState' || sourceNode.type === 'endState'
                    ? '[*]'
                    : sourceNode.data.label as string;
                const tLabel = targetNode.type === 'startState' || targetNode.type === 'endState'
                    ? '[*]'
                    : targetNode.data.label as string;
                code += `    ${sLabel} --> ${tLabel}\n`;
            }
        });

        code += '```';
        return code;
    };

    const handleInsert = () => {
        const code = generateMermaid();
        const newContent = note.content + '\n\n' + code;
        onUpdateNote(note.id, { content: newContent, viewMode: 'editor' });
    };

    const handleCancel = () => {
        onUpdateNote(note.id, { viewMode: 'editor' });
    };

    const hasEndState = nodes.some(n => n.type === 'endState');

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
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>State Diagram Editor</div>
                    <div style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '12px' }}>
                        Double-click: Edit state label<br />
                        Tab: Add linked state<br />
                        Delete/Backspace: Remove state<br />
                        Drag handles to connect
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleAddState}
                                style={{ padding: '6px 12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}
                            >
                                + State
                            </button>
                            <button
                                onClick={handleAddEndState}
                                disabled={hasEndState}
                                style={{
                                    padding: '6px 12px',
                                    background: hasEndState ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                                    color: hasEndState ? 'var(--text-muted)' : 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    cursor: hasEndState ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9em'
                                }}
                            >
                                + End State
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleInsert} style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>Insert Mermaid</button>
                            <button onClick={handleCancel} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>Cancel</button>
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};
