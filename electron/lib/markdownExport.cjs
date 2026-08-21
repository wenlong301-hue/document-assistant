'use strict';

const path = require('path');
const fs = require('fs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTurndownService() {
  return require('turndown');
}
function markdownImageExtension(mime) {
  const normalized = String(mime || '').toLowerCase();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/svg+xml') return 'svg';
  const match = normalized.match(/^image\/([a-z0-9.+-]+)$/);
  return match ? match[1].replace(/\+xml$/, '') : 'png';
}

function createMarkdownImageWriter(mdPath) {
  const base = path.basename(mdPath, path.extname(mdPath));
  const folder = `${base}_assets`;
  const dir = path.join(path.dirname(mdPath), folder);
  let index = 1;
  return (src) => {
    const match = String(src || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return null;
    const fileName = `image-${index++}.${markdownImageExtension(match[1])}`;
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(match[2], 'base64'));
    return encodeURI(`${folder}/${fileName}`);
  };
}

function contentHtmlToMarkdown(content, imageWriter) {
  const TurndownService = getTurndownService();
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  turndown.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td', 'video']);
  turndown.addRule('safeImage', {
    filter: 'img',
    replacement: (_content, node) => {
      const src = node.getAttribute('src') || '';
      const alt = String(node.getAttribute('alt') || '图片').replace(/[\r\n\]]/g, ' ');
      if (src.startsWith('data:')) {
        const relative = imageWriter ? imageWriter(src) : null;
        return relative ? `\n\n![${alt}](${relative})\n\n` : `\n\n![${alt}](${src})\n\n`;
      }
      return `\n\n![${alt}](${src})\n\n`;
    },
  });
  turndown.addRule('mermaidDiagram', {
    filter: (node) => node.nodeName === 'DIV' && node.classList && node.classList.contains('mermaid-diagram'),
    replacement: (_content, node) => {
      const source = node.getAttribute('data-mermaid-source') || '';
      if (!String(source).trim()) return '\n\n';
      return '\n\n```mermaid\n' + String(source).trimEnd() + '\n```\n\n';
    },
  });
  turndown.addRule('docDiagram', {
    filter: (node) => node.nodeName === 'DIV' && node.classList && node.classList.contains('doc-diagram'),
    replacement: (_content, node) => {
      const kind = String(node.getAttribute('data-diagram-kind') || 'mermaid').toLowerCase();
      const source = node.getAttribute('data-diagram-source') || '';
      if (!String(source).trim()) return '\n\n';
      return '\n\n```' + kind + '\n' + String(source).trimEnd() + '\n```\n\n';
    },
  });
  turndown.addRule('mermaidCodeBlock', {
    filter: (node) => {
      if (node.nodeName !== 'PRE') return false;
      const code = node.querySelector && node.querySelector('code');
      const cls = String(node.className || '') + ' ' + String(code && code.className || '');
      const data = String(node.getAttribute && node.getAttribute('data-language') || '') + ' ' + String(code && code.getAttribute && code.getAttribute('data-language') || '');
      return /language-(mermaid|sequence|flow)|\b(mermaid|sequence|flow)\b/i.test(cls + ' ' + data);
    },
    replacement: (_content, node) => {
      const code = node.querySelector && node.querySelector('code');
      const data = String(node.getAttribute && node.getAttribute('data-language') || '') || String(code && code.getAttribute && code.getAttribute('data-language') || '');
      const cls = String(node.className || '') + ' ' + String(code && code.className || '');
      const hit = (data.match(/^(mermaid|sequence|flow)$/i) || cls.match(/language-(mermaid|sequence|flow)/i) || [])[1] || 'mermaid';
      const source = String((code && code.textContent) || node.textContent || '').trimEnd();
      if (!source) return '\n\n';
      return '\n\n```' + String(hit).toLowerCase() + '\n' + source + '\n```\n\n';
    },
  });
  return turndown.turndown(content || '').trim() + '\n';
}

module.exports = {
  markdownImageExtension,
  createMarkdownImageWriter,
  contentHtmlToMarkdown,
  ensureDir,
};
