import {
    Decoration,
    EditorView,
    ViewPlugin,
    ViewUpdate,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';

class TextHighlightPlugin {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.computeDecorations(update.view);
        }
    }

    computeDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = [];
        const { state } = view;
        const selection = state.selection.main;
        const docString = state.doc.toString();

        for (const { from, to } of view.visibleRanges) {
            const text = docString.slice(from, to);
            const regex = /==([^=\n]+)==/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const start = from + match.index;
                const end = start + match[0].length;
                const innerStart = start + 2;
                const innerEnd = end - 2;

                // Check constraints (not in code)
                const node = syntaxTree(state).resolveInner(start, 1);
                const nodeName = node.name;
                if (nodeName.includes('Code') || nodeName === 'FencedCode' || nodeName === 'Link' || nodeName === 'URL') {
                    continue;
                }

                // Check if focused (overlap with selection)
                const isFocused = (selection.from >= start && selection.from <= end) ||
                                  (selection.to >= start && selection.to <= end) ||
                                  (selection.from <= start && selection.to >= end);

                if (isFocused) {
                    // Show syntax, highlight background
                    widgets.push(Decoration.mark({ class: 'cm-highlight-focused' }).range(start, end));
                } else {
                    // Hide ==, highlight text
                    // Hide opening ==
                    widgets.push(Decoration.replace({}).range(start, innerStart));
                    // Highlight content
                    widgets.push(Decoration.mark({ class: 'cm-highlight' }).range(innerStart, innerEnd));
                    // Hide closing ==
                    widgets.push(Decoration.replace({}).range(innerEnd, end));
                }
            }
        }
        return Decoration.set(widgets, true);
    }
}

export const textHighlight = ViewPlugin.fromClass(TextHighlightPlugin, {
    decorations: (v) => v.decorations,
});
