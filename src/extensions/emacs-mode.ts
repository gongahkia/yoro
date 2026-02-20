import { keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import {
    cursorCharLeft, cursorCharRight,
    cursorLineUp, cursorLineDown,
    cursorLineStart, cursorLineEnd,
    selectCharLeft, selectCharRight,
    selectLineUp, selectLineDown,
    cursorDocStart, cursorDocEnd,
    cursorPageUp, cursorPageDown,
    selectAll, deleteCharBackward, deleteCharForward,
    cursorGroupForward, cursorGroupBackward,
    selectGroupForward, selectGroupBackward,
    deleteGroupBackward, deleteGroupForward
} from '@codemirror/commands';
import { undo, redo } from '@codemirror/commands';
import { openSearchPanel, closeSearchPanel } from '@codemirror/search';
import type { KeyBinding } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';

// Simple kill ring implementation
const killRing: string[] = [];
let lastKillPos: number | null = null;

const killToLineEnd = (view: EditorView): boolean => {
    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const endPos = line.to;

    // If cursor is at end of line, kill the newline
    if (from === endPos) {
        if (from < view.state.doc.length) {
            const text = '\n';
            // Append to kill ring if consecutive kill
            if (lastKillPos === from && killRing.length > 0) {
                killRing[killRing.length - 1] += text;
            } else {
                killRing.push(text);
                if (killRing.length > 10) killRing.shift();
            }
            lastKillPos = from;
            view.dispatch({
                changes: { from, to: from + 1 }
            });
            return true;
        }
        return false;
    }

    // Kill to end of line
    const text = view.state.sliceDoc(from, endPos);
    // Append to kill ring if consecutive kill
    if (lastKillPos === from && killRing.length > 0) {
        killRing[killRing.length - 1] += text;
    } else {
        killRing.push(text);
        if (killRing.length > 10) killRing.shift();
    }
    lastKillPos = from;

    view.dispatch({
        changes: { from, to: endPos }
    });
    return true;
};

const yank = (view: EditorView): boolean => {
    if (killRing.length === 0) return false;
    const text = killRing[killRing.length - 1];
    const { from } = view.state.selection.main;
    view.dispatch({
        changes: { from, to: from, insert: text },
        selection: EditorSelection.cursor(from + text.length)
    });
    lastKillPos = null;
    return true;
};

const killRegion = (view: EditorView): boolean => {
    const { from, to } = view.state.selection.main;
    if (from === to) return false;
    const text = view.state.sliceDoc(from, to);
    killRing.push(text);
    if (killRing.length > 10) killRing.shift();
    view.dispatch({
        changes: { from, to },
        selection: EditorSelection.cursor(from)
    });
    lastKillPos = null;
    return true;
};

const copyRegion = (view: EditorView): boolean => {
    const { from, to } = view.state.selection.main;
    if (from === to) return false;
    const text = view.state.sliceDoc(from, to);
    killRing.push(text);
    if (killRing.length > 10) killRing.shift();
    // Deselect
    view.dispatch({
        selection: EditorSelection.cursor(to)
    });
    lastKillPos = null;
    return true;
};

const setMark = (view: EditorView): boolean => {
    // Toggle selection mode - if already selecting, deselect
    const { from, to } = view.state.selection.main;
    if (from !== to) {
        view.dispatch({
            selection: EditorSelection.cursor(to)
        });
    }
    // Mark is implicitly set - Shift+movement will select
    return true;
};

const cancelCommand = (view: EditorView): boolean => {
    // Cancel current selection
    const { head } = view.state.selection.main;
    view.dispatch({
        selection: EditorSelection.cursor(head)
    });
    closeSearchPanel(view);
    return true;
};

const transposeChars = (view: EditorView): boolean => {
    const { from } = view.state.selection.main;
    if (from < 1) return false;
    const line = view.state.doc.lineAt(from);
    if (from <= line.from) return false;

    const end = from < line.to ? from + 1 : from;
    const start = end - 2;
    if (start < line.from) return false;

    const chars = view.state.sliceDoc(start, end);
    if (chars.length < 2) return false;

    view.dispatch({
        changes: { from: start, to: end, insert: chars[1] + chars[0] },
        selection: EditorSelection.cursor(end)
    });
    return true;
};

const openLine = (view: EditorView): boolean => {
    const { from } = view.state.selection.main;
    view.dispatch({
        changes: { from, to: from, insert: '\n' }
    });
    return true;
};

export const emacsKeymap: KeyBinding[] = [
    // Movement
    { key: 'Ctrl-f', run: cursorCharRight },
    { key: 'Ctrl-b', run: cursorCharLeft },
    { key: 'Ctrl-n', run: cursorLineDown },
    { key: 'Ctrl-p', run: cursorLineUp },
    { key: 'Ctrl-a', run: cursorLineStart },
    { key: 'Ctrl-e', run: cursorLineEnd },

    // Word movement
    { key: 'Alt-f', run: cursorGroupForward },
    { key: 'Alt-b', run: cursorGroupBackward },

    // Document movement
    { key: 'Alt-<', run: cursorDocStart },
    { key: 'Alt->', run: cursorDocEnd },
    { key: 'Ctrl-v', run: cursorPageDown },
    { key: 'Alt-v', run: cursorPageUp },

    // Selection
    { key: 'Ctrl-Shift-f', run: selectCharRight },
    { key: 'Ctrl-Shift-b', run: selectCharLeft },
    { key: 'Ctrl-Shift-n', run: selectLineDown },
    { key: 'Ctrl-Shift-p', run: selectLineUp },
    { key: 'Alt-Shift-f', run: selectGroupForward },
    { key: 'Alt-Shift-b', run: selectGroupBackward },

    // Kill/Yank
    { key: 'Ctrl-k', run: killToLineEnd },
    { key: 'Ctrl-y', run: yank },
    { key: 'Ctrl-w', run: killRegion },
    { key: 'Alt-w', run: copyRegion },

    // Delete
    { key: 'Ctrl-d', run: deleteCharForward },
    { key: 'Ctrl-h', run: deleteCharBackward },
    { key: 'Alt-d', run: deleteGroupForward },
    { key: 'Alt-Backspace', run: deleteGroupBackward },

    // Edit
    { key: 'Ctrl-t', run: transposeChars },
    { key: 'Ctrl-o', run: openLine },

    // Mark
    { key: 'Ctrl-Space', run: setMark },
    { key: 'Ctrl-x h', run: selectAll },

    // Undo/Redo
    { key: 'Ctrl-/', run: undo },
    { key: 'Ctrl-_', run: undo },
    { key: 'Ctrl-Shift-/', run: redo },
    { key: 'Ctrl-x u', run: undo },

    // Search
    { key: 'Ctrl-s', run: openSearchPanel },
    { key: 'Ctrl-r', run: openSearchPanel },

    // Cancel
    { key: 'Ctrl-g', run: cancelCommand },
];

export const emacsMode = keymap.of(emacsKeymap);
