import React, { useMemo, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Panel, type NodeMouseHandler, useOnSelectionChange, SelectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { markdownToGraph } from '../utils/mindmapUtils';
import { updateNodeLabel, addChildNode } from '../utils/markdownMutations';
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

export const MindMap: React.FC<MindMapProps> = ({ markdown, title, noteId, onViewModeChange, onMarkdownChange }) => {
    // We memoize the graph generation, but we need to inject callbacks
    const { nodes: rawNodes, edges: initialEdges } = useMemo(() => markdownToGraph(markdown, title), [markdown, title]);
    
    const handleLabelChange = useCallback((id: string, newLabel: string) => {
        // We need the latest nodes to find the lineNumber, but accessing state in callback might be stale
        // simpler: find node in rawNodes (re-calculated from markdown)
        // actually, rawNodes depends on markdown, so it's fresh.
        const node = rawNodes.find(n => n.id === id);
        if (node && node.data.lineNumber) {
            const newMarkdown = updateNodeLabel(markdown, node.data.lineNumber as number, newLabel);
            onMarkdownChange(newMarkdown);
        }
    }, [markdown, rawNodes, onMarkdownChange]);

    // Inject callback
    const initialNodes = useMemo(() => {
        return rawNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                onLabelChange: handleLabelChange
            }
        }));
    }, [rawNodes, handleLabelChange]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodes, setSelectedNodes] = React.useState<string[]>([]);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    useOnSelectionChange({
        onChange: ({ nodes }) => {
            setSelectedNodes(nodes.map(n => n.id));
        },
    });

    // Handle Keyboard Shortcuts for creation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Add Child: Tab
            if (e.key === 'Tab' && selectedNodes.length === 1) {
                e.preventDefault();
                const parentId = selectedNodes[0];
                const parentNode = nodes.find(n => n.id === parentId);
                
                if (parentNode && parentNode.data.lineNumber) {
                    const newMarkdown = addChildNode(markdown, parentNode.data.lineNumber as number, 'New Node');
                    onMarkdownChange(newMarkdown);
                } else if (parentNode && parentNode.id === 'root') {
                    // Root usually doesn't have a line number in our parser (it's synthesized)
                    // We need a special case for root to add a top-level heading/item
                    // Append to end of file? Or start?
                    // Let's assume appending to end of file for now as a safe default
                    const newMarkdown = markdown + '\n\n# New Topic';
                    onMarkdownChange(newMarkdown);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodes, nodes, markdown, onMarkdownChange]);

    const handleNodeClick: NodeMouseHandler = useCallback((e, node) => {
        if (e.altKey || e.metaKey || e.ctrlKey) {
             // Navigate to line number if available
            if (node.data.lineNumber) {
                onViewModeChange('editor');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('yoro-navigate-line', { 
                        detail: { 
                            noteId, 
                            lineNumber: node.data.lineNumber 
                        } 
                    }));
                }, 100);
            }
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
                onNodeClick={handleNodeClick}
                fitView
                style={{ background: 'var(--bg-primary)' }}
                deleteKeyCode={['Backspace', 'Delete']}
                multiSelectionKeyCode={['Meta', 'Ctrl']}
                selectionOnDrag
                panOnScroll
                selectionMode={SelectionMode.Partial}
            >
                <Background color="var(--border-color)" gap={20} />
                <Controls style={{ fill: 'var(--text-primary)', stroke: 'var(--text-primary)' }} />
                <Panel position="top-right" style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div>Mindmap Mode</div>
                    <div style={{ fontSize: '0.8em', opacity: 0.8 }}>
                        Double-click: Edit<br/>
                        Tab: Add Child<br/>
                        Cmd/Alt+Click: Jump to Editor
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};
