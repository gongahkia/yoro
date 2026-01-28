import {
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
    ViewUpdate
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

const CALLOUT_REGEX = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO|SUCCESS|DANGER|QUESTION|ABSTRACT|EXAMPLE|QUOTE)\]/i;

const ICONS: Record<string, string> = {
    NOTE: '📝',
    TIP: '💡',
    IMPORTANT: '🔥',
    WARNING: '⚠️',
    CAUTION: '🛑',
    INFO: 'ℹ️',
    SUCCESS: '✅',
    DANGER: '⚡',
    QUESTION: '❓',
    ABSTRACT: '📋',
    EXAMPLE: '🔍',
    QUOTE: '❝'
};

class CalloutHeaderWidget extends WidgetType {
    readonly type: string;

    constructor(type: string) {
        super();
        this.type = type.toUpperCase();
    }

    eq(other: CalloutHeaderWidget) {
        return other.type === this.type;
    }

    toDOM() {
        const div = document.createElement('div');
        div.className = `cm-callout-header cm-callout-header-${this.type.toLowerCase()}`;
        
        const icon = document.createElement('span');
        icon.className = 'cm-callout-icon';
        icon.textContent = ICONS[this.type] || '📝';
        
        const title = document.createElement('span');
        title.className = 'cm-callout-title';
        title.textContent = this.type.charAt(0) + this.type.slice(1).toLowerCase();

        div.appendChild(icon);
        div.appendChild(title);
        return div;
    }
}

class CalloutsPlugin {
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
                    if (node.name === 'Blockquote') {
                        // Check if it's a callout
                        const line = state.doc.lineAt(node.from);
                        const lineText = line.text;
                        const match = lineText.match(CALLOUT_REGEX);
                        
                        if (match) {
                            const type = match[1].toUpperCase();
                            const isFocused = (selection.from >= node.from && selection.from <= node.to) ||
                                              (selection.to >= node.from && selection.to <= node.to);

                            if (!isFocused) {
                                widgets.push(Decoration.replace({
                                    widget: new CalloutHeaderWidget(type),
                                    block: true 
                                }).range(line.from, line.to));
                            }
                            
                            widgets.push(Decoration.line({
                                attributes: { class: `cm-callout-line cm-callout-${type.toLowerCase()}` }
                            }).range(line.from));
                        }
                    }
                }
            });
        }
        return Decoration.set(widgets, true);
    }
}

export const callouts = ViewPlugin.fromClass(CalloutsPlugin, {
    decorations: (v) => v.decorations,
});

export const calloutCompletion = (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/>\s*\[!(\w*)/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;

    const types = Object.keys(ICONS);
    
    return {
        from: word.from + word.text.indexOf('[!') + 2,
        options: types.map(type => ({
            label: type,
            displayLabel: type,
            detail: ICONS[type],
            type: 'keyword',
            apply: type + ']'
        }))
    };
};