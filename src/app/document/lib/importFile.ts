import type { StoredDoc } from "../types";
import {
  buildOutlineTree,
  createStoredDoc,
  flattenOutlineNodes,
  importHtmlAsStoredDoc,
  importMarkdownAsStoredDoc,
} from "./docModel";
import { emptyParagraph, textToPlainTextHtml } from "../../editor/utils/html";
import { mammothStyleMap } from "../mammothStyleMap";
import { arrayBufferToBase64 } from "../../shared/utils/text";

export function storedDocFromMarkdown(name: string, text: string): StoredDoc {
  return {
    ...importMarkdownAsStoredDoc(name, text),
    name,
    source: { ext: "md" as const, originalText: text, dirty: false },
  };
}

export function storedDocFromHtml(name: string, text: string, ext: "html" | "htm" = "html"): StoredDoc {
  return {
    ...importHtmlAsStoredDoc(name, text),
    name,
    source: { ext, originalText: text, dirty: false },
  };
}

export function storedDocFromPlainText(name: string, text: string, ext: "txt" | "sql"): StoredDoc {
  const html = textToPlainTextHtml(text, ext === "sql" ? "sql" : undefined);
  const tree = buildOutlineTree(name);
  const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
  return {
    ...createStoredDoc(name, tree, { [leaf.id]: html }),
    source: { ext, originalText: text, dirty: false },
  };
}

export function storedDocFromDocxHtml(name: string, html: string, base64: string): StoredDoc {
  const tree = buildOutlineTree(name);
  const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
  const parsedText = new DOMParser().parseFromString(html || "", "text/html").body.textContent || "";
  return {
    ...createStoredDoc(name, tree, { [leaf.id]: html || emptyParagraph }),
    source: { ext: "docx" as const, base64, originalText: parsedText, dirty: false },
  };
}

export async function storedDocFromDocx(name: string, arrayBuffer: ArrayBuffer, base64?: string): Promise<StoredDoc> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: mammothStyleMap, includeDefaultStyleMap: true });
  return storedDocFromDocxHtml(name, result.value, base64 ?? arrayBufferToBase64(arrayBuffer));
}
