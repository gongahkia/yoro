import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { marked } from 'marked';
import katex from 'katex';
import mermaid from 'mermaid';

// Initialize mermaid for server-side rendering
mermaid.initialize({ startOnLoad: false, theme: 'default' });

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
            const { svg } = await mermaid.render(`mermaid-export-${i}`, match[1].trim());
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

    // Wrap in document with styles
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
        h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.25em; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Menlo, Monaco, monospace; }
        pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 16px; color: #666; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f4f4f4; }
        img { max-width: 100%; height: auto; }
        .katex-block { text-align: center; margin: 16px 0; }
        .mermaid-diagram { text-align: center; margin: 20px 0; }
        .mermaid-diagram svg { max-width: 100%; }
        ul, ol { padding-left: 2em; }
        li { margin: 4px 0; }
        a { color: #0066cc; }
        hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
        .task-list-item { list-style: none; }
        .task-list-item input { margin-right: 8px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${html}
</body>
</html>
    `;
}

export async function exportToPDF(content: string, title: string): Promise<void> {
    // Dynamic import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;

    const html = await renderMarkdownToHTML(content, title);

    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    document.body.appendChild(container);

    const options = {
        margin: [10, 10, 10, 10],
        filename: `${title || 'untitled'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
        await html2pdf().set(options).from(container).save();
    } finally {
        document.body.removeChild(container);
    }
}

export async function exportToDOCX(content: string, title: string): Promise<void> {
    // Parse markdown to simple structure
    const lines = content.split('\n');
    const children: Paragraph[] = [];

    // Add title
    children.push(new Paragraph({
        text: title || 'Untitled',
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
    }));

    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    for (const line of lines) {
        // Handle code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                // End of code block
                children.push(new Paragraph({
                    children: [new TextRun({
                        text: codeBlockLines.join('\n'),
                        font: 'Courier New',
                        size: 20
                    })],
                    shading: { fill: 'F4F4F4' }
                }));
                codeBlockLines = [];
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockLines.push(line);
            continue;
        }

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
        } else if (line.startsWith('> ')) {
            children.push(new Paragraph({
                children: [new TextRun({ text: line.slice(2), italics: true })],
                indent: { left: 720 }
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
        } else if (line.trim() === '---') {
            children.push(new Paragraph({
                children: [new TextRun({ text: '─'.repeat(50) })],
                alignment: AlignmentType.CENTER
            }));
        } else if (line.trim()) {
            // Parse inline formatting
            const runs: TextRun[] = [];
            let remaining = line;

            // Simple regex-based parsing for bold, italic, code
            const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    runs.push(new TextRun(line.slice(lastIndex, match.index)));
                }
                if (match[2]) {
                    runs.push(new TextRun({ text: match[2], bold: true }));
                } else if (match[3]) {
                    runs.push(new TextRun({ text: match[3], italics: true }));
                } else if (match[4]) {
                    runs.push(new TextRun({ text: match[4], font: 'Courier New' }));
                }
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
                runs.push(new TextRun(line.slice(lastIndex)));
            }

            if (runs.length === 0) {
                runs.push(new TextRun(line));
            }

            children.push(new Paragraph({ children: runs }));
        } else {
            children.push(new Paragraph({ text: '' }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children
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
