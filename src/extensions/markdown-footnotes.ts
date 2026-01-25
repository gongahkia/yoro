import { type MarkdownConfig, InlineContext } from "@lezer/markdown";

export const FootnoteExtension: MarkdownConfig = {
    defineNodes: ["FootnoteReference"],
    parseInline: [{
        name: "FootnoteReference",
        parse(cx: InlineContext, next: number, pos: number) {
            // Match [^...]
            if (next !== 91 /* '[' */ || cx.char(pos + 1) !== 94 /* '^' */) return -1;
            let i = pos + 2;
            // Scan for closing ]
            // We should strictly not allow spaces or newlines in the label usually, or maybe we do?
            // Standard MD allows some chars. Let's just look for ]
            for (; i < cx.end; i++) {
                const char = cx.char(i);
                if (char === 93 /* ']' */) {
                     return cx.addElement(cx.elt("FootnoteReference", pos, i + 1));
                }
                if (char === 10 /* \n */) return -1; // No newlines in reference
            }
            return -1;
        }
    }]
};
