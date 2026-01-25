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
                boost: 99 // High priority
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
                const regex = /\[\[(.*?)\]\]/g;
                let match;
                while ((match = regex.exec(text))) {
                    const start = from + match.index;
                    const end = start + match[0].length;
                    const title = match[1];
                    
                    widgets.push(Decoration.mark({
                        class: 'cm-wikilink',
                        attributes: { 'data-title': title }
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
                const link = target.closest('.cm-wikilink');
                if (link) {
                    const title = link.getAttribute('data-title');
                    if (title) {
                        // Cmd/Ctrl+Click to open? Or just click? 
                        // Obsidian is Click (edit mode might need Cmd-Click).
                        // Since this is "Live Preview" (hybrid), user might want to edit the link.
                        // Standard practice: Cmd+Click to follow, Click to edit/cursor.
                        // Or Click to follow if read-only/preview.
                        // Let's implement Cmd+Click to follow.
                        if (e.metaKey || e.ctrlKey) {
                            e.preventDefault();
                            const note = notes.find(n => (n.title || 'Untitled') === title);
                            if (note) {
                                onNavigate(note.id);
                            } else {
                                // TODO: Create note logic
                                alert(`Note "${title}" not found.`);
                            }
                        }
                    }
                }
            }
        }
    });
};
