import {
    Decoration,
    EditorView,
    WidgetType,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { StateField, StateEffect, Range } from '@codemirror/state';
import mermaid from 'mermaid';

// Initialize mermaid with default config
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'inherit',
});

class MermaidWidget extends WidgetType {
    readonly code: string;

    constructor(code: string) {
        super();
        this.code = code;
    }

    eq(other: MermaidWidget) {
        return other.code === this.code;
    }

    toDOM() {
        const container = document.createElement('div');
        container.className = 'cm-mermaid-widget';

        // Render mermaid diagram asynchronously
        this.renderMermaid(container);

        return container;
    }

    private async renderMermaid(container: HTMLElement) {
        try {
            // Use a unique ID for each render to avoid conflicts
            const uniqueId = `mermaid-render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(uniqueId, this.code);
            container.innerHTML = svg;
        } catch (error) {
            // Show error message if rendering fails
            container.innerHTML = `<div class="cm-mermaid-error">Mermaid Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
            container.classList.add('cm-mermaid-error-container');
        }
    }

    ignoreEvent() { return true; }
}

// Dummy effect to trigger recomputation on selection change
const mermaidUpdate = StateEffect.define<null>();

function computeMermaidDecorations(state: { doc: { toString: () => string; lineAt: (pos: number) => { number: number } }; selection: { main: { from: number; to: number } } }): DecorationSet {
    const widgets: Range<Decoration>[] = [];
    const docString = state.doc.toString();
    const selection = state.selection.main;

    // Regex to match ```mermaid ... ``` code blocks
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;

    let match;
    while ((match = mermaidRegex.exec(docString)) !== null) {
        const blockStart = match.index;
        const blockEnd = blockStart + match[0].length;
        const mermaidCode = match[1].trim();

        // Skip empty code blocks
        if (!mermaidCode) continue;

        // Check if cursor is within the mermaid block (line-based)
        const isFocused = isBlockFocused(state, selection, blockStart, blockEnd);

        if (isFocused) {
            // When focused, show the source code with a subtle highlight
            widgets.push(Decoration.mark({ class: 'cm-mermaid-source' }).range(blockStart, blockEnd));
        } else {
            // When not focused, replace with rendered diagram
            // Use block: true for multi-line replacement
            widgets.push(Decoration.replace({
                widget: new MermaidWidget(mermaidCode),
                block: true,
            }).range(blockStart, blockEnd));
        }
    }

    return Decoration.set(widgets, true);
}

function isBlockFocused(
    state: { doc: { lineAt: (pos: number) => { number: number } } },
    selection: { from: number; to: number },
    blockStart: number,
    blockEnd: number
): boolean {
    // Get line numbers for the block
    const startLine = state.doc.lineAt(blockStart).number;
    const endLine = state.doc.lineAt(blockEnd).number;

    // Get line numbers for the cursor
    const cursorLine = state.doc.lineAt(selection.from).number;
    const selectionEndLine = state.doc.lineAt(selection.to).number;

    // Check if cursor or selection intersects with the block lines
    return (cursorLine >= startLine && cursorLine <= endLine) ||
           (selectionEndLine >= startLine && selectionEndLine <= endLine) ||
           (cursorLine <= startLine && selectionEndLine >= endLine);
}

// Use StateField for decorations that can replace line breaks
const mermaidField = StateField.define<DecorationSet>({
    create(state) {
        return computeMermaidDecorations(state);
    },
    update(decorations, tr) {
        // Recompute on document changes or selection changes
        if (tr.docChanged || tr.selection) {
            return computeMermaidDecorations(tr.state);
        }
        return decorations;
    },
    provide: (field) => EditorView.decorations.from(field),
});

export const mermaidPreview = mermaidField;
