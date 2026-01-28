import {
    Decoration,
    EditorView,
    ViewPlugin,
    type ViewUpdate,
    type DecorationSet
} from '@codemirror/view';
import type { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import type { Range } from '@codemirror/state';
import type { Note } from '../types';


export const getWikilinkCompletion = (notes: Note[]) => {
    return (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\[\[[^\]]*/);
        if (!word) return null;
        if (word.from === word.to && !context.explicit) return null;

        const query = word.text.slice(2).toLowerCase();
        const options: Completion[] = notes
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
        // Allow URL characters in the match
        const word = context.matchBefore(/@(?:[\w\d\s\-_.:/?#&=%])*/);
        if (!word) return null;
        if (word.text === '@' && !context.explicit) {
            // Optional: Don't trigger on just '@' if you feel it's annoying, 
            // but user wants it to pop up. So we allow it.
            // allow implicit trigger.
        }

        const query = word.text.slice(1);
        const lowerQuery = query.toLowerCase();
        
        const options: Completion[] = notes
            .filter(n => (n.title || 'Untitled').toLowerCase().includes(lowerQuery))
            .map(n => ({
                label: n.title || 'Untitled',
                apply: `[${n.title || 'Untitled'}](/note/${n.id})`,
                detail: 'Link',
                boost: 99
            }));

        // Check for URL
        const isUrl = /^(https?:\/\/|www\.)/i.test(query);
        if (isUrl) {
            const url = query.startsWith('www.') ? 'https://' + query : query;
            options.unshift({
                label: `Link to ${query}`,
                displayLabel: `Link to ${query}`,
                detail: 'External Link',
                boost: 100,
                apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
                    const initialLabel = url;
                    const insertText = `[${initialLabel}](${url})`;
                    view.dispatch({
                        changes: { from, to, insert: insertText }
                    });

                    // Attempt to fetch title
                    fetch(url)
                        .then(res => res.text())
                        .then(html => {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');
                            const title = doc.querySelector('title')?.innerText?.trim();
                            
                            if (title) {
                                // We need to find the text we inserted to replace it safely.
                                // We look for the exact string we inserted starting from 'from'.
                                // This is a heuristic but should work for immediate updates.
                                const currentDoc = view.state.doc.toString();
                                const linkStr = `[${initialLabel}](${url})`;
                                const foundIndex = currentDoc.indexOf(linkStr, from);
                                
                                // Ensure we are still close to where we inserted (sanity check)
                                if (foundIndex !== -1 && Math.abs(foundIndex - from) < 10) {
                                    view.dispatch({
                                        changes: {
                                            from: foundIndex,
                                            to: foundIndex + linkStr.length,
                                            insert: `[${title}](${url})`
                                        }
                                    });
                                }
                            }
                        })
                        .catch(err => {
                            console.warn('Failed to fetch link title', err);
                        });
                }
            });
        }

        return {
            from: word.from,
            options,
            filter: false // Allow fuzzy matching or spaces handled by options?
        };
    };
};

export const createWikilinkPlugin = (notes: Note[], onNavigate: (id: string) => void) => {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;

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
            return Decoration.set(widgets, true);
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
                            window.dispatchEvent(new CustomEvent('yoro-toast', {
                                detail: { message: `Note "${title}" not found.`, type: 'error' }
                            }));
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
                        } else if (url.match(/^https?:\/\//)) {
                            // External link - open in new tab
                            e.preventDefault();
                            window.open(url, '_blank', 'noopener,noreferrer');
                        }
                    }
                }
            }
        }
    });
};