import * as Y from "yjs";
import type { DocContentMap, OutlineNode, StoredDoc } from "@/app/document/types";
import { emptyParagraph } from "@/app/editor/utils/html";

export const META_KEY = "meta";
export const OUTLINE_KEY = "outline";
export const CONTENT_KEY = "content";
export const SELECTED_KEY = "selectedNodeId";
export const MODE_KEY = "mode";

type OutlinePlain = { id: string; name: string; includeInPreview: boolean; children: OutlinePlain[] };

function toPlainOutline(nodes: OutlineNode[]): OutlinePlain[] {
  return (nodes || []).map((node) => ({
    id: String(node.id),
    name: String(node.name || "未命名文件"),
    includeInPreview: node.includeInPreview === false ? false : true,
    children: toPlainOutline(node.children || []),
  }));
}

function fromPlainOutline(nodes: unknown): OutlineNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((raw) => {
    const node = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return {
      id: String(node.id ?? `file-${Date.now()}`),
      name: String(node.name ?? "未命名文件"),
      includeInPreview: node.includeInPreview === false ? false : true,
      children: fromPlainOutline(node.children),
    };
  });
}

export function seedCollabDoc(ydoc: Y.Doc, stored: StoredDoc, selectedNodeId?: string, mode?: "document" | "outline") {
  const meta = ydoc.getMap(META_KEY);
  const content = ydoc.getMap(CONTENT_KEY);
  ydoc.transact(() => {
    meta.set("name", stored.name);
    meta.set(OUTLINE_KEY, toPlainOutline(stored.children || []));
    if (selectedNodeId) meta.set(SELECTED_KEY, selectedNodeId);
    if (mode) meta.set(MODE_KEY, mode);
    Object.entries(stored.content || {}).forEach(([id, html]) => {
      if (typeof html === "string") content.set(id, html);
    });
  }, "local-seed");
}

export function readCollabMeta(ydoc: Y.Doc): {
  name: string;
  children: OutlineNode[];
  selectedNodeId: string;
  mode: "document" | "outline" | "";
} {
  const meta = ydoc.getMap(META_KEY);
  const name = String(meta.get("name") || "");
  const children = fromPlainOutline(meta.get(OUTLINE_KEY));
  const selectedNodeId = String(meta.get(SELECTED_KEY) || children[0]?.id || "");
  const modeRaw = String(meta.get(MODE_KEY) || "");
  const mode = modeRaw === "outline" || modeRaw === "document" ? modeRaw : "";
  return { name, children, selectedNodeId, mode };
}

export function readCollabContent(ydoc: Y.Doc): DocContentMap {
  const content = ydoc.getMap(CONTENT_KEY);
  const next: DocContentMap = {};
  content.forEach((value, key) => {
    if (typeof value === "string") next[String(key)] = value;
  });
  return next;
}

export function writeCollabOutline(ydoc: Y.Doc, nodes: OutlineNode[]) {
  ydoc.transact(() => {
    ydoc.getMap(META_KEY).set(OUTLINE_KEY, toPlainOutline(nodes));
  }, "local-outline");
}

export function writeCollabSelected(ydoc: Y.Doc, nodeId: string) {
  ydoc.transact(() => {
    ydoc.getMap(META_KEY).set(SELECTED_KEY, nodeId);
  }, "local-select");
}

export function writeCollabMode(ydoc: Y.Doc, mode: "document" | "outline") {
  ydoc.transact(() => {
    ydoc.getMap(META_KEY).set(MODE_KEY, mode);
  }, "local-mode");
}

export function writeCollabNodeHtml(ydoc: Y.Doc, nodeId: string, html: string) {
  if (!nodeId) return;
  ydoc.transact(() => {
    ydoc.getMap(CONTENT_KEY).set(nodeId, html || emptyParagraph);
  }, "local-content");
}

export function fragmentFieldFor(nodeId: string) {
  return `node:${nodeId}`;
}
