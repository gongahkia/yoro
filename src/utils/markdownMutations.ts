export const updateNodeLabel = (markdown: string, lineNumber: number, newLabel: string): string => {
    const lines = markdown.split('\n');
    const lineIndex = lineNumber - 1; // lineNumber is 1-based

    if (lineIndex < 0 || lineIndex >= lines.length) return markdown;

    const line = lines[lineIndex];
    
    // Regex to separate prefix from content
    // Captures: 
    // 1. Heading (# )
    // 2. List item indentation and marker (\s*[-*]\s+)
    // 3. Numbered list (\s*\d+\.\s+)
    const match = line.match(/^((?:#+\s+)|(?:\s*[-*]\s+)|(?:\s*\d+\.\s+))(.*)/);

    if (match) {
        const prefix = match[1];
        lines[lineIndex] = `${prefix}${newLabel}`;
    } else {
        // Fallback: replace whole line if no recognized prefix (shouldn't happen for valid nodes)
        lines[lineIndex] = newLabel;
    }

    return lines.join('\n');
};

export const addChildNode = (markdown: string, parentLineNumber: number, childLabel: string): string => {
    const lines = markdown.split('\n');
    const parentIndex = parentLineNumber - 1;

    if (parentIndex < 0 || parentIndex >= lines.length) return markdown;

    const parentLine = lines[parentIndex];
    let insertIndex = parentIndex + 1;
    let newPrefix = '- ';

    // Determine type and indentation
    const hMatch = parentLine.match(/^(#+)\s+/);
    const lMatch = parentLine.match(/^(\s*)([-*]|\d+\.)\s+/);

    if (hMatch) {
        // Parent is heading
        const level = hMatch[1].length;
        if (level < 6) {
            // Child is sub-heading
            newPrefix = '#'.repeat(level + 1) + ' ';
        } else {
            // Max heading level reached, child is list item
            newPrefix = '- ';
        }
    } else if (lMatch) {
        // Parent is list item
        const indent = lMatch[1];
        // Child gets 2 more spaces (or 4, or tab)
        // Let's assume 2 spaces per level for now
        newPrefix = `${indent}  - `;
    }

    // Find insertion point:
    // We want to insert after the parent, but BEFORE the next sibling or higher-level item.
    // Ideally, at the end of the current "block".
    // Simple heuristic: Insert immediately after parent (becomes first child).
    // This is easiest and safe.
    
    // However, if we insert immediately after, we might split existing text content?
    // Markdown structure:
    // # Heading
    // Some text
    // ## Subheading
    
    // If I add child to # Heading, it should probably go before ## Subheading?
    // Or if it's a list:
    // - Item A
    //   - Sub 1
    // - Item B
    
    // If I add to Item A, it should go after Sub 1? 
    // Finding the "End of block" is complex without a full parser.
    // Let's stick to "Insert immediately after parent" for now, or "Insert at end of list block" if we can detect it.
    
    // "First Child" approach:
    lines.splice(insertIndex, 0, `${newPrefix}${childLabel}`);
    
    return lines.join('\n');
};
