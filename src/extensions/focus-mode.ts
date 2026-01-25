import { type Extension } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';

const activeLineDecoration = Decoration.line({ class: "cm-active-line-visible" });

const activeLinePlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.getDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
            this.decorations = this.getDecorations(update.view);
        }
    }

    getDecorations(view: EditorView): DecorationSet {
        const { state } = view;
        const selection = state.selection.main;
        const line = state.doc.lineAt(selection.head);
        
        return Decoration.set([activeLineDecoration.range(line.from)]);
    }
}, {
    decorations: v => v.decorations
});

export const focusModeExtension: Extension = activeLinePlugin;
