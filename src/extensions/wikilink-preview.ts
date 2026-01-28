import { hoverTooltip } from '@codemirror/view';
import type { Note } from '../types';

export const createWikilinkPreview = (notes: Note[], _onNavigate: (id: string) => void) => {
    return hoverTooltip((view, pos) => {
        const { state } = view;
        const doc = state.doc.toString();

        // Find wikilink at position using simple approach
        const actualStart = doc.lastIndexOf('[[', pos);
        const actualEnd = doc.indexOf(']]', pos);

        if (actualStart === -1 || actualEnd === -1 || actualEnd < actualStart) return null;
        if (pos < actualStart || pos > actualEnd + 2) return null;

        // Check there's no newline between [[ and ]]
        const linkContent = doc.slice(actualStart, actualEnd + 2);
        if (linkContent.includes('\n')) return null;

        const title = doc.slice(actualStart + 2, actualEnd).trim();
        if (!title) return null;

        // Find the matching note
        const note = notes.find(n => (n.title || 'Untitled') === title);
        if (!note) return null;

        // Get first 3 lines of content for preview, skipping frontmatter
        const lines = note.content.split('\n');
        const previewLines: string[] = [];
        let inFrontmatter = false;
        let frontmatterClosed = false;

        for (const line of lines) {
            if (previewLines.length >= 3) break;

            const trimmed = line.trim();

            // Handle frontmatter
            if (trimmed === '---') {
                if (!frontmatterClosed && !inFrontmatter) {
                    inFrontmatter = true;
                    continue;
                } else if (inFrontmatter) {
                    inFrontmatter = false;
                    frontmatterClosed = true;
                    continue;
                }
            }

            if (inFrontmatter) continue;
            if (trimmed) previewLines.push(trimmed);
        }

        const preview = previewLines.join('\n') || '(Empty note)';

        return {
            pos: actualStart,
            end: actualEnd + 2,
            above: true,
            create() {
                const dom = document.createElement('div');
                dom.className = 'cm-wikilink-preview';

                const titleEl = document.createElement('div');
                titleEl.className = 'cm-wikilink-preview-title';
                titleEl.textContent = note.title || 'Untitled';
                dom.appendChild(titleEl);

                const contentEl = document.createElement('div');
                contentEl.className = 'cm-wikilink-preview-content';
                contentEl.textContent = preview;
                dom.appendChild(contentEl);

                const openLink = document.createElement('div');
                openLink.className = 'cm-wikilink-preview-link';
                openLink.textContent = 'Cmd+Click to open';
                openLink.style.fontSize = '0.8em';
                openLink.style.opacity = '0.6';
                openLink.style.marginTop = '6px';
                dom.appendChild(openLink);

                return { dom };
            }
        };
    }, { hoverTime: 200 });
};
