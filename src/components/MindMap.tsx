import React, { useMemo, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel, type NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { markdownToGraph } from '../utils/mindmapUtils';
import MindMapNode from './MindMapNode';

interface MindMapProps {
    markdown: string;
    title: string;
    noteId: string;
    onViewModeChange: (mode: 'editor' | 'mindmap') => void;
}

const nodeTypes = {
    mindmap: MindMapNode,
};

export const MindMap: React.FC<MindMapProps> = ({ markdown, title, noteId, onViewModeChange }) => {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => markdownToGraph(markdown, title), [markdown, title]);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
        // Navigate to line number if available
        if (node.data.lineNumber) {
            onViewModeChange('editor');
            // Allow time for Editor to mount before dispatching scroll event
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('yoro-navigate-line', { 
                    detail: { 
                        noteId, 
                        lineNumber: node.data.lineNumber 
                    } 
                }));
            }, 100);
        }
    }, [noteId, onViewModeChange]);

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                fitView
                style={{ background: 'var(--bg-primary)' }}
            >
                <Background color="var(--border-color)" gap={20} />
                <Controls style={{ fill: 'var(--text-primary)', stroke: 'var(--text-primary)' }} />
                <Panel position="top-right" style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    Mindmap Mode (Click node to edit)
                </Panel>
            </ReactFlow>
        </div>
    );
};
