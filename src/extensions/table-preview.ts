import {
    Decoration,
    EditorView,
    WidgetType,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { StateField } from '@codemirror/state';

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
            const cells = line.split('|');
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

    ignoreEvent() {
        return false;
    }
}

// Use StateField for multi-line decorations (required by CodeMirror for line-spanning replacements)
export const tablePreview = StateField.define<DecorationSet>({
    create(state) {
        return computeTableDecorations(state);
    },
    update(decorations, tr) {
        if (tr.docChanged || tr.selection) {
            return computeTableDecorations(tr.state);
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});

function computeTableDecorations(state: import('@codemirror/state').EditorState): DecorationSet {
    const widgets: { from: number; to: number; decoration: Decoration }[] = [];
    const selection = state.selection.main;

    syntaxTree(state).iterate({
        enter: (node) => {
            if (node.name === 'Table') {
                const tableFrom = node.from;
                const tableTo = node.to;

                // Check if cursor is within table (including the line the table is on)
                const fromLine = state.doc.lineAt(tableFrom);
                const toLine = state.doc.lineAt(tableTo);

                const isFocused = (selection.from >= fromLine.from && selection.from <= toLine.to) ||
                    (selection.to >= fromLine.from && selection.to <= toLine.to);

                if (!isFocused) {
                    const tableText = state.sliceDoc(tableFrom, tableTo);
                    widgets.push({
                        from: tableFrom,
                        to: tableTo,
                        decoration: Decoration.replace({
                            widget: new TableWidget(tableText),
                            block: true
                        })
                    });
                }
            }
        }
    });

    // Sort by from position (required by CodeMirror)
    widgets.sort((a, b) => a.from - b.from);

    return Decoration.set(widgets.map(w => w.decoration.range(w.from, w.to)));
}
