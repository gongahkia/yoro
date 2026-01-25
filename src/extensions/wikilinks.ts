import {
    Decoration,
    EditorView,
    ViewPlugin,
    ViewUpdate
} from '@codemirror/view';
import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { Range } from '@codemirror/state';
import type { Note } from '../types';


export const getWikilinkCompletion = (notes: Note[]) => {
    return (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\[\[[^\]]*/);
        if (!word) return null;
        if (word.from === word.to && !context.explicit) return null;

        const query = word.text.slice(2).toLowerCase();
        const options = notes
            .filter(n => (n.title || 'Untitled').toLowerCase().includes(query))
            .map(n => ({
                label: n.title || 'Untitled',
                apply: `[[${n.title || 'Untitled'}]]`,
                detail: 'Note',
                boost: 99
            }));

        return {
            from: word.from,
            options
        };
    };
};

export const getMentionCompletion = (notes: Note[]) => {
    return (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/@[^ \]]*/);
        if (!word) return null;
        if (word.from === word.to && !context.explicit) return null;

        const query = word.text.slice(1).toLowerCase();
        const options = notes
            .filter(n => (n.title || 'Untitled').toLowerCase().includes(query))
            .map(n => ({
                label: n.title || 'Untitled',
                // Use a relative path so it works in clicks if we implement standard link handling
                apply: `[${n.title || 'Untitled'}](/note/${n.id})`,
                detail: 'Link',
                boost: 99
            }));

        return {
            from: word.from,
            options
        };
    };
};

export const createWikilinkPlugin = (notes: Note[], onNavigate: (id: string) => void) => {
    return ViewPlugin.fromClass(class {
        decorations: any;

        constructor(view: EditorView) {
            this.decorations = this.compute(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged)
                this.decorations = this.compute(update.view);
        }

        compute(view: EditorView) {
            const widgets: Range<Decoration>[] = [];
            for (const { from, to } of view.visibleRanges) {
                const text = view.state.doc.sliceString(from, to);

                // Match [[Title]]
                const wikiRegex = /\[\[(.*?)\]\]/g;
                let match;
                while ((match = wikiRegex.exec(text))) {
                    const start = from + match.index;
                    const end = start + match[0].length;
                    const title = match[1];

                    widgets.push(Decoration.mark({
                        class: 'cm-wikilink',
                        attributes: { 'data-title': title }
                    }).range(start, end));
                }

                // Match [Title](Url)
                // Note: This is a simple regex and might fail on nested parens, but sufficient for simple links
                const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                while ((match = linkRegex.exec(text))) {
                    const start = from + match.index;
                    const end = start + match[0].length;
                    // const title = match[1];
                    const url = match[2];

                    // We only want to enable click behavior, but let markdown styling handle the look?
                    // Or add a class that hints it's clickable
                    widgets.push(Decoration.mark({
                        class: 'cm-md-link',
                        attributes: { 'data-url': url }
                    }).range(start, end));
                }
            }
            return Decoration.set(widgets.sort((a, b) => a.from - b.from));
        }
    }, {
        decorations: v => v.decorations,
        eventHandlers: {
            mousedown: (e) => {
                const target = e.target as HTMLElement;

                // Handle Wikilinks
                const wikiLink = target.closest('.cm-wikilink');
                if (wikiLink) {
                    const title = wikiLink.getAttribute('data-title');
                    if (title && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        const note = notes.find(n => (n.title || 'Untitled') === title);
                        if (note) {
                            onNavigate(note.id);
                        } else {
                            alert(`Note "${title}" not found.`);
                        }
                        return;
                    }
                }

                // Handle Standard Links
                const mdLink = target.closest('.cm-md-link');
                if (mdLink) {
                    const url = mdLink.getAttribute('data-url');
                    if (url && (e.metaKey || e.ctrlKey)) {
                        // Check if internal note link
                        const noteMatch = url.match(/\/note\/([a-zA-Z0-9-]+)/);
                        if (noteMatch) {
                            e.preventDefault();
                            onNavigate(noteMatch[1]);
                        } else {
                            // External link? Let browser handle or open in new tab
                            // e.preventDefault(); 
                            // window.open(url, '_blank');
                        }
                    }
                }
            }
        }
    });
};
