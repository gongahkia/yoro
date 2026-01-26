import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel, ReactFlowProvider, Position, type Node, type Edge, MarkerType } from '@xyflow/react';
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
            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

export const GraphDiagramBuilder: React.FC<DiagramBuilderProps> = ({ note, onUpdateNote, diagramType }) => {
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

    // Initial State Based on Type
    const getInitialState = () => {
        let initialLabel = 'Start';
        if (diagramType === 'state') initialLabel = '[*]';
        if (diagramType === 'er') initialLabel = 'ENTITY';

        const rootNode: Node = {
            id: 'node-0',
            data: { label: initialLabel },
            position: { x: 0, y: 0 },
            type: 'default', // Using default for now
        };
        return getLayoutedElements([rootNode], []);
    };

    const initialState = getInitialState();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialState.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges);

    const handleAddNode = useCallback(() => {
        const newId = `node-${nodeIdCounter}`;
        setNodeIdCounter(prev => prev + 1);

        let label = 'New Node';
        if (diagramType === 'state') label = 'State';
        if (diagramType === 'er') label = 'ENTITY';

        const newNode: Node = {
            id: newId,
            data: { label },
            position: { x: 0, y: 0 }, // Will be laid out
        };

        // If a node is selected, connect to it
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
    }, [nodes, edges, nodeIdCounter, selectedNodes, diagramType, setNodes, setEdges]);

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
            // Ignore if typing in an input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key === 'Tab') {
                e.preventDefault();
                handleAddNode(); // This function already handles connecting to selected node
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleDelete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleAddNode, handleDelete]);

    const handleLabelChange = useCallback((id: string, newLabel: string) => {
        setNodes(nds => nds.map(n =>
            n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n
        ));
    }, [setNodes]);

    // We can use the MindMapNode component or a generic one that supports double click to edit?
    // For now, let's just stick to default nodes but maybe we need a custom node to edit labels easily?
    // The current implementation uses standard nodes. Editing labels via double click isn't implemented in the standard node.
    // MindMap uses a custom node.
    // user didn't explicitly ask for label editing interactivity change, just "controls/buttons look".
    // However, the instructions in MindMap say "Double-click: Edit label".
    // If I put that in instructions, I should probably support it.
    // But GraphDiagramBuilder currently relies on... wait, it doesn't have label editing UI except the sidebar in the previous version?
    // Actually the previous version didn't have label editing visible in the snippets I saw!
    // It just had "Add Node" and "Delete".
    // Let's stick to the styling request. I will list interactions that WORK.
    // "Tab: Add (connected) node", "Delete: Remove node".
    // I won't list "Double-click: Edit label" unless I implement it.
    // Given the prompt "fix how the controls/buttons look", I should prioritize the visual aspect.
    // But for "keybinds as specified", I'll add Tab/Delete.

    // Handle Selection
    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        setSelectedNodes(nodes.map(n => n.id));
    }, []);

    const generateMermaid = () => {
        // Generate Mermaid Code based on Nodes/Edges/Type
        let code = '';
        if (diagramType === 'flowchart') {
            code = '```mermaid\nflowchart TD\n';
            // Nodes
            nodes.forEach(n => {
                // Sanitize label
                const label = (n.data.label as string).replace(/["()]/g, '');
                code += `    ${n.id}["${label}"]\n`;
            });
            // Edges
            edges.forEach(e => {
                code += `    ${e.source} --> ${e.target}\n`;
            });
            code += '```';
        } else if (diagramType === 'state') {
            code = '```mermaid\nstateDiagram-v2\n';
            nodes.forEach(n => {
                const label = n.data.label as string;
                if (label === '[*]') return; // Handled in edges mostly or implicit
                code += `    ${label}\n`;
            });
            edges.forEach(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                const targetNode = nodes.find(n => n.id === e.target);
                const sLabel = sourceNode ? sourceNode.data.label : 'state';
                const tLabel = targetNode ? targetNode.data.label : 'state';
                code += `    ${sLabel} --> ${tLabel}\n`;
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
                // Default relationship
                code += `    ${sLabel} ||--o{ ${tLabel} : has\n`;
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
                onSelectionChange={onSelectionChange}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
                multiSelectionKeyCode={['Meta', 'Ctrl']}
            >
                <Background color="var(--border-color)" gap={20} />
                <Controls style={{ fill: 'var(--text-primary)', stroke: 'var(--text-primary)' }} />
                <Panel position="top-right" style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>{diagramType.toUpperCase()} Editor</div>
                    <div style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '12px' }}>
                        Tab: Add linked node<br />
                        Delete/Backspace: Remove node
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
