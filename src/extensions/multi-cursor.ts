import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

// Select next occurrence of the current word/selection (Cmd+D)
function selectNextOccurrence(view: EditorView): boolean {
    const { state } = view;
    const { main } = state.selection;

    // Get the word or selection to search for
    let searchText: string;
    let searchFrom: number;

    if (main.empty) {
        // No selection, select the word at cursor
        const word = state.wordAt(main.head);
        if (!word) return false;

        // Select the current word first
        view.dispatch({
            selection: EditorSelection.single(word.from, word.to)
        });
        return true;
    }

    // Get the selected text
    searchText = state.sliceDoc(main.from, main.to);
    if (!searchText) return false;

    // Find the last selection to know where to search from
    const ranges = state.selection.ranges;
    const lastRange = ranges[ranges.length - 1];
    searchFrom = lastRange.to;

    // Search for the next occurrence
    const docText = state.doc.toString();
    let nextIndex = docText.indexOf(searchText, searchFrom);

    // Wrap around if not found
    if (nextIndex === -1) {
        nextIndex = docText.indexOf(searchText);
    }

    // Check if we found a new occurrence (not already selected)
    if (nextIndex === -1) return false;

    // Check if this position is already in a selection
    const alreadySelected = ranges.some(r =>
        r.from === nextIndex && r.to === nextIndex + searchText.length
    );

    if (alreadySelected) {
        // Try to find another occurrence
        const tempIndex = docText.indexOf(searchText, nextIndex + 1);
        if (tempIndex !== -1 && !ranges.some(r => r.from === tempIndex)) {
            nextIndex = tempIndex;
        } else {
            return false; // All occurrences selected
        }
    }

    // Add a new selection range
    const newRange = EditorSelection.range(nextIndex, nextIndex + searchText.length);
    const newSelection = state.selection.addRange(newRange);

    view.dispatch({
        selection: newSelection,
        scrollIntoView: true
    });

    return true;
}

// Add cursor at click position (for Cmd+Click)
const addCursorOnClick = EditorView.domEventHandlers({
    mousedown(event, view) {
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
            event.preventDefault();

            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos === null) return false;

            const { state } = view;
            const newRange = EditorSelection.cursor(pos);

            // Add to existing selection
            const newSelection = state.selection.addRange(newRange);

            view.dispatch({
                selection: newSelection
            });

            return true;
        }
        return false;
    }
});

// Keymap for Cmd+D
const multiCursorKeymap = keymap.of([
    {
        key: 'Mod-d',
        run: selectNextOccurrence,
        preventDefault: true
    }
]);

// Combined multi-cursor extension
export const multiCursorExtension: Extension = [
    addCursorOnClick,
    multiCursorKeymap,
    // Allow multiple selections
    EditorView.theme({
        '.cm-selectionBackground': {
            backgroundColor: 'var(--selection-bg, rgba(0, 123, 255, 0.3)) !important'
        }
    })
];
