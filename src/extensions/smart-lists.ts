import { keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

// Patterns for detecting list items
const UNORDERED_LIST = /^(\s*)([-*])\s/;
const ORDERED_LIST = /^(\s*)(\d+)\.\s/;
const TASK_LIST = /^(\s*)([-*])\s\[([ xX])\]\s/;

function handleEnter(view: EditorView): boolean {
    const { state } = view;
    const { from } = state.selection.main;

    // Get the current line
    const line = state.doc.lineAt(from);
    const lineText = line.text;

    // Check for task list first (more specific)
    let match = lineText.match(TASK_LIST);
    if (match) {
        const indent = match[1];
        const marker = match[2];
        const contentStart = match[0].length;
        const content = lineText.slice(contentStart);

        if (content.trim() === '') {
            // Empty task item - remove the marker and exit list
            view.dispatch({
                changes: { from: line.from, to: line.to, insert: '' },
                selection: EditorSelection.cursor(line.from)
            });
            return true;
        }

        // Insert new task item
        const newItem = `\n${indent}${marker} [ ] `;
        view.dispatch({
            changes: { from, to: from, insert: newItem },
            selection: EditorSelection.cursor(from + newItem.length)
        });
        return true;
    }

    // Check for ordered list
    match = lineText.match(ORDERED_LIST);
    if (match) {
        const indent = match[1];
        const num = parseInt(match[2], 10);
        const contentStart = match[0].length;
        const content = lineText.slice(contentStart);

        if (content.trim() === '') {
            // Empty numbered item - remove the marker and exit list
            view.dispatch({
                changes: { from: line.from, to: line.to, insert: '' },
                selection: EditorSelection.cursor(line.from)
            });
            return true;
        }

        // Insert new numbered item with incremented number
        const newItem = `\n${indent}${num + 1}. `;
        view.dispatch({
            changes: { from, to: from, insert: newItem },
            selection: EditorSelection.cursor(from + newItem.length)
        });
        return true;
    }

    // Check for unordered list
    match = lineText.match(UNORDERED_LIST);
    if (match) {
        const indent = match[1];
        const marker = match[2];
        const contentStart = match[0].length;
        const content = lineText.slice(contentStart);

        if (content.trim() === '') {
            // Empty bullet item - remove the marker and exit list
            view.dispatch({
                changes: { from: line.from, to: line.to, insert: '' },
                selection: EditorSelection.cursor(line.from)
            });
            return true;
        }

        // Insert new bullet item
        const newItem = `\n${indent}${marker} `;
        view.dispatch({
            changes: { from, to: from, insert: newItem },
            selection: EditorSelection.cursor(from + newItem.length)
        });
        return true;
    }

    // Not a list item, let default behavior handle it
    return false;
}

export const smartLists = keymap.of([
    {
        key: 'Enter',
        run: handleEnter
    }
]);
