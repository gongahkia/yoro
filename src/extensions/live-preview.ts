import {
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';

class CheckboxWidget extends WidgetType {
    readonly checked: boolean;

    constructor(checked: boolean) {
        super();
        this.checked = checked;
    }

    eq(other: CheckboxWidget) {
        return other.checked === this.checked;
    }

    toDOM(view: EditorView) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = this.checked;
        input.className = 'cm-task-checkbox';

        input.onclick = () => {
            const pos = view.posAtDOM(input);
            if (pos === null) return;
            const newChar = this.checked ? ' ' : 'x'; // Toggle
            view.dispatch({
                changes: { from: pos + 1, to: pos + 2, insert: newChar }
            });
            return true;
        }
        return input;
    }

    ignoreEvent() { return false; }
}

class ImageWidget extends WidgetType {
    readonly src: string;
    readonly alt: string;

    constructor(src: string, alt: string) {
        super();
        this.src = src;
        this.alt = alt;
    }

    eq(other: ImageWidget) {
        return other.src === this.src && other.alt === this.alt;
    }

    toDOM() {
        const img = document.createElement('img');
        img.src = this.src;
        img.alt = this.alt;
        img.className = 'cm-image-widget';
        img.style.maxWidth = '100%';
        return img;
    }
}

class HRWidget extends WidgetType {
    toDOM() {
        const hr = document.createElement('hr');
        hr.className = 'cm-hr';
        return hr;
    }
}

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
                                class: `cm-heading-${level}`
                            }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'InlineCode') {
                        widgets.push(Decoration.mark({ class: 'cm-inline-code' }).range(node.from, node.to));
                    }

                    if (node.name === 'CodeMark') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
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

                    if (node.name === 'ListMark') {
                        widgets.push(Decoration.mark({ class: 'cm-list-mark' }).range(node.from, node.to));
                    }

                    if (node.name === 'TaskMarker') {
                        const text = state.sliceDoc(node.from, node.to);
                        const checked = text.includes('x') || text.includes('X');
                        widgets.push(Decoration.replace({
                            widget: new CheckboxWidget(checked)
                        }).range(node.from, node.to));
                    }

                    if (node.name === 'Blockquote') {
                        widgets.push(Decoration.mark({ class: 'cm-blockquote' }).range(node.from, node.to));
                    }

                    if (node.name === 'QuoteMark') {
                        widgets.push(Decoration.mark({ class: 'cm-quote-mark' }).range(node.from, node.to));
                    }

                    if (node.name === 'Image') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            const text = state.sliceDoc(node.from, node.to);
                            const match = text.match(/!\[(.*?)\]\((.*?)\)/);
                            if (match) {
                                const alt = match[1];
                                const src = match[2];
                                widgets.push(Decoration.replace({
                                    widget: new ImageWidget(src, alt)
                                }).range(node.from, node.to));
                            }
                        }
                    }

                    if (node.name === 'LinkMark') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'URL') {
                        // Hide URL unless focused
                        // Note: Image URLs might be covered by Image logic above if 'Image' node is used (it replaces children).
                        // But if Image node logic fails or we are in a simple Link...
                        if (!this.isFocused(selection, node.from, node.to)) {
                            // If inside Image, we might double replace?
                            // CM6 handles overlapping decorations gracefully usually (last one wins or merge?).
                            // Or error.
                            // But Image processing replaces parent node. So children are gone.
                            // So we are safe.

                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'LinkText') {
                        widgets.push(Decoration.mark({ class: 'cm-link' }).range(node.from, node.to));
                    }

                    if (node.name === 'HorizontalRule') {
                        widgets.push(Decoration.replace({
                            widget: new HRWidget()
                        }).range(node.from, node.to));
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
