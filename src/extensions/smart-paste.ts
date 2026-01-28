import { EditorView } from '@codemirror/view';

export const smartPaste = EditorView.domEventHandlers({
    paste(event, view) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return;

        const text = clipboardData.getData('text/plain');
        const { state } = view;
        const { selection } = state;
        const { from, to } = selection.main;
        const selectedText = state.sliceDoc(from, to);

        // 1. Paste URL on selected text
        const urlRegex = /^(https?:\/\/[^\s]+)$/;
        if (selectedText && selectedText.trim().length > 0 && text.match(urlRegex)) {
            event.preventDefault();
            const markdownLink = `[${selectedText}](${text.trim()})`;
            view.dispatch({
                changes: { from, to, insert: markdownLink },
                selection: { anchor: from + markdownLink.length }
            });
            return;
        }

        // 2. Paste Image
        if (clipboardData.files && clipboardData.files.length > 0) {
            const file = clipboardData.files[0];
            if (file.type.startsWith('image/')) {
                event.preventDefault();
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    if (result) {
                        const imageMarkdown = `![](${result})`;
                        view.dispatch({
                            changes: { from, to, insert: imageMarkdown },
                            selection: { anchor: from + imageMarkdown.length }
                        });
                    }
                };
                reader.readAsDataURL(file);
                return;
            }
        }
    }
});
