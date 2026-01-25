import { hoverTooltip } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

export const footnoteTooltip = hoverTooltip((view, pos) => {
    const { state } = view;
    const tree = syntaxTree(state);
    let node = tree.resolveInner(pos, -1);

    // Check if we are hovering over a footnote reference
    if (node.name !== 'FootnoteReference') {
        node = tree.resolveInner(pos, 1);
        if (node.name !== 'FootnoteReference') return null;
    }

    // Get the reference text (e.g., "[^1]")
    const refText = state.sliceDoc(node.from, node.to);
    
    // Find the corresponding definition
    // Since we don't have a FootnoteDefinition parser, we search line by line
    // for a line starting with "refText:" (e.g. "[^1]:")
    let defContent = '';
    let found = false;
    
    // Iterate over all lines in the doc
    // Note: optimization needed for very large docs, but okay for now
    for (let i = 1; i <= state.doc.lines; i++) {
        const line = state.doc.line(i);
        if (line.text.trim().startsWith(refText + ':')) {
            defContent = line.text.trim().slice(refText.length + 1).trim();
            found = true;
            break;
        }
    }

    if (!found) return null;

    return {
        pos: node.from,
        end: node.to,
        above: true,
        create() {
            const dom = document.createElement('div');
            dom.className = 'cm-footnote-tooltip';
            dom.textContent = defContent;
            return { dom };
        }
    };
});
