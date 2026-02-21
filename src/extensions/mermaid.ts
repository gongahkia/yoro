import {
    Decoration,
    EditorView,
    WidgetType,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { StateField, type Range } from '@codemirror/state';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

// Helper to get CSS variable value from current theme
const getCSSVar = (name: string, fallback: string): string => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
};

// Get mermaid theme configuration from current CSS variables
const getMermaidThemeConfig = () => {
    const bgPrimary = getCSSVar('--bg-primary', '#1a1a2e');
    const bgSecondary = getCSSVar('--bg-secondary', '#252542');
    const textPrimary = getCSSVar('--text-primary', '#e0e0e0');
    const primary = getCSSVar('--primary', '#6c63ff');
    const primaryLight = getCSSVar('--primary-light', 'rgba(108, 99, 255, 0.1)');
    const borderColor = getCSSVar('--border-color', '#3a3a5c');
    const syntaxKeyword = getCSSVar('--syntax-keyword', '#c792ea');
    const syntaxString = getCSSVar('--syntax-string', '#c3e88d');
    const syntaxFunction = getCSSVar('--syntax-function', '#82aaff');
    const syntaxVariable = getCSSVar('--syntax-variable', '#f78c6c');
    const syntaxComment = getCSSVar('--syntax-comment', '#676e95');

    return {
        theme: 'base' as const,
        themeVariables: {
            // General
            background: bgPrimary,
            primaryColor: primary,
            primaryTextColor: textPrimary,
            primaryBorderColor: borderColor,
            secondaryColor: bgSecondary,
            secondaryTextColor: textPrimary,
            secondaryBorderColor: borderColor,
            tertiaryColor: primaryLight,
            tertiaryTextColor: textPrimary,
            tertiaryBorderColor: borderColor,

            // Text
            textColor: textPrimary,
            titleColor: textPrimary,

            // Lines and borders
            lineColor: borderColor,
            mainBkg: bgSecondary,

            // Flowchart
            nodeBorder: borderColor,
            nodeTextColor: textPrimary,
            clusterBkg: primaryLight,
            clusterBorder: borderColor,
            defaultLinkColor: syntaxComment,
            edgeLabelBackground: bgPrimary,

            // State diagram
            labelColor: textPrimary,
            altBackground: bgSecondary,
            fillType0: primary,
            fillType1: syntaxFunction,
            fillType2: syntaxString,
            fillType3: syntaxVariable,
            fillType4: syntaxKeyword,

            // Flowchart node colors
            nodeBkg: bgSecondary,
            border1: primary,
            border2: syntaxFunction,
            arrowheadColor: textPrimary,

            // Mindmap
            mindmapBackground: bgPrimary,

            // Class diagram
            classText: textPrimary,

            // State colors
            labelBackgroundColor: bgPrimary,
            compositeBackground: bgSecondary,
            compositeBorder: borderColor,
            innerEndBackground: primary,
            specialStateColor: syntaxKeyword,

            // Notes
            noteBkgColor: primaryLight,
            noteTextColor: textPrimary,
            noteBorderColor: borderColor,

            // Actors (sequence diagrams)
            actorBkg: bgSecondary,
            actorBorder: borderColor,
            actorTextColor: textPrimary,
            actorLineColor: borderColor,

            // Signals
            signalColor: textPrimary,
            signalTextColor: textPrimary,

            // Git graph
            git0: primary,
            git1: syntaxFunction,
            git2: syntaxString,
            git3: syntaxVariable,
            git4: syntaxKeyword,
            gitBranchLabel0: textPrimary,
            gitBranchLabel1: textPrimary,
            gitBranchLabel2: textPrimary,
            gitInv0: bgPrimary,
        },
    };
};

// Helper to parse mermaid error messages
const parseMermaidError = (error: unknown, code: string): { message: string; line?: number; details?: string } => {
    const errorStr = error instanceof Error ? error.message : String(error);

    // Try to extract line number from error message
    const lineMatch = errorStr.match(/line\s*(\d+)/i);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

    // Get the problematic line from code if we have a line number
    let details: string | undefined;
    if (line !== undefined) {
        const lines = code.split('\n');
        if (line > 0 && line <= lines.length) {
            details = `Line ${line}: "${lines[line - 1].trim()}"`;
        }
    }

    return { message: errorStr, line, details };
};

class MermaidWidget extends WidgetType {
    readonly code: string;

    constructor(code: string) {
        super();
        this.code = code;
    }

    eq(other: MermaidWidget) {
        return other.code === this.code;
    }

    toDOM() {
        const container = document.createElement('div');
        container.className = 'cm-mermaid-widget';
        // defer render until visible in viewport
        const observer = new IntersectionObserver((entries, obs) => {
            if (entries[0].isIntersecting) {
                obs.disconnect();
                this.renderMermaid(container);
            }
        }, { threshold: 0.01 });
        observer.observe(container);
        return container;
    }

    private async renderMermaid(container: HTMLElement) {
        try {
            // Reinitialize mermaid with current theme colors before each render
            const themeConfig = getMermaidThemeConfig();
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                fontFamily: 'inherit',
                ...themeConfig,
            });

            // Use a unique ID for each render to avoid conflicts
            const uniqueId = `mermaid-render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(uniqueId, this.code);
            container.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
        } catch (error) {
            const parsed = parseMermaidError(error, this.code);

            // Log detailed error to console for debugging
            console.group('%c[Mermaid] Syntax Error', 'color: #ff6b6b; font-weight: bold');
            console.error('Error:', parsed.message);
            if (parsed.line !== undefined) {
                console.log('Line number:', parsed.line);
            }
            if (parsed.details) {
                console.log('Problematic line:', parsed.details);
            }
            console.log('Full mermaid code:');
            console.log(this.code);
            console.groupEnd();

            // Show toast notification
            const toastMessage = parsed.details
                ? `Mermaid syntax error: ${parsed.details}`
                : 'Mermaid syntax error. Check console for details.';
            window.dispatchEvent(new CustomEvent('yoro-toast', {
                detail: { message: toastMessage, type: 'error', duration: 5000 }
            }));

            // Show user-friendly error in the editor (sanitized)
            const errorHtml = `
                <div class="cm-mermaid-error">
                    <strong>Mermaid Syntax Error</strong>
                    ${parsed.details ? `<div style="margin-top: 4px; font-size: 0.9em;">${DOMPurify.sanitize(parsed.details)}</div>` : ''}
                    <div style="margin-top: 8px; font-size: 0.85em; opacity: 0.8;">Check console for full details</div>
                </div>
            `;
            container.innerHTML = DOMPurify.sanitize(errorHtml);
            container.classList.add('cm-mermaid-error-container');
        }
    }

    ignoreEvent() { return true; }
}

function computeMermaidDecorations(state: { doc: { toString: () => string; lineAt: (pos: number) => { number: number } }; selection: { main: { from: number; to: number } } }): DecorationSet {
    const widgets: Range<Decoration>[] = [];
    const docString = state.doc.toString();
    const selection = state.selection.main;

    // Regex to match ```mermaid ... ``` code blocks
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;

    let match;
    while ((match = mermaidRegex.exec(docString)) !== null) {
        const blockStart = match.index;
        const blockEnd = blockStart + match[0].length;
        const mermaidCode = match[1].trim();

        // Skip empty code blocks
        if (!mermaidCode) continue;

        // Check if cursor is within the mermaid block (line-based)
        const isFocused = isBlockFocused(state, selection, blockStart, blockEnd);

        if (isFocused) {
            // When focused, show the source code with a subtle highlight
            widgets.push(Decoration.mark({ class: 'cm-mermaid-source' }).range(blockStart, blockEnd));
        } else {
            // When not focused, replace with rendered diagram
            // Use block: true for multi-line replacement
            widgets.push(Decoration.replace({
                widget: new MermaidWidget(mermaidCode),
                block: true,
            }).range(blockStart, blockEnd));
        }
    }

    return Decoration.set(widgets, true);
}

function isBlockFocused(
    state: { doc: { lineAt: (pos: number) => { number: number } } },
    selection: { from: number; to: number },
    blockStart: number,
    blockEnd: number
): boolean {
    // Get line numbers for the block
    const startLine = state.doc.lineAt(blockStart).number;
    const endLine = state.doc.lineAt(blockEnd).number;

    // Get line numbers for the cursor
    const cursorLine = state.doc.lineAt(selection.from).number;
    const selectionEndLine = state.doc.lineAt(selection.to).number;

    // Check if cursor or selection intersects with the block lines
    return (cursorLine >= startLine && cursorLine <= endLine) ||
           (selectionEndLine >= startLine && selectionEndLine <= endLine) ||
           (cursorLine <= startLine && selectionEndLine >= endLine);
}

// Use StateField for decorations that can replace line breaks
const mermaidField = StateField.define<DecorationSet>({
    create(state) {
        return computeMermaidDecorations(state);
    },
    update(decorations, tr) {
        // Recompute on document changes or selection changes
        if (tr.docChanged || tr.selection) {
            return computeMermaidDecorations(tr.state);
        }
        return decorations;
    },
    provide: (field) => EditorView.decorations.from(field),
});

export const mermaidPreview = mermaidField;
