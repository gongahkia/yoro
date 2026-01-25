import type { Extension } from '@codemirror/state';
import { markdownLanguage } from '@codemirror/lang-markdown';

export const markdownPairs: Extension = markdownLanguage.data.of({
    closeBrackets: { brackets: ["(", "[", "{", "'", '"', "`", "*", "_"] }
});
