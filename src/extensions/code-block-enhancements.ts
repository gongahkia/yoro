import {
    Decoration,
    EditorView,
    WidgetType,
    ViewPlugin,
    type ViewUpdate,
    type DecorationSet,
} from '@codemirror/view';
import { type Range } from '@codemirror/state';

// Language display names
const languageNames: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    jsx: 'JSX',
    tsx: 'TSX',
    py: 'Python',
    python: 'Python',
    rb: 'Ruby',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    rs: 'Rust',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    'c++': 'C++',
    cs: 'C#',
    csharp: 'C#',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    kt: 'Kotlin',
    scala: 'Scala',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
    toml: 'TOML',
    md: 'Markdown',
    markdown: 'Markdown',
    sql: 'SQL',
    sh: 'Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    powershell: 'PowerShell',
    ps1: 'PowerShell',
    dockerfile: 'Dockerfile',
    docker: 'Docker',
    makefile: 'Makefile',
    make: 'Makefile',
    nginx: 'Nginx',
    apache: 'Apache',
    graphql: 'GraphQL',
    gql: 'GraphQL',
    lua: 'Lua',
    perl: 'Perl',
    r: 'R',
    matlab: 'MATLAB',
    julia: 'Julia',
    haskell: 'Haskell',
    hs: 'Haskell',
    elixir: 'Elixir',
    ex: 'Elixir',
    erlang: 'Erlang',
    erl: 'Erlang',
    clojure: 'Clojure',
    clj: 'Clojure',
    lisp: 'Lisp',
    scheme: 'Scheme',
    ocaml: 'OCaml',
    ml: 'ML',
    fsharp: 'F#',
    fs: 'F#',
    vim: 'Vim Script',
    viml: 'Vim Script',
    tex: 'LaTeX',
    latex: 'LaTeX',
    diff: 'Diff',
    patch: 'Patch',
    ini: 'INI',
    cfg: 'Config',
    conf: 'Config',
    env: 'Environment',
    prisma: 'Prisma',
    proto: 'Protocol Buffers',
    protobuf: 'Protocol Buffers',
    terraform: 'Terraform',
    tf: 'Terraform',
    hcl: 'HCL',
    mermaid: 'Mermaid',
    plantuml: 'PlantUML',
    text: 'Plain Text',
    txt: 'Plain Text',
    plaintext: 'Plain Text',
};

// Get display name for language
function getLanguageDisplayName(lang: string): string {
    const lower = lang.toLowerCase().trim();
    return languageNames[lower] || (lang.charAt(0).toUpperCase() + lang.slice(1));
}

// Widget for code block header (language label + copy button)
class CodeBlockHeaderWidget extends WidgetType {
    readonly language: string;
    readonly code: string;
    readonly blockStart: number;

    constructor(language: string, code: string, blockStart: number) {
        super();
        this.language = language;
        this.code = code;
        this.blockStart = blockStart;
    }

    eq(other: CodeBlockHeaderWidget) {
        return other.language === this.language &&
               other.code === this.code &&
               other.blockStart === this.blockStart;
    }

    toDOM() {
        const header = document.createElement('div');
        header.className = 'cm-code-block-header';

        // Language label
        if (this.language) {
            const langLabel = document.createElement('span');
            langLabel.className = 'cm-code-block-lang';
            langLabel.textContent = getLanguageDisplayName(this.language);
            header.appendChild(langLabel);
        }

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.flex = '1';
        header.appendChild(spacer);

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'cm-code-block-copy';
        copyBtn.title = 'Copy code';
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>`;

        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(this.code).then(() => {
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>`;
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>`;
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });

        header.appendChild(copyBtn);

        return header;
    }

    ignoreEvent() { return false; }
}

// Widget for line number gutter within code blocks
class CodeBlockLineNumberWidget extends WidgetType {
    readonly lineNum: number;

    constructor(lineNum: number) {
        super();
        this.lineNum = lineNum;
    }

    eq(other: CodeBlockLineNumberWidget) {
        return other.lineNum === this.lineNum;
    }

    toDOM() {
        const span = document.createElement('span');
        span.className = 'cm-code-block-line-number';
        span.textContent = String(this.lineNum);
        return span;
    }

    ignoreEvent() { return true; }
}

// Parse code blocks from document
interface CodeBlock {
    start: number;
    end: number;
    language: string;
    code: string;
    codeStart: number;
    codeEnd: number;
}

function parseCodeBlocks(docString: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const regex = /```(\w*)\s*\n([\s\S]*?)```/g;

    let match;
    while ((match = regex.exec(docString)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const language = match[1] || '';
        const code = match[2];

        // Calculate code content position (after ```language\n)
        const headerLength = match[1] ? match[1].length + 4 : 4; // ``` + lang + \n
        const codeStart = start + headerLength;
        const codeEnd = end - 3; // Before closing ```

        // Skip mermaid blocks (handled by mermaid extension)
        if (language.toLowerCase() === 'mermaid') continue;

        blocks.push({
            start,
            end,
            language,
            code,
            codeStart,
            codeEnd
        });
    }

    return blocks;
}

// Create decorations for code blocks
function createCodeBlockDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const docString = view.state.doc.toString();
    const blocks = parseCodeBlocks(docString);

    for (const block of blocks) {
        // Add header widget at the start of the code block
        const headerWidget = Decoration.widget({
            widget: new CodeBlockHeaderWidget(block.language, block.code, block.start),
            side: 1, // After the position
        });
        decorations.push(headerWidget.range(block.start));

        // Mark the entire code block for styling
        decorations.push(
            Decoration.mark({ class: 'cm-code-block-enhanced' }).range(block.start, block.end)
        );

        // Add line numbers for each line of code
        const codeLines = block.code.split('\n');
        let lineOffset = block.codeStart;

        for (let i = 0; i < codeLines.length; i++) {
            const lineNum = i + 1;
            const lineWidget = Decoration.widget({
                widget: new CodeBlockLineNumberWidget(lineNum),
                side: -1, // Before the position
            });
            decorations.push(lineWidget.range(lineOffset));

            // Move to next line (line content + newline)
            lineOffset += codeLines[i].length + 1;
        }
    }

    // Sort decorations by position
    decorations.sort((a, b) => a.from - b.from);

    return Decoration.set(decorations, true);
}

// View plugin for code block enhancements
const codeBlockPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = createCodeBlockDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = createCodeBlockDecorations(update.view);
            }
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

// Theme styles for code block enhancements
const codeBlockTheme = EditorView.baseTheme({
    '.cm-code-block-header': {
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        backgroundColor: 'var(--bg-secondary, rgba(0, 0, 0, 0.05))',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
        marginBottom: '-1px',
        fontSize: '0.8em',
        fontFamily: 'system-ui, sans-serif',
    },
    '.cm-code-block-lang': {
        color: 'var(--text-primary, #333)',
        opacity: '0.7',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontSize: '0.75em',
    },
    '.cm-code-block-copy': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-primary, #333)',
        opacity: '0.5',
        cursor: 'pointer',
        borderRadius: '4px',
        transition: 'opacity 0.15s ease, background-color 0.15s ease',
    },
    '.cm-code-block-copy:hover': {
        opacity: '1',
        backgroundColor: 'var(--primary-light, rgba(0, 123, 255, 0.1))',
    },
    '.cm-code-block-copy.copied': {
        color: 'var(--primary, #007bff)',
        opacity: '1',
    },
    '.cm-code-block-line-number': {
        display: 'inline-block',
        width: '2.5em',
        textAlign: 'right',
        paddingRight: '0.75em',
        marginRight: '0.5em',
        color: 'var(--editor-gutter-text, #999)',
        fontSize: '0.85em',
        userSelect: 'none',
        borderRight: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
    },
    '.cm-code-block-enhanced': {
        display: 'block',
    },
});

export const codeBlockEnhancements = [codeBlockPlugin, codeBlockTheme];
