import { type Node, type Edge } from '@xyflow/react';
import dagre from 'dagre';

const nodeWidth = 180;
const nodeHeight = 40;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // LR = Left to Right
    dagreGraph.setGraph({ rankdir: 'LR' });

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
            // Adjust positioning if needed, or pass position directly
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
            targetPosition: 'left',
            sourcePosition: 'right',
        } as any;
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
        type: 'input', // Root has no input handle usually, or we assume LR
    });

    // Stack: [{ id, level }]
    // Root is level 0.
    // H1 is level 1.
    // H2 is level 2.
    // List items depend on context.
    
    let stack: { id: string, level: number }[] = [{ id: rootId, level: 0 }];
    let lastHeadingLevel = 0;

    const lines = markdown.split('\n');

    lines.forEach((line) => {
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
            // 2 spaces per indent level usually
            // Level base = lastHeadingLevel
            // If indent=0 -> level = lastHeadingLevel + 1
            // If indent=2 -> level = lastHeadingLevel + 2
            const listIndentLevel = Math.floor(indent / 2) + 1;
            level = lastHeadingLevel + listIndentLevel;
            label = content;
        } else {
            // Plain text? Ignore or treat as note attached to previous?
            // "Convert markdown headings and lists into mindmap nodes automatically"
            // We ignore plain text for now.
            return;
        }

        // Find parent in stack
        // Parent is the last node in stack with level < current level
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            // Should not happen if root is level 0 and H1 is 1
            // But if H1 is missing and we start with text?
            // Fallback to root
            stack.push({ id: rootId, level: 0 });
        }

        const parent = stack[stack.length - 1];
        const id = crypto.randomUUID();

        nodes.push({
            id,
            data: { label },
            position: { x: 0, y: 0 },
        });

        edges.push({
            id: `${parent.id}-${id}`,
            source: parent.id,
            target: id,
        });

        stack.push({ id, level });
    });

    return getLayoutedElements(nodes, edges);
};