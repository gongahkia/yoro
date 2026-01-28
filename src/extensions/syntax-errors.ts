import {
    Decoration,
    EditorView,
    ViewPlugin,
    ViewUpdate,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { Range } from '@codemirror/state';

const errorMark = Decoration.mark({ class: 'cm-syntax-error' });

class SyntaxErrorPlugin {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.computeDecorations(update.view);
        }
    }

    computeDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = [];
        const { state } = view;

        for (const { from, to } of view.visibleRanges) {
            // Process line by line within visible range
            let pos = from;
            while (pos <= to) {
                const line = state.doc.lineAt(pos);
                const lineText = line.text;

                // Skip code blocks (lines starting with ``` or indented by 4+ spaces)
                if (lineText.trim().startsWith('```') || /^    /.test(lineText)) {
                    pos = line.to + 1;
                    continue;
                }

                // Check for unpaired backticks (inline code)
                const backtickErrors = this.findUnpairedBackticks(lineText, line.from);
                widgets.push(...backtickErrors);

                // Check for unclosed bold **
                const boldErrors = this.findUnclosedBold(lineText, line.from);
                widgets.push(...boldErrors);

                // Check for unclosed italic (single * or _)
                const italicErrors = this.findUnclosedItalic(lineText, line.from);
                widgets.push(...italicErrors);

                // Check for unclosed strikethrough ~~
                const strikeErrors = this.findUnclosedStrikethrough(lineText, line.from);
                widgets.push(...strikeErrors);

                // Check for unmatched link brackets
                const linkErrors = this.findUnmatchedLinkBrackets(lineText, line.from);
                widgets.push(...linkErrors);

                pos = line.to + 1;
            }
        }

        return Decoration.set(widgets, true);
    }

    findUnpairedBackticks(text: string, lineFrom: number): Range<Decoration>[] {
        const widgets: Range<Decoration>[] = [];

        // Count backticks, excluding triple backticks (code fences)
        // Simple approach: count single backticks not part of triple
        let i = 0;
        const positions: number[] = [];

        while (i < text.length) {
            if (text[i] === '`') {
                // Check if it's part of a triple
                if (text.slice(i, i + 3) === '```') {
                    i += 3;
                    continue;
                }
                positions.push(i);
                i++;
            } else {
                i++;
            }
        }

        // Odd number of backticks means unpaired
        if (positions.length % 2 !== 0 && positions.length > 0) {
            // Mark the last backtick as error
            const lastPos = positions[positions.length - 1];
            widgets.push(errorMark.range(lineFrom + lastPos, lineFrom + lastPos + 1));
        }

        return widgets;
    }

    findUnclosedBold(text: string, lineFrom: number): Range<Decoration>[] {
        const widgets: Range<Decoration>[] = [];

        // Find ** pairs
        const positions: number[] = [];
        let i = 0;

        while (i < text.length - 1) {
            if (text[i] === '*' && text[i + 1] === '*') {
                // Check it's not part of ***
                if (text[i + 2] === '*' || (i > 0 && text[i - 1] === '*')) {
                    i++;
                    continue;
                }
                positions.push(i);
                i += 2;
            } else {
                i++;
            }
        }

        // Odd number means unclosed
        if (positions.length % 2 !== 0 && positions.length > 0) {
            const lastPos = positions[positions.length - 1];
            widgets.push(errorMark.range(lineFrom + lastPos, lineFrom + lastPos + 2));
        }

        return widgets;
    }

    findUnclosedItalic(text: string, lineFrom: number): Range<Decoration>[] {
        const widgets: Range<Decoration>[] = [];

        // Check for single * not part of ** or ***
        // This is complex due to ambiguity, so we use a simplified approach
        // We'll look for isolated * that aren't part of ** patterns

        let i = 0;
        const starPositions: number[] = [];

        while (i < text.length) {
            if (text[i] === '*') {
                // Check context
                const prevStar = i > 0 && text[i - 1] === '*';
                const nextStar = text[i + 1] === '*';

                // Single star (not part of **)
                if (!prevStar && !nextStar) {
                    starPositions.push(i);
                }
                i++;
            } else {
                i++;
            }
        }

        if (starPositions.length % 2 !== 0 && starPositions.length > 0) {
            const lastPos = starPositions[starPositions.length - 1];
            widgets.push(errorMark.range(lineFrom + lastPos, lineFrom + lastPos + 1));
        }

        // Similarly for underscore
        const underscorePositions: number[] = [];
        i = 0;

        while (i < text.length) {
            if (text[i] === '_') {
                // Check it's used for emphasis (surrounded by non-word chars or at boundary)
                const prevChar = i > 0 ? text[i - 1] : ' ';
                const nextChar = i < text.length - 1 ? text[i + 1] : ' ';

                // Skip if it looks like it's within a word (snake_case)
                if (/\w/.test(prevChar) && /\w/.test(nextChar)) {
                    i++;
                    continue;
                }

                underscorePositions.push(i);
                i++;
            } else {
                i++;
            }
        }

        if (underscorePositions.length % 2 !== 0 && underscorePositions.length > 0) {
            const lastPos = underscorePositions[underscorePositions.length - 1];
            widgets.push(errorMark.range(lineFrom + lastPos, lineFrom + lastPos + 1));
        }

        return widgets;
    }

    findUnclosedStrikethrough(text: string, lineFrom: number): Range<Decoration>[] {
        const widgets: Range<Decoration>[] = [];

        // Find ~~ pairs
        const positions: number[] = [];
        let i = 0;

        while (i < text.length - 1) {
            if (text[i] === '~' && text[i + 1] === '~') {
                positions.push(i);
                i += 2;
            } else {
                i++;
            }
        }

        // Odd number means unclosed
        if (positions.length % 2 !== 0 && positions.length > 0) {
            const lastPos = positions[positions.length - 1];
            widgets.push(errorMark.range(lineFrom + lastPos, lineFrom + lastPos + 2));
        }

        return widgets;
    }

    findUnmatchedLinkBrackets(text: string, lineFrom: number): Range<Decoration>[] {
        const widgets: Range<Decoration>[] = [];

        // Look for [text]( without closing )
        const linkPattern = /\[[^\]]*\]\([^)]*$/;
        const match = text.match(linkPattern);

        if (match && match.index !== undefined) {
            // Find the opening ( that's unclosed
            const openParenPos = text.indexOf('(', match.index);
            if (openParenPos !== -1) {
                widgets.push(errorMark.range(lineFrom + openParenPos, lineFrom + text.length));
            }
        }

        return widgets;
    }
}

export const syntaxErrors = ViewPlugin.fromClass(SyntaxErrorPlugin, {
    decorations: (v) => v.decorations,
});
