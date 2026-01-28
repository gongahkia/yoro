import { type Extension, Facet } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';

// Configuration facet for blur setting
const focusModeBlurConfig = Facet.define<boolean, boolean>({
    combine: values => values.length ? values[values.length - 1] : true
});

// Decorations for different zones
const activeLineDecoration = Decoration.line({ class: "cm-active-line-visible" });
const nearLineDecoration = Decoration.line({ class: "cm-focus-near" });
const blurredLineDecoration = Decoration.line({ class: "cm-focus-blurred" });

// Focus range (lines within ±3 are "near")
const FOCUS_RANGE = 3;

const focusModePlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.getDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
            this.decorations = this.getDecorations(update.view);
        }
    }

    getDecorations(view: EditorView): DecorationSet {
        const { state } = view;
        const blurEnabled = state.facet(focusModeBlurConfig);
        const selection = state.selection.main;
        const currentLine = state.doc.lineAt(selection.head);
        const currentLineNum = currentLine.number;

        const decorations: { from: number; decoration: Decoration }[] = [];

        // Only decorate visible lines for performance
        const { from: viewportFrom, to: viewportTo } = view.viewport;
        const firstVisibleLine = state.doc.lineAt(viewportFrom).number;
        const lastVisibleLine = state.doc.lineAt(viewportTo).number;

        for (let lineNum = firstVisibleLine; lineNum <= lastVisibleLine; lineNum++) {
            const line = state.doc.line(lineNum);
            const distance = Math.abs(lineNum - currentLineNum);

            if (distance === 0) {
                // Active line
                decorations.push({ from: line.from, decoration: activeLineDecoration });
            } else if (blurEnabled) {
                // Apply blur/near styling only if blur is enabled
                if (distance <= FOCUS_RANGE) {
                    // Near lines (within ±3)
                    decorations.push({ from: line.from, decoration: nearLineDecoration });
                } else {
                    // Blurred lines (beyond ±3)
                    decorations.push({ from: line.from, decoration: blurredLineDecoration });
                }
            }
        }

        // Sort by position and create decoration set
        decorations.sort((a, b) => a.from - b.from);
        return Decoration.set(decorations.map(d => d.decoration.range(d.from)));
    }
}, {
    decorations: v => v.decorations
});

// Main extension that can be configured with blur enabled/disabled
export function createFocusModeExtension(blurEnabled: boolean = true): Extension {
    return [
        focusModeBlurConfig.of(blurEnabled),
        focusModePlugin
    ];
}

// Legacy export for backwards compatibility
export const focusModeExtension: Extension = createFocusModeExtension(true);
