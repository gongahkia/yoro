import {
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { Range } from '@codemirror/state';

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
            const newChar = this.checked ? ' ' : 'x';
            view.dispatch({
                changes: { from: pos + 1, to: pos + 2, insert: newChar }
            });
            return true;
        }
        return input;
    }

    ignoreEvent() { return false; }
}

// Parse alt text for embedded width/align annotations: "alt|width|align"
function parseImageAlt(alt: string): { baseAlt: string; width?: number; align?: string } {
    const parts = alt.split('|');
    const baseAlt = parts[0] || '';
    const width = parts[1] ? parseInt(parts[1]) : undefined;
    const align = parts[2] || undefined;
    return { baseAlt, width: isNaN(width!) ? undefined : width, align };
}

function applyImageStyles(img: HTMLImageElement, wrapper: HTMLDivElement, alt: string) {
    const { width, align } = parseImageAlt(alt);
    if (width) {
        img.style.width = `${width}px`;
        img.style.height = 'auto';
    }
    if (align === 'center') {
        wrapper.style.textAlign = 'center';
    } else if (align === 'right') {
        wrapper.style.textAlign = 'right';
    }
}

// Track pending single-click timers to detect double-clicks
const pendingClickTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function bindImageClicks(img: HTMLImageElement, src: string, alt: string) {
    img.style.cursor = 'pointer';

    img.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Debounce to distinguish single vs double click
        if (pendingClickTimers.has(img)) {
            clearTimeout(pendingClickTimers.get(img)!);
            pendingClickTimers.delete(img);
            // Double click — open drawing canvas or lightbox
            window.dispatchEvent(new CustomEvent('yoro-image-click', { detail: { src, alt } }));
        } else {
            const timer = setTimeout(() => {
                pendingClickTimers.delete(img);
                // Single click — show image toolbar
                window.dispatchEvent(new CustomEvent('yoro-image-select', {
                    detail: { src, alt, element: img }
                }));
            }, 220);
            pendingClickTimers.set(img, timer);
        }
    };
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
        const wrapper = document.createElement('div');
        wrapper.className = 'cm-image-wrapper';
        const img = document.createElement('img');
        img.src = this.src;
        img.alt = parseImageAlt(this.alt).baseAlt;
        img.loading = 'lazy';
        img.className = 'cm-image-widget';
        img.onerror = () => {
            img.style.cursor = 'default';
            img.removeAttribute('src');
            img.alt = `⚠ Image not found: ${parseImageAlt(this.alt).baseAlt || this.src}`;
            img.style.display = 'inline-block';
            img.style.padding = '4px 8px';
            img.style.fontSize = '0.85em';
            img.style.opacity = '0.6';
        };
        applyImageStyles(img, wrapper, this.alt);
        bindImageClicks(img, this.src, this.alt);
        wrapper.appendChild(img);
        return wrapper;
    }
}

class HRWidget extends WidgetType {
    toDOM() {
        const hr = document.createElement('hr');
        hr.className = 'cm-hr';
        return hr;
    }
}

class URLImageWidget extends WidgetType {
    readonly src: string;

    constructor(src: string) {
        super();
        this.src = src;
    }

    eq(other: URLImageWidget) {
        return other.src === this.src;
    }

    toDOM() {
        const wrapper = document.createElement('div');
        wrapper.className = 'cm-image-url-wrapper';
        const img = document.createElement('img');
        img.src = this.src;
        img.alt = 'Image';
        img.loading = 'lazy';
        img.className = 'cm-image-url-widget';
        img.onerror = () => {
            img.style.cursor = 'default';
            img.removeAttribute('src');
            img.alt = `⚠ Image not found: ${this.src}`;
            img.style.display = 'inline-block';
            img.style.padding = '4px 8px';
            img.style.fontSize = '0.85em';
            img.style.opacity = '0.6';
        };
        bindImageClicks(img, this.src, '');
        wrapper.appendChild(img);
        return wrapper;
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
                        if (this.isFocused(selection, node.from, node.to)) return;
                        const text = state.sliceDoc(node.from, node.to);
                        const match = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                        if (match) {
                            const alt = match[1];
                            const src = match[2];
                            if (src && !src.startsWith('http') && !src.startsWith('data:')) return;
                            widgets.push(Decoration.replace({
                                widget: new ImageWidget(src, alt),
                                block: true,
                            }).range(node.from, node.to));
                        }
                    }

                    if (node.name === 'HorizontalRule') {
                        if (!this.isFocused(selection, node.from, node.to)) {
                            widgets.push(Decoration.replace({
                                widget: new HRWidget(),
                                block: true,
                            }).range(node.from, node.to));
                        }
                    }

                    // Bare URL image auto-embed
                    if (node.name === 'URL') {
                        const url = state.sliceDoc(node.from, node.to);
                        if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$/i.test(url)) {
                            if (!this.isFocused(selection, node.from, node.to)) {
                                widgets.push(Decoration.replace({
                                    widget: new URLImageWidget(url),
                                    block: true,
                                }).range(node.from, node.to));
                            }
                        }
                    }
                }
            });
        }

        try {
            return Decoration.set(widgets, true);
        } catch {
            return Decoration.none;
        }
    }

    isFocused(selection: { from: number; to: number }, from: number, to: number) {
        return selection.from <= to && selection.to >= from;
    }
}

export const livePreview = ViewPlugin.fromClass(LivePreviewPlugin, {
    decorations: (v) => v.decorations,
    eventHandlers: {
        mousedown(e) {
            const target = e.target as HTMLElement;
            if (target.classList.contains('cm-task-checkbox')) return false;
        }
    }
});
