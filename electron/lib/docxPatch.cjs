'use strict';

function getJSZip() {
  return require('jszip');
}
function escapeXmlText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeXmlText(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** 通用纯文本（导出等场景可折叠空白） */
function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * DOCX 兼容写回：HTML → 段落行（保留空段、行首/行尾空格、不间断空格）
 * 不 trim、不丢弃空行，避免 WPS/Word 打开后空白被吃掉。
 */
function htmlToDocxEditableLines(html) {
  const text = String(html || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr|td|th)>/gi, '\n')
    .replace(/<(?:p|div|h[1-6]|li|blockquote|pre)(?:\s[^>]*)?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&#160;/gi, '\u00a0')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/gi, "'");

  // 去掉因首尾块标签产生的单一外壳空行，中间空行全部保留
  const lines = text.split('\n');
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function paragraphXmlText(paragraphXml) {
  const textMatches = [...String(paragraphXml || '').matchAll(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
  const text = textMatches.map((match) => decodeXmlText(match[2] || '')).join('');
  return { textMatches, text };
}

function needsXmlSpacePreserve(text) {
  const value = String(text || '');
  return value.length > 0 && (/^\s|\s$/.test(value) || /  |\t|\u00a0/.test(value));
}

function withXmlSpacePreserve(attrs, text) {
  let next = String(attrs || '');
  if (!needsXmlSpacePreserve(text)) return next;
  if (/xml:space\s*=/.test(next)) {
    return next.replace(/xml:space\s*=\s*"[^"]*"/, 'xml:space="preserve"');
  }
  return `${next} xml:space="preserve"`;
}

function normalizeComparableText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

/**
 * 写回段落文本。
 * - 内容完全一致：不改 XML
 * - 仅空白被 HTML 折叠（编辑器无额外空格意图）：保留原 OOXML，避免冲掉 WPS 空格
 * - 用户改了文案或显式带了首尾/连续空格：写入并 xml:space="preserve"
 */
function replaceParagraphTextXml(paragraphXml, replacementText) {
  const { textMatches, text: originalText } = paragraphXmlText(paragraphXml);
  const value = String(replacementText ?? '');

  if (originalText === value) return paragraphXml;

  const sameMeaning = normalizeComparableText(originalText) === normalizeComparableText(value);
  const editorWantsExactSpaces = needsXmlSpacePreserve(value) && value !== normalizeComparableText(value);
  if (sameMeaning && !editorWantsExactSpaces) {
    return paragraphXml;
  }

  // 原本无 <w:t> 的空段：空内容则原样保留结构；有内容则注入 run
  if (textMatches.length === 0) {
    if (!value) return paragraphXml;
    const run = `<w:r><w:t${withXmlSpacePreserve('', value)}>${escapeXmlText(value)}</w:t></w:r>`;
    if (/<\/w:p>/.test(paragraphXml)) {
      return paragraphXml.replace(/<\/w:p>/, `${run}</w:p>`);
    }
    return paragraphXml;
  }

  let replacedFirst = false;
  return paragraphXml.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (full, attrs = '') => {
    if (replacedFirst) return full.replace(/>[^<]*</, '><');
    replacedFirst = true;
    const nextAttrs = withXmlSpacePreserve(attrs, value);
    return `<w:t${nextAttrs}>${escapeXmlText(value)}</w:t>`;
  });
}

function applyParagraphReplacements(xml, paragraphs, replacements) {
  let patched = '';
  let cursor = 0;
  paragraphs.forEach((paragraph) => {
    const replacement = replacements.get(paragraph.start);
    if (!replacement) return;
    patched += xml.slice(cursor, paragraph.start) + replacement.xml;
    cursor = replacement.end;
  });
  patched += xml.slice(cursor);
  return patched;
}

function buildDocxParagraphXml(text, templateXml) {
  const value = String(text ?? '');
  if (templateXml && /<w:p\b/.test(templateXml)) {
    return replaceParagraphTextXml(templateXml, value);
  }
  const spaceAttr = needsXmlSpacePreserve(value) ? ' xml:space="preserve"' : '';
  return `<w:p><w:r><w:t${spaceAttr}>${escapeXmlText(value)}</w:t></w:r></w:p>`;
}

/**
 * 尽量在原 OOXML 包上只改正文文本，保留样式/页边距/主题/页眉页脚等。
 * - 可编辑段落含：有文本的段落 + 空白/空段落（WPS 常依赖空段撑版式）
 * - 行首尾空格与连续空格通过 xml:space="preserve" 写回
 * - 新增段落：在最后一个可编辑段后插入新 <w:p>
 * - 删除段落：清空多余可编辑段文本（保留原段落节点，降低版式破坏）
 * - 无法安全对齐时抛错，由上层 fallback 到 html-to-docx 重建
 */
async function patchDocxText(sourceBase64, editedHtml) {
  const JSZip = getJSZip();
  const zip = await JSZip.loadAsync(Buffer.from(String(sourceBase64 || ''), 'base64'));
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('docx 缺少 word/document.xml');
  const xml = await documentFile.async('string');
  const nextLines = htmlToDocxEditableLines(editedHtml);
  if (nextLines.length === 0) throw new Error('编辑内容为空，无法 patch docx');

  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => ({
    start: match.index || 0,
    end: (match.index || 0) + match[0].length,
    xml: match[0],
  }));

  // 可编辑段：有文本，或非绘图/域的空段（用于保留 WPS 空行版式）
  const editableParagraphs = paragraphs
    .map((paragraph) => {
      const { textMatches, text } = paragraphXmlText(paragraph.xml);
      const hasDrawing = /<w:drawing\b|<w:pict\b|<w:object\b/.test(paragraph.xml);
      const isEditable = textMatches.length > 0 || (!hasDrawing && !/<w:instrText\b/.test(paragraph.xml));
      return { ...paragraph, textMatches, text, isEditable };
    })
    .filter((paragraph) => paragraph.isEditable);

  if (editableParagraphs.length === 0) {
    throw new Error('原文档无可编辑段落，跳过原包 patch');
  }

  let targetParagraphs = editableParagraphs;
  let targetLines = nextLines;
  let extraLines = [];

  if (targetParagraphs.length !== targetLines.length) {
    // 回退：仅非空文本段 ↔ 非空编辑行（兼容结构略有差异但仍可保真文本）
    const nonEmptyTargets = editableParagraphs.filter((p) => p.textMatches.length > 0 && p.text.length > 0);
    const nonEmptyLines = nextLines.filter((line) => line.length > 0);
    if (nonEmptyTargets.length === nonEmptyLines.length) {
      targetParagraphs = nonEmptyTargets;
      targetLines = nonEmptyLines;
    } else if (nextLines.length > editableParagraphs.length) {
      // 用户新增段落：先按原段数写回，多余行追加新段落
      targetParagraphs = editableParagraphs;
      targetLines = nextLines.slice(0, editableParagraphs.length);
      extraLines = nextLines.slice(editableParagraphs.length);
    } else if (nextLines.length < editableParagraphs.length) {
      // 用户删除段落：写回前 N 段，清空多余可编辑段（保留节点）
      targetParagraphs = editableParagraphs;
      targetLines = nextLines.concat(Array(editableParagraphs.length - nextLines.length).fill(''));
    } else {
      throw new Error(`段落数量变化（原 ${editableParagraphs.length} / 编辑 ${nextLines.length}），跳过原包 patch`);
    }
  }

  const replacements = new Map();
  targetParagraphs.forEach((paragraph, index) => {
    replacements.set(paragraph.start, {
      end: paragraph.end,
      xml: replaceParagraphTextXml(paragraph.xml, targetLines[index]),
    });
  });

  // 在最后一个被替换的可编辑段后插入新增段落
  if (extraLines.length > 0) {
    const anchor = targetParagraphs[targetParagraphs.length - 1];
    const templateXml = anchor?.xml || '';
    const inserted = extraLines.map((line) => buildDocxParagraphXml(line, templateXml)).join('');
    const current = replacements.get(anchor.start);
    replacements.set(anchor.start, {
      end: current ? current.end : anchor.end,
      xml: `${current ? current.xml : anchor.xml}${inserted}`,
    });
  }

  const patched = applyParagraphReplacements(xml, paragraphs, replacements);
  zip.file('word/document.xml', patched);
  return zip.generateAsync({ type: 'nodebuffer' });
}

module.exports = {
  escapeXmlText,
  decodeXmlText,
  htmlToPlainText,
  htmlToDocxEditableLines,
  paragraphXmlText,
  needsXmlSpacePreserve,
  withXmlSpacePreserve,
  normalizeComparableText,
  replaceParagraphTextXml,
  applyParagraphReplacements,
  buildDocxParagraphXml,
  patchDocxText,
};
