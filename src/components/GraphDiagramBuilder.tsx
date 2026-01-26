import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel, addEdge, Position, type Node, type Edge, type Connection, MarkerType, Handle, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { Note } from '../types';

interface DiagramBuilderProps {
    note: Note;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
    diagramType: 'flowchart' | 'state' | 'er';
}

const nodeWidth = 150;
const nodeHeight = 50;

const EditableNode = ({ data, id }: NodeProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState((data.label as string) || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLabel((data.label as string) || '');
    }, [data.label]);

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

export const GraphDiagramBuilder: React.FC<DiagramBuilderProps> = ({ note, onUpdateNote, diagramType }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

    // Callback for label changes
    const onLabelChange = useCallback((id: string, newLabel: string) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, label: newLabel } };
            }
            return node;
        }));
    }, [setNodes]);

    const getInitialState = () => {
        let initialLabel = 'Start';
        if (diagramType === 'state') initialLabel = '[*]';
        if (diagramType === 'er') initialLabel = 'ENTITY';

        const rootNode: Node = {
            id: 'node-0',
            data: { label: initialLabel, onLabelChange },
            position: { x: 0, y: 0 },
            type: 'custom',
        };
        return getLayoutedElements([rootNode], []);
    };

    // We only want to run getInitialState once, but it depends on onLabelChange which changes?
    // Actually we should initialize once. 
    // However, onLabelChange dependency in getInitialState might cause issues if not memoized correctly or if state re-inits.
    // Let's rely on useNodesState's initial handling.
    // The issue is onLabelChange needs access to setNodes?
    // useNodesState provides setNodes.
    // We can just inject onLabelChange into nodes using an effect or map during render? No, map during render causes re-renders.
    // Best is to use a stable callback ref or similar, but ReactFlow recommends passing data handlers.

    // Since we can't easily pass the stable `onLabelChange` (which depends on `setNodes`) into `useState(() => getInitialState())` because `setNodes` isn't available yet...
    // We will initialize with a placeholder/or just update the nodes after mount.
    // OR we can use the `setNodes` from the hook in an effect to attach the handler.

    // Better: Initialize without handler, then attach handler via useEffect.

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        // Initialize if empty
        if (nodes.length === 0 && nodeIdCounter === 1) { // Basic check
            const state = getInitialState();
            setNodes(state.nodes);
            setEdges(state.edges);
        }
    }, []); // Run once on mount (effectively)

    // Update handler when it changes? 
    // Actually it's better to keep handler stable.

    // Let's update all nodes to have the handler whenever nodes change? No that's expensive loop.
    // The handler can be passed when adding nodes.
    // For the initial node, we need to make sure it gets it.

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

        let label = 'New Node';
        if (diagramType === 'state') label = 'State';
        if (diagramType === 'er') label = 'ENTITY';

        const newNode: Node = {
            id: newId,
            data: { label, onLabelChange },
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
    }, [nodes, edges, nodeIdCounter, selectedNodes, diagramType, setNodes, setEdges, onLabelChange]);

    const handleDelete = useCallback(() => {
        const remainingNodes = nodes.filter(n => !selectedNodes.includes(n.id));
        const remainingEdges = edges.filter(e => !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target));
        setNodes(remainingNodes);
        setEdges(remainingEdges);
        setSelectedNodes([]);
    }, [nodes, edges, selectedNodes, setNodes, setEdges]);

    // Handle Keyboard Shortcuts
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

    const generateMermaid = () => {
        let code = '';
        if (diagramType === 'flowchart') {
            code = '```mermaid\nflowchart TD\n';
            nodes.forEach(n => {
                const label = (n.data.label as string).replace(/["()]/g, '');
                code += `    ${n.id}["${label}"]\n`;
            });
            edges.forEach(e => {
                code += `    ${e.source} --> ${e.target}\n`;
            });
            code += '```';
        } else if (diagramType === 'state') {
            code = '```mermaid\nstateDiagram-v2\n';
            nodes.forEach(n => {
                const label = n.data.label as string;
                if (label === '[*]') return;
                code += `    ${label}\n`;
            });
            edges.forEach(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                const targetNode = nodes.find(n => n.id === e.target);
                const sLabel = sourceNode ? sourceNode.data.label : 'state';
                const tLabel = targetNode ? targetNode.data.label : 'state';
                if (sLabel && tLabel) {
                    code += `    ${sLabel} --> ${tLabel}\n`;
                }
            });
            code += '```';
        } else if (diagramType === 'er') {
            code = '```mermaid\nerDiagram\n';
            nodes.forEach(n => {
                const label = n.data.label as string;
                code += `    ${label} {\n    }\n`;
            });
            edges.forEach(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                const targetNode = nodes.find(n => n.id === e.target);
                const sLabel = sourceNode ? sourceNode.data.label : 'ENTITY';
                const tLabel = targetNode ? targetNode.data.label : 'ENTITY';
                if (sLabel && tLabel) {
                    code += `    ${sLabel} ||--o{ ${tLabel} : has\n`;
                }
            });
            code += '```';
        }
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
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>{diagramType.toUpperCase()} Editor</div>
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
};
