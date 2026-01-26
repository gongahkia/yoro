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

                            // Apply class to the whole blockquote
                            // Note: Block decoration works on lines usually.
                            // But here we might want to wrap or mark?
                            // CodeMirror 6 Block decorations are line-based.
                            // We can use LineDecoration.
                            
                            // But wait, syntaxTree node covers the range.
                            // Let's just decorate the header line for now and maybe add a class to the text?
                            // Replacing the header line `> [!NOTE]` with the widget is good.
                            
                            // If focused, show source.
                            if (!isFocused) {
                                // Replace the definition line
                                widgets.push(Decoration.replace({
                                    widget: new CalloutHeaderWidget(type),
                                    block: true 
                                }).range(line.from, line.to));
                                
                                // We also want to style the content.
                                // It's hard to wrap the whole block in a div with CM6 without a block decoration on all lines.
                                // Instead, we can add a line class to all lines in the blockquote?
                                // That requires iterating lines.
                                
                                // Let's just style the header for now and maybe the blockquote itself if possible.
                                // Standard blockquote styling (border-left) is already in Editor.css.
                                // We can perhaps override the border color via a line decoration on the header?
                                // Or use `attributes` to add a class to the line?
                            }
                            
                            // Add a line decoration to color the border
                            // We can add a class to the line(s) of the blockquote
                            // But syntaxTree node gives us the range.
                            
                            // Let's add a LineDecoration to the start line at least.
                            widgets.push(Decoration.line({
                                attributes: { class: `cm-callout-line cm-callout-${type.toLowerCase()}` }
                            }).range(line.from));
                            
                            // And for subsequent lines?
                            // We'd need to iterate lines from node.from to node.to
                            // Be careful not to overlap if nested.
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
