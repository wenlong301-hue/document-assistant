import type { DocContentMap, OutlineNode, PreviewSection, StoredDoc } from "../types";
import {
  emptyParagraph,
  markdownToSimpleHtml,
  sanitizeHtml,
} from "../../editor/utils/html";
import outlineSvg from "../../../imports/首页大纲模式根节点/svg-4qt61e0wiv";

export const normalizeOutlineNode = (node: any): OutlineNode => ({
  id: String(node?.id ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  name: String(node?.name ?? node?.title ?? "未命名文件"),
  children: Array.isArray(node?.children) ? node.children.map(normalizeOutlineNode) : [],
  includeInPreview: node?.includeInPreview === false ? false : true,
});

export const normalizeContentMap = (content: any): DocContentMap => {
  if (!content) return {};
  if (typeof content === "string") return { root: content };
  if (typeof content !== "object") return {};
  return Object.fromEntries(Object.entries(content).filter(([, value]) => typeof value === "string")) as DocContentMap;
};

export const normalizeMdocDocuments = (documents: any[], fallbackTitle: string): { children: OutlineNode[]; content: DocContentMap } => {
  const items = [...documents].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
  const root = items.find((item) => item?.parentId == null) ?? items[0];
  const rootId = root?.id;
  const content: DocContentMap = {};
  const buildChildren = (parentId: any): OutlineNode[] => items
    .filter((item) => item?.parentId === parentId)
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    .map((item) => {
      const id = String(item?.id ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      if (typeof item?.content === "string") content[id] = item.content;
      return {
        id,
        name: String(item?.title ?? item?.name ?? "未命名文件"),
        children: buildChildren(item?.id),
        includeInPreview: item?.includeInPreview === false ? false : true,
      };
    });

  const children = rootId == null ? [] : buildChildren(rootId);
  if (children.length === 0 && root && typeof root.content === "string" && root.content.replace(/<[^>]*>/g, "").trim()) {
    const id = String(root.id ?? "root-content");
    content[id] = root.content;
    return { children: [{ id, name: String(root.title ?? fallbackTitle), children: [] }], content };
  }
  return { children, content };
};

export const createOutlineNode = (name: string): OutlineNode => ({
  id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: name || "未命名文件",
  children: [],
  includeInPreview: true,
});

export const isHtmlContentEmpty = (html?: string) => !String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

export const isNodePreviewable = (node: OutlineNode, contentMap?: DocContentMap) =>
  node.includeInPreview !== false && !isHtmlContentEmpty(contentMap?.[node.id]);

export const getFirstPreviewableNode = (nodes: OutlineNode[], contentMap?: DocContentMap): OutlineNode | null => {
  for (const node of nodes) {
    if (isNodePreviewable(node, contentMap)) return node;
    const found = getFirstPreviewableNode(node.children || [], contentMap);
    if (found) return found;
  }
  return null;
};

export const resolvePreviewNodeId = (nodes: OutlineNode[], nodeId: string | undefined, contentMap?: DocContentMap): string => {
  if (!nodeId) return getFirstPreviewableNode(nodes, contentMap)?.id || nodes[0]?.id || "root";
  const node = findNode(nodes, nodeId);
  if (!node) return getFirstPreviewableNode(nodes, contentMap)?.id || nodeId;
  if (isNodePreviewable(node, contentMap)) return node.id;
  const inSubtree = getFirstPreviewableNode(node.children || [], contentMap);
  if (inSubtree) return inSubtree.id;
  return getFirstPreviewableNode(nodes, contentMap)?.id || node.id;
};

export const buildEmptyOutlineTree = (_docName: string): OutlineNode[] => [];

export const buildOutlineTree = (docName: string): OutlineNode[] => [createOutlineNode(docName || "未命名文件")];

export const createStoredDoc = (name: string, children = buildOutlineTree(name), content: DocContentMap = {}): StoredDoc => ({
  name,
  children,
  content,
  updatedAt: new Date().toISOString(),
});

export const normalizeStoredDoc = (name: string, raw: any): StoredDoc => {
  const docName = String(raw?.name ?? raw?.title ?? name);
  if (Array.isArray(raw?.documents)) {
    const normalized = normalizeMdocDocuments(raw.documents, docName);
    return createStoredDoc(docName, normalized.children, normalized.content);
  }
  const children = Array.isArray(raw?.children) ? raw.children.map(normalizeOutlineNode) : buildOutlineTree(docName);
  return createStoredDoc(docName, children, normalizeContentMap(raw?.content));
};

export const importMarkdownAsStoredDoc = (name: string, source: string): StoredDoc => {
  const title = name || "未命名文件";
  const tree = buildOutlineTree(title);
  const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
  return createStoredDoc(title, tree, { [leaf.id]: markdownToSimpleHtml(String(source || "").replace(/^\uFEFF/, "")) });
};

export const importHtmlAsStoredDoc = (name: string, source: string): StoredDoc => {
  const parsed = new DOMParser().parseFromString(source || "", "text/html");
  const embeddedState = parsed.querySelector<HTMLScriptElement>('script[data-doc-assistant-state]')?.textContent;
  if (embeddedState) {
    try {
      return normalizeStoredDoc(name, JSON.parse(embeddedState));
    } catch {
      // Continue with legacy and generic HTML recovery.
    }
  }

  const legacyScript = parsed.querySelector<HTMLScriptElement>("body > script:last-of-type")?.textContent || "";
  const sectionsMatch = legacyScript.match(/window\.__DOC_SECTIONS__=(.*?);\s*window\.__DOC_INITIAL__=/s);
  if (sectionsMatch) {
    try {
      const sections = JSON.parse(sectionsMatch[1]) as Record<string, PreviewSection>;
      const content = Object.fromEntries(Object.entries(sections).map(([id, section]) => [id, sanitizeHtml(section.html || emptyParagraph)]));
      const buildTree = (container: Element): OutlineNode[] => Array.from(container.children)
        .filter((child) => child.classList.contains("tree-node"))
        .map((child) => {
          const id = child.getAttribute("data-node-id") || `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const label = child.querySelector(":scope > .tree-item > .tree-name")?.textContent?.trim();
          const childrenContainer = child.querySelector(":scope > .tree-children");
          return {
            id,
            name: label || sections[id]?.name || "未命名文件",
            children: childrenContainer ? buildTree(childrenContainer) : [],
            includeInPreview: true,
          };
        });
      const treeRoot = parsed.querySelector(".sidebar-left .doc-tree") || parsed.querySelector(".doc-tree");
      const children = treeRoot ? buildTree(treeRoot) : Object.entries(sections).map(([id, section]) => ({
        id,
        name: section.name || "未命名文件",
        children: [],
        includeInPreview: true,
      }));
      if (children.length > 0) return createStoredDoc(name, children, content);
    } catch {
      // Continue with generic HTML extraction.
    }
  }

  const contentRoot = parsed.querySelector<HTMLElement>("#doc-content")
    || parsed.querySelector<HTMLElement>("main.content")
    || parsed.querySelector<HTMLElement>(".article-inner")
    || parsed.querySelector<HTMLElement>(".article-card")
    || parsed.querySelector<HTMLElement>("article")
    || parsed.querySelector<HTMLElement>("main")
    || parsed.body;
  contentRoot.querySelectorAll("script,style,noscript,template,.copy-btn").forEach((node) => node.remove());
  const title = contentRoot.querySelector("h1")?.textContent?.trim() || parsed.title.trim() || name;
  contentRoot.querySelectorAll(".toc-tree,.toc-empty,.toc-link,.toc-node,.help-toc,.manual-toc,.table-of-contents").forEach((node) => node.remove());
  const html = sanitizeHtml(contentRoot.innerHTML || emptyParagraph);
  const tree = buildOutlineTree(title);
  return createStoredDoc(title, tree, { [tree[0].id]: html });
};

export const flattenOutlineNodes = (nodes: OutlineNode[]): OutlineNode[] => nodes.flatMap((node) => [node, ...flattenOutlineNodes(node.children)]);

export const outlineExpandedIconPath = outlineSvg.p32aa7080;
export const outlineCollapsedIconPath = outlineSvg.p2c70bb70;

export function countDescendants(node: OutlineNode): number {
  return node.children.reduce((acc, child) => acc + 1 + countDescendants(child), 0);
}

export function buildDeleteMessage(type: "doc" | "branch" | "leaf", name: string, count?: number): string {
  if (type === "doc") return `确定删除【${name}】及其下 ${count ?? 0} 个子文档？\n不可撤销。`;
  if (type === "branch") return `确定删除【${name}】及其下 ${count} 个子文件内容？\n不可撤销。`;
  return `确定删除【${name}】内容？\n不可撤销。`;
}

export function findNode(nodes: OutlineNode[], id: string): OutlineNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

export function findNodeDepth(nodes: OutlineNode[], id: string, depth = 0): number {
  for (const n of nodes) {
    if (n.id === id) return depth;
    const d = findNodeDepth(n.children, id, depth + 1);
    if (d >= 0) return d;
  }
  return -1;
}

/** 打开文件时优先展示：一级节点有内容则用它，否则找其子树中第一个有内容的节点 */
export function findDisplayNodeForFile(doc: StoredDoc): OutlineNode | undefined {
  const hasContent = (node: OutlineNode) => !isHtmlContentEmpty(doc.content?.[node.id]);
  const findInSubtree = (nodes: OutlineNode[]): OutlineNode | undefined => {
    for (const node of nodes) {
      if (hasContent(node)) return node;
      const child = findInSubtree(node.children || []);
      if (child) return child;
    }
    return undefined;
  };
  const firstLevel = doc.children?.[0];
  if (!firstLevel) return undefined;
  return hasContent(firstLevel) ? firstLevel : findInSubtree(firstLevel.children || []) ?? firstLevel;
}
