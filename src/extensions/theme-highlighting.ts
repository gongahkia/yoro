import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';

const themeHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: 'var(--syntax-keyword)' },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: 'var(--syntax-variable)' },
    { tag: [t.function(t.variableName), t.labelName], color: 'var(--syntax-function)' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: 'var(--syntax-constant)' },
    { tag: [t.definition(t.name), t.separator], color: 'var(--syntax-variable)' },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: 'var(--syntax-type)' },
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: 'var(--syntax-operator)' },
    { tag: [t.meta, t.comment], color: 'var(--syntax-comment)' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: 'var(--syntax-link)', textDecoration: 'underline' },
    { tag: t.heading, fontWeight: 'bold', color: 'var(--syntax-heading)' },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: 'var(--syntax-constant)' },
    { tag: [t.processingInstruction, t.string, t.inserted], color: 'var(--syntax-string)' },
    { tag: t.invalid, color: 'var(--syntax-invalid)' },
]);

// Base theme extension for selection highlighting (higher priority than scoped themes)
const selectionTheme = EditorView.baseTheme({
    // Selection background - use high specificity selectors
    '&.cm-editor .cm-selectionBackground': {
        backgroundColor: 'var(--selection-bg, rgba(0, 123, 255, 0.3)) !important',
    },
    '&.cm-editor.cm-focused .cm-selectionBackground': {
        backgroundColor: 'var(--selection-bg, rgba(0, 123, 255, 0.3)) !important',
    },
    // Selection layer (used in vim visual line mode)
    '&.cm-editor .cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: 'var(--selection-bg, rgba(0, 123, 255, 0.3)) !important',
    },
    // Content styling
    '&.cm-editor .cm-content': {
        caretColor: 'var(--caret-color, var(--text-primary))',
    },
    // Cursor styling
    '&.cm-editor .cm-cursor, &.cm-editor .cm-dropCursor': {
        borderLeftColor: 'var(--caret-color, var(--text-primary))',
    },
});

export const themeSyntaxHighlighting = [
    syntaxHighlighting(themeHighlightStyle, { fallback: true }),
    selectionTheme,
];
