import React, { useMemo, useEffect } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { markdownToGraph } from '../utils/mindmapUtils';

interface MindMapProps {
    markdown: string;
    title: string;
}

export const MindMap: React.FC<MindMapProps> = ({ markdown, title }) => {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => markdownToGraph(markdown, title), [markdown, title]);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '100vh' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background />
                <Controls />
                <Panel position="top-right">Mindmap Mode (Generated from Markdown)</Panel>
            </ReactFlow>
        </div>
    );
};
