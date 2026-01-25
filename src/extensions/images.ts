import { EditorView } from '@codemirror/view';

export const handleImageEvents = EditorView.domEventHandlers({
    paste(event, view) {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    readAndInsertImage(file, view);
                }
            }
        }
    },
    drop(event, view) {
        const items = event.dataTransfer?.items;
        if (!items) return;

        for (const item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    readAndInsertImage(file, view);
                }
            }
        }
    }
});

function readAndInsertImage(file: File, view: EditorView) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
            const markdown = `![${file.name}](${result})`;
            view.dispatch(view.state.replaceSelection(markdown));
        }
    };
    reader.readAsDataURL(file);
}
