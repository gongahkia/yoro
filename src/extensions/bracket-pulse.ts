import {
    Decoration,
    EditorView,
    ViewPlugin,
    ViewUpdate,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { Range } from '@codemirror/state';

const BRACKETS: { [key: string]: string } = {
    '(': ')',
    ')': '(',
    '[': ']',
    ']': '[',
    '{': '}',
    '}': '{',
};

const OPENING_BRACKETS = new Set(['(', '[', '{']);
const CLOSING_BRACKETS = new Set([')', ']', '}']);

const bracketMark = Decoration.mark({ class: 'cm-bracket-match' });

class BracketPulsePlugin {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.selectionSet || update.docChanged) {
            this.decorations = this.computeDecorations(update.view);
        }
    }

    computeDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = [];
        const { state } = view;
        const pos = state.selection.main.head;
        const doc = state.doc.toString();

        // Check character at cursor and character before cursor
        const charAtCursor = doc[pos];
        const charBeforeCursor = pos > 0 ? doc[pos - 1] : '';

        let bracketPos: number | null = null;
        let bracket: string | null = null;

        // Prioritize character at cursor, then before cursor
        if (charAtCursor && BRACKETS[charAtCursor]) {
            bracketPos = pos;
            bracket = charAtCursor;
        } else if (charBeforeCursor && BRACKETS[charBeforeCursor]) {
            bracketPos = pos - 1;
            bracket = charBeforeCursor;
        }

        if (bracketPos === null || bracket === null) {
            return Decoration.set([]);
        }

        // Find the matching bracket
        const matchingPos = this.findMatchingBracket(doc, bracketPos, bracket);

        if (matchingPos !== null) {
            // Decorate both brackets
            widgets.push(bracketMark.range(bracketPos, bracketPos + 1));
            widgets.push(bracketMark.range(matchingPos, matchingPos + 1));
        }

        return Decoration.set(widgets, true);
    }

    findMatchingBracket(doc: string, pos: number, bracket: string): number | null {
        const target = BRACKETS[bracket];
        const isOpening = OPENING_BRACKETS.has(bracket);
        const direction = isOpening ? 1 : -1;

        let depth = 1;
        let i = pos + direction;

        while (i >= 0 && i < doc.length) {
            const char = doc[i];

            if (char === bracket) {
                depth++;
            } else if (char === target) {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }

            i += direction;
        }

        return null;
    }
}

export const bracketPulse = ViewPlugin.fromClass(BracketPulsePlugin, {
    decorations: (v) => v.decorations,
});
