import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { foldAll, unfoldAll, foldCode, unfoldCode, foldGutter, foldKeymap } from '@codemirror/language';
import { foldService } from '@codemirror/language';

// Custom fold service for markdown headings
// Folds from a heading to the next heading of equal or higher level, or end of document
const markdownFoldService = foldService.of((state, lineStart, _lineEnd) => {
    const line = state.doc.lineAt(lineStart);
    const text = line.text;

    // Check if this is a heading line
    const headingMatch = text.match(/^(#{1,6})\s/);
    if (!headingMatch) {
        // Check for code block
        if (text.startsWith('```')) {
            // Find the closing ```
            for (let i = line.number + 1; i <= state.doc.lines; i++) {
                const nextLine = state.doc.line(i);
                if (nextLine.text.startsWith('```')) {
                    // Fold from after the opening ``` to before the closing ```
                    return { from: line.to, to: nextLine.from - 1 };
                }
            }
        }
        return null;
    }

    const headingLevel = headingMatch[1].length;

    // Find the end of this section (next heading of same or higher level, or EOF)
    let foldEnd = state.doc.length;

    for (let i = line.number + 1; i <= state.doc.lines; i++) {
        const nextLine = state.doc.line(i);
        const nextHeadingMatch = nextLine.text.match(/^(#{1,6})\s/);

        if (nextHeadingMatch) {
            const nextLevel = nextHeadingMatch[1].length;
            if (nextLevel <= headingLevel) {
                // Found a heading of same or higher level, fold up to (but not including) this line
                foldEnd = nextLine.from - 1;
                break;
            }
        }
    }

    // Don't fold if there's nothing to fold
    if (foldEnd <= line.to) return null;

    return { from: line.to, to: foldEnd };
});

// Keymap for folding commands
// Cmd+K Cmd+0 = fold all, Cmd+K Cmd+J = unfold all
// Using a state machine approach for Cmd+K prefix
let pendingFoldCommand = false;
let pendingFoldTimeout: number | null = null;

const foldKeyCommands = keymap.of([
    // Cmd+K starts the prefix
    {
        key: 'Mod-k',
        run: () => {
            pendingFoldCommand = true;
            if (pendingFoldTimeout) clearTimeout(pendingFoldTimeout);
            pendingFoldTimeout = window.setTimeout(() => {
                pendingFoldCommand = false;
            }, 1500);
            return true;
        }
    },
    // 0 after Cmd+K = fold all
    {
        key: '0',
        run: (view) => {
            if (pendingFoldCommand) {
                pendingFoldCommand = false;
                if (pendingFoldTimeout) clearTimeout(pendingFoldTimeout);
                foldAll(view);
                return true;
            }
            return false;
        }
    },
    // j after Cmd+K = unfold all
    {
        key: 'j',
        run: (view) => {
            if (pendingFoldCommand) {
                pendingFoldCommand = false;
                if (pendingFoldTimeout) clearTimeout(pendingFoldTimeout);
                unfoldAll(view);
                return true;
            }
            return false;
        }
    },
    // Escape cancels the pending command
    {
        key: 'Escape',
        run: () => {
            if (pendingFoldCommand) {
                pendingFoldCommand = false;
                if (pendingFoldTimeout) clearTimeout(pendingFoldTimeout);
                return true;
            }
            return false;
        }
    },
    // Single key shortcuts as alternatives
    {
        key: 'Mod-Shift-[',
        run: foldCode,
        shift: unfoldCode
    },
    {
        key: 'Mod-Shift-]',
        run: unfoldCode
    }
]);

// Fold gutter with custom styling
const customFoldGutter = foldGutter({
    closedText: '\u25B6', // Right-pointing triangle
    openText: '\u25BC',   // Down-pointing triangle
    markerDOM: (open) => {
        const marker = document.createElement('span');
        marker.className = `cm-fold-marker ${open ? 'cm-fold-open' : 'cm-fold-closed'}`;
        marker.textContent = open ? '\u25BC' : '\u25B6';
        return marker;
    }
});

// Fold gutter theme
const foldGutterTheme = EditorView.baseTheme({
    '.cm-foldGutter': {
        width: '1.2em',
        textAlign: 'center',
    },
    '.cm-fold-marker': {
        cursor: 'pointer',
        color: 'var(--text-primary, #333)',
        opacity: '0.5',
        fontSize: '0.7em',
        transition: 'opacity 0.15s ease, color 0.15s ease',
    },
    '.cm-fold-marker:hover': {
        opacity: '1',
        color: 'var(--primary, #007bff)',
    },
    '.cm-foldPlaceholder': {
        display: 'none',
    },
});

// Combined folding extension
export const markdownFolding: Extension = [
    markdownFoldService,
    customFoldGutter,
    foldKeyCommands,
    keymap.of(foldKeymap),
    foldGutterTheme,
];
