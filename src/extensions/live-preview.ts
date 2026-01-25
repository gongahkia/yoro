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

            // The widget replaces [ ] or [x]. Length is 3.
            // But we need to verify what exactly it replaced.
            // Actually posAtDOM returns the position BEFORE the widget?
            // Decorations replace ranges.
            // Let's rely on finding the position and replacing the content.

            const newChar = this.checked ? ' ' : 'x'; // Toggle
            view.dispatch({
                changes: { from: pos + 1, to: pos + 2, insert: newChar }
                // Marker is "[ ]", char at index 1 is " " or "x".
                // Wait, if widget replaces invalid range, pos is start.
                // Assuming [x] or [ ] format.
            });
            return true;
        }
        return input;
    }

    ignoreEvent() { return false; }
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
                        // Only hide if not focused
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
                        // Check text content to see if checked
                        const text = state.sliceDoc(node.from, node.to);
                        const checked = text.includes('x') || text.includes('X');
                        widgets.push(Decoration.replace({
                            widget: new CheckboxWidget(checked)
                        }).range(node.from, node.to));
                    }

                    if (node.name === 'Blockquote') {
                        widgets.push(Decoration.mark({ class: 'cm-blockquote' }).range(node.from, node.to));
                    }

                    if (node.name === 'Link') {
                        // We don't style the wrapper, we handle children
                    }

                    if (node.name === 'URL') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            // Check if parent is Link?
                            // URL can be standalone (autolink).
                            // Assuming inside Link for now.
                            // We also need to hide the markers ]( and ).
                        }
                    }

                    // Actually, getting granular children (LinkMark) inside 'Link' via iterate is tricky 
                    // because iterate visits top-down. 
                    // We can check node.name for specific parts.

                    // Simple Link approach:
                    // Style LinkText with .cm-link
                    // Hide everything else IF not focused.

                    // Complication: The iterator hits 'Link' then children.
                    // If we encounter 'Link', we can't easily instruct "hide children except LinkText".

                    // BETTER: Match 'LinkMark' and 'URL' and hide them.

                    if (node.name === 'LinkMark') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'URL') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({}).range(node.from, node.to));
                        } else {
                            widgets.push(Decoration.mark({ class: 'cm-formatting-visible' }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'LinkText') {
                        // Style as link
                        widgets.push(Decoration.mark({ class: 'cm-link' }).range(node.from, node.to));
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
