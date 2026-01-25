import {
    Decoration,
    EditorView,
    ViewPlugin,
} from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';

class LivePreviewPlugin {
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

        for (const { from, to } of view.visibleRanges) {
            syntaxTree(state).iterate({
                from,
                to,
                enter: (node) => {
                    if (node.name.startsWith('ATXHeading')) {
                        const level = parseInt(node.name.slice(10));
                        if (!isNaN(level)) {
                            widgets.push(Decoration.mark({
                                class: `cm - heading - ${level} `
                            }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'HeaderMark') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'StrongEmphasis') {
                        widgets.push(Decoration.mark({ class: 'cm-bold' }).range(node.from, node.to));
                    }

                    if (node.name === 'Emphasis') {
                        widgets.push(Decoration.mark({ class: 'cm-italic' }).range(node.from, node.to));
                    }

                    if (node.name === 'EmphasisMark') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'Strikethrough') {
                        widgets.push(Decoration.mark({ class: 'cm-strikethrough' }).range(node.from, node.to));
                    }

                    if (node.name === 'StrikethroughMark') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
                        }
                    }
                }
            });
        }

        return Decoration.set(widgets.sort((a, b) => a.from - b.from));
    }

    isFocused(selection: { from: number, to: number }, from: number, to: number) {
        return (selection.from >= from && selection.from <= to) ||
            (selection.to >= from && selection.to <= to);
    }
}

export const livePreview = ViewPlugin.fromClass(LivePreviewPlugin, {
    decorations: (v) => v.decorations,
});
