import { EditorView, ViewUpdate } from '@codemirror/view';

export const typewriterMode = EditorView.updateListener.of((update: ViewUpdate) => {
    // Only trigger on selection changes (cursor movement)
    if (!update.selectionSet) return;

    const { view } = update;
    const { state } = view;
    const selection = state.selection.main;

    // Get cursor position in the document
    const cursorPos = selection.head;

    // Get the coordinates of the cursor
    const coords = view.coordsAtPos(cursorPos);
    if (!coords) return;

    // Get the editor's scroll container
    const scrollDOM = view.scrollDOM;
    const scrollRect = scrollDOM.getBoundingClientRect();

    // Calculate the target position (center of the viewport)
    const targetY = scrollRect.height / 2;

    // Current cursor Y position relative to viewport
    const cursorY = coords.top - scrollRect.top;

    // Calculate how much to scroll to center the cursor
    const scrollOffset = cursorY - targetY;

    // Only scroll if the cursor is significantly off-center (avoid jitter)
    if (Math.abs(scrollOffset) > 20) {
        scrollDOM.scrollBy({
            top: scrollOffset,
            behavior: 'smooth'
        });
    }
});
