import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

// Move line(s) up
function moveLineUp(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get the lines that contain the selection
    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    // Can't move up if already at the first line
    if (startLine.number === 1) return false;

    // Get the line above
    const lineAbove = state.doc.line(startLine.number - 1);

    // Get the content of the lines to move
    const linesToMove = state.sliceDoc(startLine.from, endLine.to);
    const lineAboveContent = lineAbove.text;

    // Calculate the new selection position
    const selectionOffset = from - startLine.from;
    const newSelectionStart = lineAbove.from + selectionOffset;
    const selectionLength = to - from;

    // Perform the swap
    view.dispatch({
        changes: [
            // Replace the line above with the lines to move
            { from: lineAbove.from, to: lineAbove.to, insert: linesToMove },
            // Replace the moved lines with the line that was above
            { from: startLine.from, to: endLine.to, insert: lineAboveContent }
        ],
        selection: {
            anchor: newSelectionStart,
            head: newSelectionStart + selectionLength
        },
        scrollIntoView: true
    });

    return true;
}

// Move line(s) down
function moveLineDown(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get the lines that contain the selection
    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    // Can't move down if already at the last line
    if (endLine.number === state.doc.lines) return false;

    // Get the line below
    const lineBelow = state.doc.line(endLine.number + 1);

    // Get the content of the lines to move
    const linesToMove = state.sliceDoc(startLine.from, endLine.to);
    const lineBelowContent = lineBelow.text;

    // Calculate the new selection position
    const selectionOffset = from - startLine.from;
    const lineBelowLength = lineBelowContent.length;
    const newSelectionStart = startLine.from + lineBelowLength + 1 + selectionOffset;
    const selectionLength = to - from;

    // Perform the swap
    view.dispatch({
        changes: [
            // Replace the lines to move with the line below
            { from: startLine.from, to: endLine.to, insert: lineBelowContent },
            // Replace the line below with the moved lines
            { from: lineBelow.from, to: lineBelow.to, insert: linesToMove }
        ],
        selection: {
            anchor: newSelectionStart,
            head: newSelectionStart + selectionLength
        },
        scrollIntoView: true
    });

    return true;
}

// Duplicate line(s)
function duplicateLine(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get the lines that contain the selection
    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    // Get the content to duplicate
    const linesToDuplicate = state.sliceDoc(startLine.from, endLine.to);

    // Insert the duplicated lines after the current lines
    view.dispatch({
        changes: {
            from: endLine.to,
            insert: '\n' + linesToDuplicate
        },
        selection: {
            anchor: endLine.to + 1 + (from - startLine.from),
            head: endLine.to + 1 + (to - startLine.from)
        },
        scrollIntoView: true
    });

    return true;
}

// Delete line(s)
function deleteLine(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get the lines that contain the selection
    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    // Determine the range to delete (including newline)
    let deleteFrom = startLine.from;
    let deleteTo = endLine.to;

    // Include the newline after if not at end of document
    if (endLine.number < state.doc.lines) {
        deleteTo = state.doc.line(endLine.number + 1).from;
    } else if (startLine.number > 1) {
        // Or include the newline before if at end
        deleteFrom = state.doc.line(startLine.number - 1).to;
    }

    view.dispatch({
        changes: { from: deleteFrom, to: deleteTo },
        scrollIntoView: true
    });

    return true;
}

// Indent line(s) - add spaces/tabs
function indentLine(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    const changes: { from: number; insert: string }[] = [];

    for (let i = startLine.number; i <= endLine.number; i++) {
        const line = state.doc.line(i);
        changes.push({ from: line.from, insert: '    ' }); // 4 spaces
    }

    view.dispatch({
        changes,
        selection: {
            anchor: from + 4,
            head: to + 4 * (endLine.number - startLine.number + 1)
        }
    });

    return true;
}

// Outdent line(s) - remove spaces/tabs
function outdentLine(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    const startLine = state.doc.lineAt(from);
    const endLine = state.doc.lineAt(to);

    const changes: { from: number; to: number }[] = [];
    let totalRemoved = 0;
    let firstLineRemoved = 0;

    for (let i = startLine.number; i <= endLine.number; i++) {
        const line = state.doc.line(i);
        const text = line.text;

        // Count leading whitespace to remove (up to 4 spaces or 1 tab)
        let removeCount = 0;
        for (let j = 0; j < Math.min(4, text.length); j++) {
            if (text[j] === ' ') {
                removeCount++;
            } else if (text[j] === '\t' && j === 0) {
                removeCount = 1;
                break;
            } else {
                break;
            }
        }

        if (removeCount > 0) {
            changes.push({ from: line.from, to: line.from + removeCount });
            totalRemoved += removeCount;
            if (i === startLine.number) {
                firstLineRemoved = removeCount;
            }
        }
    }

    if (changes.length === 0) return false;

    view.dispatch({
        changes,
        selection: {
            anchor: Math.max(startLine.from, from - firstLineRemoved),
            head: Math.max(startLine.from, to - totalRemoved)
        }
    });

    return true;
}

// Keymap for line operations
const lineMoveKeymap = keymap.of([
    {
        key: 'Mod-Alt-ArrowUp',
        run: moveLineUp,
        preventDefault: true
    },
    {
        key: 'Mod-Alt-ArrowDown',
        run: moveLineDown,
        preventDefault: true
    },
    {
        key: 'Mod-Shift-d',
        run: duplicateLine,
        preventDefault: true
    },
    {
        key: 'Mod-Shift-k',
        run: deleteLine,
        preventDefault: true
    },
    {
        key: 'Tab',
        run: indentLine,
    },
    {
        key: 'Shift-Tab',
        run: outdentLine,
    }
]);

export const lineMoveExtension: Extension = lineMoveKeymap;
