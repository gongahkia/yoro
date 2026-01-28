import {
    Decoration,
    EditorView,
    ViewPlugin,
    type ViewUpdate,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { Range } from '@codemirror/state';

class InlineCodePlugin {
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

        // Iterate over visible ranges to find inline code nodes
        for (const { from, to } of view.visibleRanges) {
            syntaxTree(state).iterate({
                from,
                to,
                enter: (node) => {
                    if (node.name === 'InlineCode') {
                        const start = node.from;
                        const end = node.to;
                        // InlineCode includes the backticks. length is at least 2.
                        // We assumes standard `code` format.
                        // Sometimes the tree structure separates markers? 
                        // In lezer-markdown, InlineCode usually wraps the whole thing including backticks.
                        // Let's verify: usually it is ` content `.

                        // Check overlap with selection
                        const isFocused = (selection.from >= start && selection.from <= end) ||
                            (selection.to >= start && selection.to <= end) ||
                            (selection.from <= start && selection.to >= end);

                        if (!isFocused) {
                            // Hide backticks
                            // Check text to be sure it starts/ends with `
                            const text = state.sliceDoc(start, end);
                            // Handle multiple backticks e.g. ``code``
                            const match = text.match(/^(`+)(.*)(`+)$/s);
                            if (match) {
                                const leadingLength = match[1].length;
                                const trailingLength = match[3].length;
                                const contentStart = start + leadingLength;
                                const contentEnd = end - trailingLength;

                                if (contentEnd > contentStart) {
                                    widgets.push(Decoration.replace({}).range(start, contentStart)); // Hide opening
                                    widgets.push(Decoration.mark({ class: 'cm-inline-code-styled' }).range(contentStart, contentEnd));
                                    widgets.push(Decoration.replace({}).range(contentEnd, end)); // Hide closing
                                }
                            }
                        } else {
                            // If focused, just maybe styling? Or leave raw.
                            // User usually wants to see markdown when editing.
                            widgets.push(Decoration.mark({ class: 'cm-inline-code-active' }).range(start, end));
                        }
                    }
                }
            });
        }
        return Decoration.set(widgets, true);
    }
}

export const inlineCode = ViewPlugin.fromClass(InlineCodePlugin, {
    decorations: (v) => v.decorations,
});
