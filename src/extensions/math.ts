import {
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import katex from 'katex';

class MathWidget extends WidgetType {
    readonly formula: string;
    readonly displayMode: boolean;

    constructor(formula: string, displayMode: boolean) {
        super();
        this.formula = formula;
        this.displayMode = displayMode;
    }

    eq(other: MathWidget) {
        return other.formula === this.formula && other.displayMode === this.displayMode;
    }

    toDOM() {
        const span = document.createElement('span');
        try {
            katex.render(this.formula, span, {
                displayMode: this.displayMode,
                throwOnError: false
            });
        } catch {
            span.innerText = this.formula;
            span.style.color = 'red';
        }
        span.className = 'cm-math-widget';
        return span;
    }

    ignoreEvent() { return true; }
}

class MathPreviewPlugin {
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
            // Regex for $$...$$ (block) and $...$ (inline)
            // We use global flag to find all matches
            const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
            
            let match;
            while ((match = mathRegex.exec(text)) !== null) {
                const start = from + match.index;
                const end = start + match[0].length;
                const isBlock = !!match[1];
                const formula = match[1] || match[2];

                // Verify we are not in a code block or other forbidden node
                const node = syntaxTree(state).resolveInner(start, 1);
                const nodeName = node.name;
                
                if (nodeName.includes('Code') || nodeName === 'FencedCode' || nodeName === 'Link' || nodeName === 'URL') {
                    continue;
                }

                // Check if focused
                const isFocused = (selection.from >= start && selection.from <= end) ||
                                  (selection.to >= start && selection.to <= end);

                if (isFocused) {
                    widgets.push(Decoration.mark({ class: 'cm-math-source' }).range(start, end));
                } else {
                    widgets.push(Decoration.replace({
                        widget: new MathWidget(formula, isBlock)
                    }).range(start, end));
                }
            }
        }

        return Decoration.set(widgets.sort((a, b) => a.from - b.from));
    }
}

export const mathPreview = ViewPlugin.fromClass(MathPreviewPlugin, {
    decorations: (v) => v.decorations,
});
