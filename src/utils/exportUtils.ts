import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { marked } from 'marked';
import katex from 'katex';
import mermaid from 'mermaid';

// Initialize mermaid for server-side rendering
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// Helper to convert KaTeX math to PNG for DOCX embedding
async function mathToPngBlob(mathExpression: string, displayMode: boolean = false): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
        try {
            const html = katex.renderToString(mathExpression.trim(), { displayMode, throwOnError: false });

            // Create a container with the rendered math
            const container = document.createElement('div');
            container.innerHTML = html;
            container.style.cssText = `
                position: absolute;
                top: -9999px;
                left: -9999px;
                font-size: ${displayMode ? '24px' : '16px'};
                padding: 10px;
                background: white;
            `;
            document.body.appendChild(container);

            // Use html2canvas to capture the math
            import('html2canvas').then(({ default: html2canvas }) => {
                html2canvas(container, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                }).then(canvas => {
                    document.body.removeChild(container);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            blob.arrayBuffer().then(buffer => {
                                resolve(new Uint8Array(buffer));
                            });
                        } else {
                            resolve(null);
                        }
                    }, 'image/png', 0.95);
                }).catch(() => {
                    document.body.removeChild(container);
                    resolve(null);
                });
            }).catch(() => {
                document.body.removeChild(container);
                resolve(null);
            });
        } catch {
            resolve(null);
        }
    });
}

// Helper to convert SVG to PNG for DOCX embedding
async function svgToPngBlob(svgString: string, width = 600, height = 400): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
        try {
            // Parse SVG to get dimensions
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const svgEl = svgDoc.documentElement;

            // Get viewBox or width/height attributes
            const viewBox = svgEl.getAttribute('viewBox');
            let svgWidth = width;
            let svgHeight = height;

            if (viewBox) {
                const parts = viewBox.split(' ').map(Number);
                if (parts.length === 4) {
                    svgWidth = parts[2];
                    svgHeight = parts[3];
                }
            } else {
                const w = svgEl.getAttribute('width');
                const h = svgEl.getAttribute('height');
                if (w) svgWidth = parseFloat(w) || width;
                if (h) svgHeight = parseFloat(h) || height;
            }

            // Scale to fit within max dimensions
            const maxWidth = 600;
            const maxHeight = 400;
            const scale = Math.min(maxWidth / svgWidth, maxHeight / svgHeight, 1);
            const finalWidth = Math.round(svgWidth * scale);
            const finalHeight = Math.round(svgHeight * scale);

            const canvas = document.createElement('canvas');
            canvas.width = finalWidth * 2; // 2x for better quality
            canvas.height = finalHeight * 2;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(null);
                return;
            }

            ctx.scale(2, 2);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, finalWidth, finalHeight);

            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
                URL.revokeObjectURL(url);

                canvas.toBlob((blob) => {
                    if (blob) {
                        blob.arrayBuffer().then(buffer => {
                            resolve(new Uint8Array(buffer));
                        });
                    } else {
                        resolve(null);
                    }
                }, 'image/png', 0.95);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };

            img.src = url;
        } catch {
            resolve(null);
        }
    });
}

// Render markdown to HTML with math and diagrams
export async function renderMarkdownToHTML(content: string, title: string): Promise<string> {
    let processed = content;

    // Block math
    processed = processed.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
        try {
            return `<div class="katex-block">${katex.renderToString(math.trim(), { displayMode: true })}</div>`;
        } catch {
            return `<pre class="math-error">${math}</pre>`;
        }
    });

    // Inline math
    processed = processed.replace(/\$([^$\n]+)\$/g, (_, math) => {
        try {
            return katex.renderToString(math.trim(), { displayMode: false });
        } catch {
            return `<code class="math-error">${math}</code>`;
        }
    });

    // Process mermaid diagrams
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    const mermaidMatches = [...processed.matchAll(mermaidRegex)];
    const mermaidSvgs: string[] = [];

    for (let i = 0; i < mermaidMatches.length; i++) {
        const match = mermaidMatches[i];
        try {
            const { svg } = await mermaid.render(`mermaid-export-${i}-${Date.now()}`, match[1].trim());
            mermaidSvgs.push(svg);
        } catch {
            mermaidSvgs.push(`<pre class="mermaid-error">${match[1]}</pre>`);
        }
    }

    let svgIndex = 0;
    processed = processed.replace(/```mermaid\n[\s\S]*?```/g, () => {
        return `<div class="mermaid-diagram">${mermaidSvgs[svgIndex++] || ''}</div>`;
    });

    // Convert markdown to HTML
    const html = await marked(processed);

    // Wrap in document with embedded styles
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #1a1a1a;
            background: white;
            font-size: 14px;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: #111;
        }
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        p { margin: 0 0 16px 0; }
        code {
            background: #f6f8fa;
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
            font-size: 0.85em;
        }
        pre {
            background: #f6f8fa;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85em;
            line-height: 1.45;
            margin: 16px 0;
        }
        pre code { background: none; padding: 0; font-size: inherit; }
        blockquote {
            border-left: 4px solid #dfe2e5;
            margin: 16px 0;
            padding: 0 16px;
            color: #6a737d;
        }
        blockquote > :first-child { margin-top: 0; }
        blockquote > :last-child { margin-bottom: 0; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
        th { background: #f6f8fa; font-weight: 600; }
        tr:nth-child(even) { background: #fafbfc; }
        img { max-width: 100%; height: auto; }
        .katex-block {
            text-align: center;
            margin: 20px 0;
            overflow-x: auto;
            padding: 10px 0;
        }
        .katex { font-size: 1.1em; }
        .mermaid-diagram {
            text-align: center;
            margin: 24px 0;
            padding: 16px;
            background: #fafbfc;
            border-radius: 8px;
        }
        .mermaid-diagram svg { max-width: 100%; height: auto; }
        ul, ol { padding-left: 2em; margin: 0 0 16px 0; }
        li { margin: 4px 0; }
        li > ul, li > ol { margin: 8px 0 0 0; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        hr { border: none; border-top: 1px solid #eaecef; margin: 24px 0; }
        .task-list-item { list-style: none; margin-left: -1.5em; }
        .task-list-item input { margin-right: 8px; vertical-align: middle; }
        strong { font-weight: 600; }
        em { font-style: italic; }
        .math-error, .mermaid-error {
            color: #cb2431;
            background: #ffeef0;
            padding: 8px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1 style="margin-top: 0;">${title}</h1>
    ${html}
</body>
</html>
    `.trim();
}

export async function exportToPDF(content: string, title: string): Promise<void> {
    // Dynamic import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;

    const html = await renderMarkdownToHTML(content, title);

    // Create an iframe for isolated rendering
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 800px;
        height: 100vh;
        border: none;
        z-index: -9999;
        opacity: 0;
        pointer-events: none;
    `;
    document.body.appendChild(iframe);

    // Write HTML to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Could not access iframe document');
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for iframe content to load
    await new Promise<void>(resolve => {
        if (iframeDoc.readyState === 'complete') {
            resolve();
        } else {
            iframe.onload = () => resolve();
        }
    });

    // Wait for images and diagrams to load
    const images = iframeDoc.querySelectorAll('img');

    await Promise.all([
        ...Array.from(images).map(img => new Promise<void>(resolve => {
            if (img.complete) resolve();
            else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
            }
        })),
        // Give SVGs and mermaid diagrams time to render
        new Promise(resolve => setTimeout(resolve, 800))
    ]);

    // Get the body element from iframe for pdf conversion
    const contentElement = iframeDoc.body;

    // Make iframe visible for rendering
    iframe.style.opacity = '1';
    iframe.style.zIndex = '9999';

    // Wait for layout
    await new Promise(resolve => setTimeout(resolve, 100));

    const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${title || 'untitled'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 800,
            windowWidth: 800,
            scrollX: 0,
            scrollY: 0,
            foreignObjectRendering: true,
        },
        jsPDF: {
            unit: 'mm' as const,
            format: 'a4' as const,
            orientation: 'portrait' as const
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(options).from(contentElement).save();
    } finally {
        document.body.removeChild(iframe);
    }
}

// Parse markdown tables for DOCX
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;

    // Check for table pattern
    const isTableLine = (line: string) => line.trim().startsWith('|') && line.trim().endsWith('|');
    const isSeparator = (line: string) => /^\|[\s:-]+\|/.test(line.trim());

    if (!isTableLine(lines[0]) || !isSeparator(lines[1])) return null;

    const parseRow = (line: string): string[] => {
        return line.split('|').slice(1, -1).map(cell => cell.trim());
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(2).filter(isTableLine).map(parseRow);

    return { headers, rows };
}

export async function exportToDOCX(content: string, title: string): Promise<void> {
    // Pre-process content to handle block math
    let processedContent = content;

    // Extract and process block math ($$...$$)
    const blockMathMatches: { original: string; placeholder: string; math: string }[] = [];
    let mathIndex = 0;
    processedContent = processedContent.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
        const placeholder = `__BLOCK_MATH_${mathIndex}__`;
        blockMathMatches.push({ original: match, placeholder, math: math.trim() });
        mathIndex++;
        return placeholder;
    });

    // Parse markdown to simple structure
    const lines = processedContent.split('\n');
    const children: (Paragraph | Table)[] = [];

    // Add title
    children.push(new Paragraph({
        text: title || 'Untitled',
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
    }));

    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockLang = '';
    let inTable = false;
    let tableLines: string[] = [];

    const finishTable = () => {
        if (tableLines.length > 0) {
            const tableData = parseMarkdownTable(tableLines.join('\n'));
            if (tableData) {
                const rows: TableRow[] = [];

                // Header row
                rows.push(new TableRow({
                    children: tableData.headers.map(header => new TableCell({
                        children: [new Paragraph({
                            children: [new TextRun({ text: header, bold: true })],
                        })],
                        shading: { fill: 'F4F4F4' },
                    })),
                }));

                // Data rows
                for (const row of tableData.rows) {
                    rows.push(new TableRow({
                        children: row.map(cell => new TableCell({
                            children: [new Paragraph({ text: cell })],
                        })),
                    }));
                }

                children.push(new Table({
                    rows,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
                        left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
                        right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
                    },
                }));

                children.push(new Paragraph({ text: '' })); // Spacing after table
            }
            tableLines = [];
        }
        inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle code blocks
        if (line.startsWith('```')) {
            if (inTable) finishTable();

            if (inCodeBlock) {
                // End of code block - check if it's mermaid
                if (codeBlockLang === 'mermaid') {
                    // Try to render mermaid diagram
                    const mermaidCode = codeBlockLines.join('\n').trim();
                    try {
                        const { svg } = await mermaid.render(`mermaid-docx-${Date.now()}-${i}`, mermaidCode);
                        const pngData = await svgToPngBlob(svg);

                        if (pngData) {
                            children.push(new Paragraph({
                                children: [new ImageRun({
                                    data: pngData,
                                    transformation: { width: 500, height: 300 },
                                    type: 'png',
                                })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 200 }
                            }));
                        } else {
                            // Fallback to code block if image conversion fails
                            children.push(new Paragraph({
                                children: [new TextRun({
                                    text: `[Mermaid Diagram]\n${mermaidCode}`,
                                    font: 'Courier New',
                                    size: 20
                                })],
                                shading: { fill: 'F4F4F4' }
                            }));
                        }
                    } catch {
                        // Fallback on mermaid error
                        children.push(new Paragraph({
                            children: [new TextRun({
                                text: `[Mermaid Diagram - Error rendering]\n${mermaidCode}`,
                                font: 'Courier New',
                                size: 20
                            })],
                            shading: { fill: 'FFF0F0' }
                        }));
                    }
                } else {
                    // Regular code block
                    children.push(new Paragraph({
                        children: [new TextRun({
                            text: codeBlockLines.join('\n'),
                            font: 'Courier New',
                            size: 20
                        })],
                        shading: { fill: 'F4F4F4' }
                    }));
                }
                codeBlockLines = [];
                codeBlockLang = '';
                inCodeBlock = false;
            } else {
                codeBlockLang = line.slice(3).trim().toLowerCase();
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockLines.push(line);
            continue;
        }

        // Check for table
        const isTableLine = line.trim().startsWith('|') && line.trim().includes('|');
        if (isTableLine) {
            if (!inTable) inTable = true;
            tableLines.push(line);
            continue;
        } else if (inTable) {
            finishTable();
        }

        // Check for block math placeholder
        const mathMatch = blockMathMatches.find(m => line.includes(m.placeholder));
        if (mathMatch && line.trim() === mathMatch.placeholder) {
            // Render math as image
            const pngData = await mathToPngBlob(mathMatch.math, true);
            if (pngData) {
                children.push(new Paragraph({
                    children: [new ImageRun({
                        data: pngData,
                        transformation: { width: 400, height: 100 },
                        type: 'png',
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 200 }
                }));
            } else {
                // Fallback: show as formatted text
                children.push(new Paragraph({
                    children: [new TextRun({
                        text: `[Math: ${mathMatch.math}]`,
                        italics: true,
                        color: '6A737D'
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 100, after: 100 }
                }));
            }
            continue;
        }

        // Process regular content
        if (line.startsWith('# ')) {
            children.push(new Paragraph({
                text: line.slice(2),
                heading: HeadingLevel.HEADING_1
            }));
        } else if (line.startsWith('## ')) {
            children.push(new Paragraph({
                text: line.slice(3),
                heading: HeadingLevel.HEADING_2
            }));
        } else if (line.startsWith('### ')) {
            children.push(new Paragraph({
                text: line.slice(4),
                heading: HeadingLevel.HEADING_3
            }));
        } else if (line.startsWith('#### ')) {
            children.push(new Paragraph({
                text: line.slice(5),
                heading: HeadingLevel.HEADING_4
            }));
        } else if (line.startsWith('##### ')) {
            children.push(new Paragraph({
                text: line.slice(6),
                heading: HeadingLevel.HEADING_5
            }));
        } else if (line.startsWith('###### ')) {
            children.push(new Paragraph({
                text: line.slice(7),
                heading: HeadingLevel.HEADING_6
            }));
        } else if (line.startsWith('> ')) {
            children.push(new Paragraph({
                children: [new TextRun({ text: line.slice(2), italics: true, color: '6A737D' })],
                indent: { left: 720 },
                border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'DFE2E5', space: 10 } }
            }));
        } else if (line.startsWith('- [ ] ')) {
            children.push(new Paragraph({
                children: [new TextRun({ text: '☐ ' + line.slice(6) })]
            }));
        } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
            children.push(new Paragraph({
                children: [new TextRun({ text: '☑ ' + line.slice(6) })]
            }));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            children.push(new Paragraph({
                text: line.slice(2),
                bullet: { level: 0 }
            }));
        } else if (/^\d+\. /.test(line)) {
            children.push(new Paragraph({
                text: line.replace(/^\d+\. /, ''),
                numbering: { reference: 'default-numbering', level: 0 }
            }));
        } else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
            children.push(new Paragraph({
                children: [new TextRun({ text: '─'.repeat(60) })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 }
            }));
        } else if (line.trim()) {
            // Parse inline formatting
            const runs = parseInlineFormatting(line);
            children.push(new Paragraph({ children: runs }));
        } else {
            children.push(new Paragraph({ text: '' }));
        }
    }

    // Finish any remaining table
    if (inTable) finishTable();

    const doc = new Document({
        sections: [{
            properties: {},
            children: children as Paragraph[]
        }],
        numbering: {
            config: [{
                reference: 'default-numbering',
                levels: [{
                    level: 0,
                    format: 'decimal',
                    text: '%1.',
                    alignment: AlignmentType.START
                }]
            }]
        }
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title || 'untitled'}.docx`);
}

// Parse inline markdown formatting
function parseInlineFormatting(line: string): TextRun[] {
    const runs: TextRun[] = [];

    // Combined regex for bold, italic, bold-italic, strikethrough, inline code, links, and inline math
    // Order matters: check bold-italic before bold before italic, and check $$ before $ (but $$ should be block math)
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[([^\]]+)\]\(([^)]+)\)|\$([^$\n]+)\$|==(.+?)==)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
            runs.push(new TextRun(line.slice(lastIndex, match.index)));
        }

        if (match[2]) {
            // Bold italic ***text***
            runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
        } else if (match[3]) {
            // Bold **text**
            runs.push(new TextRun({ text: match[3], bold: true }));
        } else if (match[4]) {
            // Italic *text*
            runs.push(new TextRun({ text: match[4], italics: true }));
        } else if (match[5]) {
            // Strikethrough ~~text~~
            runs.push(new TextRun({ text: match[5], strike: true }));
        } else if (match[6]) {
            // Inline code `text`
            runs.push(new TextRun({
                text: match[6],
                font: 'Courier New',
                shading: { fill: 'F6F8FA' }
            }));
        } else if (match[7] && match[8]) {
            // Link [text](url)
            runs.push(new TextRun({
                text: match[7],
                color: '0366D6',
                underline: { type: 'single' }
            }));
        } else if (match[9]) {
            // Inline math $expression$
            runs.push(new TextRun({
                text: match[9],
                italics: true,
                font: 'Cambria Math'
            }));
        } else if (match[10]) {
            // Highlighted text ==text==
            runs.push(new TextRun({
                text: match[10],
                highlight: 'yellow'
            }));
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
        runs.push(new TextRun(line.slice(lastIndex)));
    }

    if (runs.length === 0) {
        runs.push(new TextRun(line));
    }

    return runs;
}
