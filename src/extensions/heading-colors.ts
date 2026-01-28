import {
    Decoration,
    EditorView,
    ViewPlugin,
    type ViewUpdate,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';

const headingClasses = [
    Decoration.mark({ class: 'cm-heading-1' }),
    Decoration.mark({ class: 'cm-heading-2' }),
    Decoration.mark({ class: 'cm-heading-3' }),
    Decoration.mark({ class: 'cm-heading-4' }),
    Decoration.mark({ class: 'cm-heading-5' }),
    Decoration.mark({ class: 'cm-heading-6' }),
];

class HeadingColorPlugin {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.computeDecorations(update.view);
        }
    }

    computeDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = [];
        const { state } = view;

        for (const { from, to } of view.visibleRanges) {
            let pos = from;
            while (pos <= to) {
                const line = state.doc.lineAt(pos);
                const lineText = line.text;

                // Match heading pattern: ^#{1,6}\s
                const match = lineText.match(/^(#{1,6})\s/);
                if (match) {
                    const level = match[1].length;
                    // Apply decoration to the entire line
                    widgets.push(headingClasses[level - 1].range(line.from, line.to));
                }

                pos = line.to + 1;
            }
        }

        return Decoration.set(widgets, true);
    }
}

export const headingColors = ViewPlugin.fromClass(HeadingColorPlugin, {
    decorations: (v) => v.decorations,
});
