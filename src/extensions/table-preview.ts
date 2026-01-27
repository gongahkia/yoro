import {
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';

class TableWidget extends WidgetType {
    readonly tableText: string;

    constructor(tableText: string) {
        super();
        this.tableText = tableText;
    }

    eq(other: TableWidget) {
        return other.tableText === this.tableText;
    }

    toDOM() {
        const { header, data, alignments } = this.parseTable(this.tableText);

        const table = document.createElement('table');
        table.className = 'cm-table-widget';

        // Create header row
        if (header.length > 0) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            header.forEach((cell, i) => {
                const th = document.createElement('th');
                th.textContent = cell;
                if (alignments[i]) {
                    th.style.textAlign = alignments[i];
                }
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
        }

        // Create body rows
        if (data.length > 0) {
            const tbody = document.createElement('tbody');
            data.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach((cell, i) => {
                    const td = document.createElement('td');
                    td.textContent = cell;
                    if (alignments[i]) {
                        td.style.textAlign = alignments[i];
                    }
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'cm-table-wrapper';
        wrapper.appendChild(table);

        return wrapper;
    }

    parseTable(text: string): { header: string[]; data: string[][]; alignments: string[] } {
        const lines = text.trim().split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            return { header: [], data: [], alignments: [] };
        }

        const parseRow = (line: string): string[] => {
            // Split by | and remove empty first/last elements from leading/trailing |
            const cells = line.split('|');
            // If line starts with |, first element is empty; if ends with |, last is empty
            const trimmedCells = cells.slice(
                cells[0].trim() === '' ? 1 : 0,
                cells[cells.length - 1].trim() === '' ? -1 : undefined
            );
            return trimmedCells.map(cell => cell.trim());
        };

        const header = parseRow(lines[0]);

        // Parse alignments from separator row
        const separatorCells = parseRow(lines[1]);
        const alignments = separatorCells.map(cell => {
            const trimmed = cell.trim();
            const leftColon = trimmed.startsWith(':');
            const rightColon = trimmed.endsWith(':');
            if (leftColon && rightColon) return 'center';
            if (rightColon) return 'right';
            return 'left';
        });

        // Parse data rows (skip header and separator)
        const data = lines.slice(2).map(line => parseRow(line));

        return { header, data, alignments };
    }
}

class TablePreviewPlugin {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.computeDecorations(update.view);
        }
    }

    computeDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = [];
        const { state } = view;
        const selection = state.selection.main;

        for (const { from, to } of view.visibleRanges) {
            syntaxTree(state).iterate({
                from,
                to,
                enter: (node) => {
                    if (node.name === 'Table') {
                        const tableFrom = node.from;
                        const tableTo = node.to;

                        // Check if cursor is within table
                        const isFocused = (selection.from >= tableFrom && selection.from <= tableTo) ||
                            (selection.to >= tableFrom && selection.to <= tableTo);

                        if (!isFocused) {
                            const tableText = state.sliceDoc(tableFrom, tableTo);
                            widgets.push(Decoration.replace({
                                widget: new TableWidget(tableText)
                            }).range(tableFrom, tableTo));
                        }
                    }
                }
            });
        }

        return Decoration.set(widgets, true);
    }
}

export const tablePreview = ViewPlugin.fromClass(TablePreviewPlugin, {
    decorations: (v) => v.decorations,
});
