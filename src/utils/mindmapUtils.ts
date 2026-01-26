import { type Node, type Edge, Position } from '@xyflow/react';
import dagre from 'dagre';

const nodeWidth = 250;
const nodeHeight = 80;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // LR = Left to Right
    // ranksep: distance between ranks (columns)
    // nodesep: distance between nodes in same rank (rows)
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 60 });

    nodes.forEach((node) => {
        // We estimate height based on note length if possible, or just use generous default
        // Simple heuristic: if note exists, add height
        const hasNote = !!node.data.note;
        dagreGraph.setNode(node.id, {
            width: nodeWidth,
            height: hasNote ? nodeHeight + 40 : nodeHeight
        });
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

export const markdownToGraph = (markdown: string, title: string) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const rootId = 'root';
    nodes.push({
        id: rootId,
        data: { label: title || 'Central Topic' },
        position: { x: 0, y: 0 },
        type: 'mindmap', // Use custom node
    });

    // Stack: [{ id, level }]
    const stack: { id: string, level: number }[] = [{ id: rootId, level: 0 }];
    let lastHeadingLevel = 0;
    let lastNodeId: string | null = null;

    const lines = markdown.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let level = 0;
        let label = '';

        const hMatch = line.match(/^(#+)\s+(.*)/);
        const lMatch = line.match(/^(\s*)[-*]\s+(.*)/);

        if (hMatch) {
            level = hMatch[1].length; // 1 to 6
            label = hMatch[2];
            lastHeadingLevel = level;
        } else if (lMatch) {
            const indent = lMatch[1].length;
            const content = lMatch[2];
            const listIndentLevel = Math.floor(indent / 2) + 1;
            level = lastHeadingLevel + listIndentLevel;
            label = content;
        } else {
            // Plain text -> Attach as note to the last created node
            if (lastNodeId) {
                const node = nodes.find(n => n.id === lastNodeId);
                if (node) {
                    const existing = node.data.note as string || '';
                    node.data.note = existing ? existing + '\n' + trimmed : trimmed;
                }
            }
            return;
        }

        // Find parent in stack
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            stack.push({ id: rootId, level: 0 });
        }

        const parent = stack[stack.length - 1];
        const id = crypto.randomUUID();
        lastNodeId = id;

        nodes.push({
            id,
            data: { label, lineNumber: index + 1 }, // Track 1-based line number
            position: { x: 0, y: 0 },
            type: 'mindmap', // Use custom node
        });

        edges.push({
            id: `${parent.id}-${id}`,
            source: parent.id,
            target: id,
            type: 'smoothstep', // Better edge style
            animated: false,
        });

        stack.push({ id, level });
    });

    return getLayoutedElements(nodes, edges);
};