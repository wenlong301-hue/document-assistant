import type { OutlineNode, StoredDoc } from "../types";
import { flattenOutlineNodes, isHtmlContentEmpty } from "./docModel";
import { buildPreviewHtmlAsync, buildPreviewSections } from "./previewHtml";
import { emptyParagraph, escapeHtml, getPlainTextFromHtml } from "@/app/editor/utils/html";
import {
  applyLineEnding,
  getDisplayFileName,
  isWhitespaceCollapsedFrom,
} from "@/app/shared/utils/text";
import { turndownService } from "../exportTurndown";

export type OpenFileInfo = {
  docName: string;
  filePath: string;
  ext: string;
  originalText?: string;
  lineEnding?: string;
};

export type FolderWriteMode = "preserved" | "patched" | "converted" | "mdoc";

export type FolderWritePayloadResult =
  | { ok: true; payload: Record<string, unknown>; expectedMode: FolderWriteMode }
  | { ok: false; error: string };

/** 组装 L2 项目原文件写回 payload（纯逻辑，不含 IPC / Toast） */
export async function buildFolderWritePayload(
  docName: string,
  doc: StoredDoc,
  info: OpenFileInfo,
): Promise<FolderWritePayloadResult> {
  const parts = flattenOutlineNodes(doc.children || []);
  const source = doc.source;
  const isDirty = source ? !!source.dirty : true;
  const markdownParts: Array<{ name: string; html: string; level: number }> = [];
  const collectMarkdownParts = (nodes: OutlineNode[], level: number) => {
    nodes.forEach((node) => {
      const html = doc.content?.[node.id] || "";
      if (info.ext !== "md" || !isHtmlContentEmpty(html)) {
        markdownParts.push({ name: node.name, html: html || emptyParagraph, level });
      }
      collectMarkdownParts(node.children || [], Math.min(6, level + 1));
    });
  };
  collectMarkdownParts(doc.children || [], 1);
  const markdownContentHtml = markdownParts.map((part) => {
    const level = Math.min(6, Math.max(1, part.level));
    return part.html.trim().startsWith("<h1") ? part.html : `<h${level}>${escapeHtml(part.name)}</h${level}>${part.html}`;
  }).join("\n");
  const contentHtml = parts.length > 0
    ? parts.map((n) => doc.content?.[n.id] || emptyParagraph).join("\n")
    : `<h1>${escapeHtml(doc.name || docName)}</h1>${emptyParagraph}`;

  let payload: Record<string, unknown>;
  let expectedMode: FolderWriteMode = "converted";

  if (info.ext === "mdoc") {
    const { source: _source, ...mdocBody } = doc;
    payload = {
      ext: "mdoc",
      content: JSON.stringify({ ...mdocBody, name: doc.name || docName, children: doc.children || [], updatedAt: new Date().toISOString() }),
    };
    expectedMode = "mdoc";
  } else if (info.ext === "md") {
    const original = source?.originalText;
    if (!isDirty && original != null) {
      payload = { ext: "md", content: original, sourceDirty: false };
      expectedMode = "preserved";
    } else {
      if (!markdownContentHtml.trim()) return { ok: false, error: "内容为空，已阻止覆盖" };
      const convertedMd = `${turndownService.turndown(markdownContentHtml).trim()}\n`;
      if (original != null && isWhitespaceCollapsedFrom(convertedMd, original)) {
        payload = { ext: "md", content: original, sourceDirty: false };
        expectedMode = "preserved";
      } else {
        payload = { ext: "md", html: markdownContentHtml, title: getDisplayFileName(doc.name || docName), sourceDirty: true };
        expectedMode = "converted";
      }
    }
  } else if (info.ext === "txt" || info.ext === "sql") {
    const original = source?.originalText ?? info.originalText;
    if (!isDirty && original != null) {
      payload = { ext: info.ext, content: original, sourceDirty: false };
      expectedMode = "preserved";
    } else {
      const text = parts.length > 0
        ? parts.map((n) => getPlainTextFromHtml(doc.content?.[n.id] || "", { preserveWhitespace: true })).join("\n\n")
        : "";
      if (original != null && isWhitespaceCollapsedFrom(text, original)) {
        payload = { ext: info.ext, content: original, sourceDirty: false };
        expectedMode = "preserved";
      } else {
        const content = applyLineEnding(text, info.lineEnding || "\n");
        payload = { ext: info.ext, content, sourceDirty: true };
        expectedMode = "converted";
      }
    }
  } else if (info.ext === "docx") {
    const dirty = source?.ext === "docx" ? !!source.dirty : true;
    payload = {
      ext: "docx",
      html: contentHtml,
      title: getDisplayFileName(doc.name || docName),
      options: { skipTitle: true },
      sourceBase64: source?.ext === "docx" ? source.base64 : undefined,
      sourceDirty: dirty,
    };
    expectedMode = !dirty ? "preserved" : "patched";
  } else if (info.ext === "html" || info.ext === "htm") {
    const original = source?.originalText;
    if (!isDirty && original != null) {
      payload = { ext: info.ext, content: original, sourceDirty: false };
      expectedMode = "preserved";
    } else if (original != null) {
      const editedPlain = parts.length > 0
        ? parts.map((n) => getPlainTextFromHtml(doc.content?.[n.id] || "", { preserveWhitespace: true })).join("\n\n")
        : getPlainTextFromHtml(contentHtml, { preserveWhitespace: true });
      const originalPlain = getPlainTextFromHtml(original, { preserveWhitespace: true });
      if (isWhitespaceCollapsedFrom(editedPlain, originalPlain)) {
        payload = { ext: info.ext, content: original, sourceDirty: false };
        expectedMode = "preserved";
      } else {
        const sections = buildPreviewSections(doc.children || [], doc.content || {});
        const displayName = getDisplayFileName(doc.name || docName);
        const fallback = [{ id: "root", name: displayName, html: contentHtml }];
        payload = {
          ext: info.ext,
          content: await buildPreviewHtmlAsync(displayName, sections.length > 0 ? sections : fallback, doc.children || [], sections[0]?.id, doc.content || {}),
          sourceDirty: true,
        };
        expectedMode = "converted";
      }
    } else {
      const sections = buildPreviewSections(doc.children || [], doc.content || {});
      const displayName = getDisplayFileName(doc.name || docName);
      const fallback = [{ id: "root", name: displayName, html: contentHtml }];
      payload = {
        ext: info.ext,
        content: await buildPreviewHtmlAsync(displayName, sections.length > 0 ? sections : fallback, doc.children || [], sections[0]?.id, doc.content || {}),
        sourceDirty: true,
      };
      expectedMode = "converted";
    }
  } else {
    const sections = buildPreviewSections(doc.children || [], doc.content || {});
    const displayName = getDisplayFileName(doc.name || docName);
    const fallback = [{ id: "root", name: displayName, html: contentHtml }];
    payload = {
      ext: "html",
      content: await buildPreviewHtmlAsync(displayName, sections.length > 0 ? sections : fallback, doc.children || [], sections[0]?.id, doc.content || {}),
      sourceDirty: true,
    };
    expectedMode = "converted";
  }

  return { ok: true, payload, expectedMode };
}
