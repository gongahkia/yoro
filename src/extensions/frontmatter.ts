import { EditorView, ViewPlugin } from '@codemirror/view';
import { foldEffect } from '@codemirror/language';

export const frontmatterFold = ViewPlugin.fromClass(class {
    constructor(view: EditorView) {
        this.foldFrontmatter(view);
    }

    foldFrontmatter(view: EditorView) {
        const docString = view.state.doc.toString();
        // Regex to find YAML frontmatter at the start of the document
        const match = docString.match(/^---\n[\s\S]*?\n---/);

        if (match) {
            const matchLength = match[0].length;
            // Fold the entire frontmatter block
            // We use setTimeout to avoid dispatching during initialization
            setTimeout(() => {
                // Ensure the view is still valid
                if (!view.dom.isConnected) return;

                view.dispatch({
                    effects: foldEffect.of({ from: 0, to: matchLength })
                });
            }, 0);
        }
    }
});
