import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import { mergeAttributes, Node as TiptapNode, ResizableNodeView } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, FontSize, LineHeight, TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

/** Shared by ResizableImage node views + image toolbar; updated by RichEditorTiptap. */
const imageRatioLockedRef = { current: true };

const fitImageSize = (width: number, height: number, naturalW: number, naturalH: number, locked: boolean) => {
  if (!locked || naturalW <= 0 || naturalH <= 0) return { width: Math.round(width), height: Math.round(height) };
  const ratio = naturalW / naturalH;
  const nextW = Math.max(48, Math.round(width));
  return { width: nextW, height: Math.max(48, Math.round(nextW / ratio)) };
};

/** Keep resize container/wrapper shrink-wrapped to the img so selection outline tracks image size. */
const syncContainerToImage = (container: HTMLElement | null | undefined) => {
  if (!container) return;
  container.style.width = "fit-content";
  container.style.maxWidth = "100%";
  container.style.display = "inline-flex";
  const wrapper = container.querySelector("[data-resize-wrapper]") as HTMLElement | null;
  if (wrapper) {
    wrapper.style.width = "fit-content";
    wrapper.style.maxWidth = "100%";
    wrapper.style.height = "auto";
  }
};

const ResizableImage = Image.extend({
  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") {
      return null;
    }
    const { directions, minWidth, minHeight } = this.options.resize;
    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");
      el.draggable = false;
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value != null && key !== "width" && key !== "height") {
          el.setAttribute(key, String(value));
        }
      });
      if (mergedAttributes.src != null) el.src = mergedAttributes.src;
      const attrW = Number(node.attrs.width);
      const attrH = Number(node.attrs.height);
      if (Number.isFinite(attrW) && attrW > 0) el.style.width = `${attrW}px`;
      if (Number.isFinite(attrH) && attrH > 0) el.style.height = `${attrH}px`;
      else if (Number.isFinite(attrW) && attrW > 0) el.style.height = "auto";

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          const sized = fitImageSize(width, height, el.naturalWidth, el.naturalHeight, imageRatioLockedRef.current);
          el.style.width = `${sized.width}px`;
          el.style.height = imageRatioLockedRef.current ? "auto" : `${sized.height}px`;
          syncContainerToImage(nodeView.dom);
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          const sized = fitImageSize(width, height, el.naturalWidth, el.naturalHeight, imageRatioLockedRef.current);
          const attrs = imageRatioLockedRef.current
            ? { width: sized.width, height: null as number | null }
            : { width: sized.width, height: sized.height };
          el.style.width = `${sized.width}px`;
          el.style.height = imageRatioLockedRef.current ? "auto" : `${sized.height}px`;
          syncContainerToImage(nodeView.dom);
          this.editor.chain().setNodeSelection(pos).updateAttributes(this.name, attrs).run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          const w = Number(updatedNode.attrs.width);
          const h = Number(updatedNode.attrs.height);
          if (Number.isFinite(w) && w > 0) {
            el.style.width = `${w}px`;
            el.style.height = Number.isFinite(h) && h > 0 ? `${h}px` : "auto";
          } else {
            el.style.width = "";
            el.style.height = "";
          }
          syncContainerToImage(nodeView.dom);
          return true;
        },
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          // Aspect lock is applied in onResize/onCommit via imageRatioLockedRef (dynamic).
          preserveAspectRatio: false,
        },
      });

      syncContainerToImage(nodeView.dom);

      const reveal = () => {
        nodeView.dom.style.visibility = "";
        nodeView.dom.style.pointerEvents = "";
        syncContainerToImage(nodeView.dom);
      };
      nodeView.dom.style.visibility = "hidden";
      nodeView.dom.style.pointerEvents = "none";
      if (el.complete && el.naturalWidth > 0) {
        reveal();
      } else {
        el.addEventListener("load", reveal, { once: true });
        el.addEventListener("error", reveal, { once: true });
      }
      return nodeView;
    };
  },
});
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import DOMPurify from "dompurify";
import { marked } from "marked";
import TurndownService from "turndown";
import mammoth from "mammoth";
const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndownService.keep(["table", "thead", "tbody", "tr", "th", "td", "video"]);
import svgPaths from "../../imports/首页文档模式/svg-8pwaal4bp9";
import menuSvg from "../../imports/Group10/svg-fl6vqvp3w7";
import designSvg from "../../imports/首页文档模式-1/svg-bn9kvq3mly";
import wifiOnSvg from "../../imports/Frame91/svg-mnkp41cgqd";
import outlineMenuSvg from "../../imports/Group10-1/svg-kvilwhz9cx";
import outlineSvg from "../../imports/首页大纲模式根节点/svg-4qt61e0wiv";
import deleteSvg from "../../imports/删除提示确认/svg-wi3f4os8di";
import editorSvg from "../../imports/首页大纲模式根节点未编写内容-1/svg-208e2u96ym";

type OutlineNode = { id: string; name: string; children: OutlineNode[]; includeInPreview?: boolean };
type DocContentMap = Record<string, string>;
type StoredDoc = { name: string; children: OutlineNode[]; content: DocContentMap; updatedAt?: string; filePath?: string };
type DocStore = Record<string, StoredDoc>;

const emptyParagraph = "<p><br></p>";
const WEB_STORAGE_KEY = "doc-assistant-store-v1";
const WEB_STORAGE_DB = "doc-assistant-db";
const WEB_STORAGE_STORE = "state";
const WEB_STORAGE_STATE_ID = "current";
const MAX_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_EMBED_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

type WebPersistedState = { docs: string[]; docStore: DocStore; selectedDoc: string };

const sanitizeHtml = (html: string) => DOMPurify.sanitize(html || emptyParagraph, {
  USE_PROFILES: { html: true },
  ADD_TAGS: ["iframe", "video", "source"],
  ADD_ATTR: ["style", "class", "id", "target", "rel", "download", "checked", "data-type", "data-checked", "data-indent", "data-row-height", "data-attachment", "data-file-name", "data-file-size", "data-file-type", "controls", "src", "href", "width", "height", "colspan", "rowspan", "poster", "preload", "playsinline"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:(?:image|video|audio|application)\/|data:text\/plain|manual-doc:|#)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
}) || emptyParagraph;

const fileToDataUrl = (file: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("文件读取失败"));
  reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
  reader.onabort = () => reject(new Error("文件读取已取消"));
  reader.readAsDataURL(file);
});

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片压缩失败")), type, quality);
});

const compressImageForEmbed = async (file: File) => {
  if (file.type === "image/svg+xml") throw new Error("暂不支持 SVG 图片，请转换为 PNG、JPEG 或 WebP");
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error("图片不能超过 20MB");
  if (file.type === "image/gif") {
    if (file.size > MAX_IMAGE_EMBED_BYTES) throw new Error("GIF 图片不能超过 4MB");
    return fileToDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = document.createElement("img");
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理图片");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await canvasToBlob(canvas, "image/webp", 0.86);
    if (blob.size > MAX_IMAGE_EMBED_BYTES) blob = await canvasToBlob(canvas, "image/webp", 0.7);
    if (blob.size > MAX_IMAGE_EMBED_BYTES) throw new Error("图片压缩后仍超过 4MB，请选择更小的图片");
    return fileToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const formatFileSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const mergeHtmlAttrs = (...attrsList: Record<string, any>[]) => attrsList.reduce((merged, attrs) => {
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value == null) return;
    if (key === "class" && merged.class) merged.class = `${merged.class} ${value}`;
    else if (key === "style" && merged.style) merged.style = `${merged.style};${value}`;
    else merged[key] = value;
  });
  return merged;
}, {} as Record<string, any>);

const getPlainTextFromHtml = (html: string) => new DOMParser()
  .parseFromString(html || "", "text/html")
  .body.textContent || "";

const openWebStoreDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(WEB_STORAGE_DB, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(WEB_STORAGE_STORE);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
});

const readWebState = async (): Promise<WebPersistedState | null> => {
  const db = await openWebStoreDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(WEB_STORAGE_STORE, "readonly").objectStore(WEB_STORAGE_STORE).get(WEB_STORAGE_STATE_ID);
    request.onsuccess = () => resolve((request.result as WebPersistedState | undefined) ?? null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close()) as Promise<WebPersistedState | null>;
};

const writeWebState = async (state: WebPersistedState) => {
  const db = await openWebStoreDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(WEB_STORAGE_STORE, "readwrite").objectStore(WEB_STORAGE_STORE).put(state, WEB_STORAGE_STATE_ID);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
};

const normalizeOutlineNode = (node: any): OutlineNode => ({
  id: String(node?.id ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  name: String(node?.name ?? node?.title ?? "未命名文件"),
  children: Array.isArray(node?.children) ? node.children.map(normalizeOutlineNode) : [],
  includeInPreview: node?.includeInPreview === false ? false : true,
});

const normalizeContentMap = (content: any): DocContentMap => {
  if (!content) return {};
  if (typeof content === "string") return { root: content };
  if (typeof content !== "object") return {};
  return Object.fromEntries(Object.entries(content).filter(([, value]) => typeof value === "string")) as DocContentMap;
};

const normalizeMdocDocuments = (documents: any[], fallbackTitle: string): { children: OutlineNode[]; content: DocContentMap } => {
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

const createOutlineNode = (name: string): OutlineNode => ({
  id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: name || "未命名文件",
  children: [],
  includeInPreview: true,
});

const isHtmlContentEmpty = (html?: string) => !String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const isNodePreviewable = (node: OutlineNode, contentMap?: DocContentMap) =>
  node.includeInPreview !== false && !isHtmlContentEmpty(contentMap?.[node.id]);

const getFirstPreviewableNode = (nodes: OutlineNode[], contentMap?: DocContentMap): OutlineNode | null => {
  for (const node of nodes) {
    if (isNodePreviewable(node, contentMap)) return node;
    const found = getFirstPreviewableNode(node.children || [], contentMap);
    if (found) return found;
  }
  return null;
};

const resolvePreviewNodeId = (nodes: OutlineNode[], nodeId: string | undefined, contentMap?: DocContentMap): string => {
  if (!nodeId) return getFirstPreviewableNode(nodes, contentMap)?.id || nodes[0]?.id || "root";
  const node = findNode(nodes, nodeId);
  if (!node) return getFirstPreviewableNode(nodes, contentMap)?.id || nodeId;
  if (isNodePreviewable(node, contentMap)) return node.id;
  const inSubtree = getFirstPreviewableNode(node.children || [], contentMap);
  if (inSubtree) return inSubtree.id;
  return getFirstPreviewableNode(nodes, contentMap)?.id || node.id;
};

const buildEmptyOutlineTree = (_docName: string): OutlineNode[] => [];

const buildOutlineTree = (docName: string): OutlineNode[] => [createOutlineNode(docName || "未命名文件")];

const createStoredDoc = (name: string, children = buildOutlineTree(name), content: DocContentMap = {}): StoredDoc => ({
  name,
  children,
  content,
  updatedAt: new Date().toISOString(),
});

const normalizeStoredDoc = (name: string, raw: any): StoredDoc => {
  const docName = String(raw?.name ?? raw?.title ?? name);
  if (Array.isArray(raw?.documents)) {
    const normalized = normalizeMdocDocuments(raw.documents, docName);
    return createStoredDoc(docName, normalized.children, normalized.content);
  }
  const children = Array.isArray(raw?.children) ? raw.children.map(normalizeOutlineNode) : buildOutlineTree(docName);
  return createStoredDoc(docName, children, normalizeContentMap(raw?.content));
};

const flattenOutlineNodes = (nodes: OutlineNode[]): OutlineNode[] => nodes.flatMap((node) => [node, ...flattenOutlineNodes(node.children)]);

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const escapeScriptJson = (value: unknown) => JSON.stringify(value)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

const textToHtml = (text: string) => text
  .split(/\n{2,}/)
  .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
  .join("") || emptyParagraph;

const markdownToSimpleHtml = (text: string) => sanitizeHtml(marked.parse(text, { async: false }) as string || emptyParagraph);

type PreviewSection = { id: string; name: string; html: string };

const outlineExpandedIconPath = outlineSvg.p32aa7080;
const outlineCollapsedIconPath = outlineSvg.p2c70bb70;

const buildPreviewSections = (nodes: OutlineNode[], contentMap?: DocContentMap): PreviewSection[] =>
  flattenOutlineNodes(nodes)
    .filter((node) => isNodePreviewable(node, contentMap))
    .map((node) => {
      const html = contentMap?.[node.id] || emptyParagraph;
      return {
        id: node.id,
        name: node.name,
        html: html.trim().startsWith("<h1") ? html : `<h1>${escapeHtml(node.name)}</h1>${html}`,
      };
    });

const buildPreviewHtml = (title: string, sections: PreviewSection[], outlineTree?: OutlineNode[], initialNodeId?: string, contentMap?: DocContentMap) => {
  const sectionMap = sections.reduce<Record<string, PreviewSection>>((acc, section) => {
    acc[section.id] = section;
    return acc;
  }, {});
  const firstNodeId = resolvePreviewNodeId(outlineTree || [], initialNodeId || sections[0]?.id, contentMap);
  const fallbackHtml = sectionMap[firstNodeId]?.html || sections[0]?.html || `<h1>${escapeHtml(title)}</h1><p>暂无内容</p>`;

  const buildTreeHtml = (nodes: OutlineNode[], depth: number = 0): string => {
    return nodes.map(n => {
      const indent = depth * 16;
      const hasChildren = n.children.length > 0;
      const childrenHtml = hasChildren ? `<div class="tree-children">${buildTreeHtml(n.children, depth + 1)}</div>` : '';
      const toggleIcon = hasChildren ? `<svg class="tree-toggle-icon" fill="none" viewBox="0 0 12 12"><path class="tree-toggle-path" d="${outlineCollapsedIconPath}" fill="currentColor"></path></svg>` : '';
      const previewable = isNodePreviewable(n, contentMap) ? "1" : "0";
      return `<div class="tree-node" data-node-id="${escapeHtml(n.id)}" data-previewable="${previewable}"><div class="tree-item" data-node-id="${escapeHtml(n.id)}" data-previewable="${previewable}" style="padding-left:${indent + 12}px"><button class="tree-toggle" type="button" aria-label="展开或收起" data-expanded-path="${outlineExpandedIconPath}" data-collapsed-path="${outlineCollapsedIconPath}" ${hasChildren ? '' : 'disabled'}>${toggleIcon}</button><span class="tree-name">${escapeHtml(n.name)}</span></div>${childrenHtml}</div>`;
    }).join('');
  };
  const docTreeHtml = outlineTree && outlineTree.length > 0
    ? `<div class="doc-tree"><div class="tree-header">${escapeHtml(title)}</div>${buildTreeHtml(outlineTree)}</div>`
    : '';

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#131212;line-height:1.6;min-height:100vh;overflow-y:auto}
body::-webkit-scrollbar{width:6px}body::-webkit-scrollbar-thumb{background:#d0d1d6;border-radius:3px}body::-webkit-scrollbar-track{background:transparent}
.shell{display:grid;grid-template-columns:${docTreeHtml ? '260px ' : ''}minmax(0,760px) 220px;column-gap:48px;min-height:100vh;max-width:1320px;margin:0 auto}
.sidebar-left{overflow-y:auto;padding:20px 24px 20px 0;position:sticky;top:0;height:100vh;border-right:1px solid #ebecf0}
.sidebar-left::-webkit-scrollbar{width:4px}.sidebar-left::-webkit-scrollbar-thumb{background:#d0d1d6;border-radius:2px}.sidebar-left::-webkit-scrollbar-track{background:transparent}
.doc-tree{}.tree-header{font-size:15px;font-weight:600;color:#131212;padding:0 12px 12px;border-bottom:1px solid #ebecf0;margin-bottom:8px}.tree-item{display:flex;align-items:center;gap:6px;padding:7px 12px;cursor:pointer;font-size:13px;color:#303133;transition:background .15s;border-radius:8px}.tree-item:hover{background:#f5f6f8}.tree-item.active{background:#eef0f5;color:#131212;font-weight:500}.tree-toggle{width:20px;height:20px;border:none;border-radius:4px;background:transparent;color:#8d8e99;padding:0;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}.tree-toggle-icon{width:12px;height:12px;display:block}.tree-toggle:disabled{cursor:default}.tree-item.active .tree-toggle:not(:disabled){background:#dadbdf;color:#131212}.tree-children{display:none}.tree-node.expanded>.tree-children{display:block}.tree-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.content{overflow:visible;padding:32px 0 80px;height:auto;max-width:none;min-width:0}
.content::-webkit-scrollbar{width:4px}.content::-webkit-scrollbar-thumb{background:#d0d1d6;border-radius:2px}.content::-webkit-scrollbar-track{background:transparent}
.content h1{font-size:28px;line-height:1.35;font-weight:600;margin:0 0 24px;color:#131212;letter-spacing:-.01em}
.content h2{font-size:22px;line-height:1.4;font-weight:600;margin:36px 0 16px;color:#131212}
.content h3{font-size:18px;line-height:1.5;font-weight:600;margin:28px 0 12px;color:#131212}
.content h4,.content h5,.content h6{font-size:16px;line-height:1.55;font-weight:600;margin:24px 0 10px;color:#131212}
.content p{font-size:15px;line-height:1.85;margin:12px 0;color:#303133}
.content a{color:#134CFF;text-decoration:underline;text-underline-offset:2px}
.content ul,.content ol{padding-left:24px;margin:12px 0}
.content li{font-size:15px;line-height:1.8;margin:4px 0}
.content ul[data-type="taskList"],.content ul.doc-task-list{list-style:none;padding-left:0;margin:12px 0}
.content li[data-type="taskItem"],.content li.doc-task-item{list-style:none;display:flex;gap:8px;align-items:flex-start;margin:4px 0;padding-left:0}
.content li[data-type="taskItem"]>label,.content li.doc-task-item>label{margin-top:2px;flex-shrink:0}
.content li[data-type="taskItem"]>div,.content li.doc-task-item>div{flex:1;min-width:0}
.content li[data-type="taskItem"]>div>p,.content li.doc-task-item>div>p{margin:0}
.content [data-task-item="true"]{display:flex;align-items:flex-start;gap:8px;margin:4px 0;list-style:none}
.content table{border-collapse:collapse;width:100%;margin:16px 0}
.content td,.content th{border:1px solid #eef0f5;padding:8px 12px;text-align:left;font-size:14px}
.content tr:nth-child(odd) td,.content tr:nth-child(odd) th{background:rgba(238,240,245,.502)}
.content img{max-width:100%;border-radius:8px;border:1px solid #ebecf0}
.content blockquote{border-left:3px solid #134CFF;background:#f7f8fa;margin:16px 0;padding:12px 20px;color:#606266;border-radius:0 8px 8px 0}
.content pre{background:#f5f6f8;border:1px solid #ebecf0;border-radius:8px;padding:16px;overflow-x:auto;font-size:13px;line-height:1.7;position:relative;margin:16px 0}
.content pre code{font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.7}
.content hr{border:none;border-top:1px solid #ebecf0;margin:24px 0}
.copy-btn{position:absolute;top:8px;right:8px;z-index:2;height:26px;padding:0 10px;border:none;border-radius:6px;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);color:#707277;font-size:12px;cursor:pointer;display:none;align-items:center;font-family:inherit;transition:color .15s}.content pre:hover .copy-btn{display:flex}.copy-btn:hover{color:#131212;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.sidebar-right{overflow-y:auto;padding:32px 0 0;position:sticky;top:24px;align-self:start;max-height:calc(100vh - 48px)}
.sidebar-right::-webkit-scrollbar{width:4px}.sidebar-right::-webkit-scrollbar-thumb{background:#d0d1d6;border-radius:2px}.sidebar-right::-webkit-scrollbar-track{background:transparent}
.toc-header{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#131212;padding:0 12px 12px}.toc-hamburger{font-size:14px;color:#8d8e99}
.toc-item{display:block;line-height:1.8;text-decoration:none;padding:4px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s}.toc-item:hover{color:#131212!important}.toc-item.active{color:#134CFF!important;font-weight:600!important}
@media(max-width:860px){.sidebar-left,.sidebar-right{display:none}.shell{grid-template-columns:1fr;max-width:none}.content{padding:24px 20px}}
</style></head><body><div class="shell">${docTreeHtml ? `<aside class="sidebar-left">${docTreeHtml}</aside>` : ''}<main class="content">${fallbackHtml}</main><aside class="sidebar-right"><div class="toc-header"><span class="toc-hamburger">≡</span>在本页</div><div id="toc-list"></div></aside></div><script>
window.__DOC_SECTIONS__=${escapeScriptJson(sectionMap)};
window.__DOC_INITIAL__=${escapeScriptJson(firstNodeId)};
(function(){
var sections=window.__DOC_SECTIONS__||{};
var content=document.querySelector('.content');
var tocList=document.getElementById('toc-list');
function escapeText(s){return String(s||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]})}
function slug(s){return (s||'heading').replace(/[^a-zA-Z\u4e00-\u9fff0-9]/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'heading'}
function updateActiveToc(){if(!content||!tocList)return;var headings=Array.prototype.slice.call(content.querySelectorAll('h1,h2,h3,h4,h5,h6'));var active=headings[0];var top=window.scrollY+48;headings.forEach(function(h){if(h.getBoundingClientRect().top+window.scrollY<=top)active=h});tocList.querySelectorAll('.toc-item').forEach(function(a){a.classList.toggle('active',active&&a.getAttribute('href')==='#'+active.id)})}
function buildToc(){if(!content||!tocList)return;var ids={};var items=[];content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h){var text=(h.textContent||'').trim();if(!text)return;var key=slug(text);var count=ids[key]||0;ids[key]=count+1;var id=count>0?key+'-'+count:key;h.id=id;items.push({level:Number(h.tagName.slice(1)),text:text,id:id})});tocList.innerHTML=items.map(function(i){var indent=(i.level-1)*12;var size=i.level===1?'14px':'13px';var weight=i.level===1?'600':'400';var color=i.level===1?'#131212':'#8d8e99';return '<a href="#'+i.id+'" class="toc-item" style="padding-left:'+(indent+12)+'px;font-size:'+size+';font-weight:'+weight+';color:'+color+'">'+escapeText(i.text)+'</a>'}).join('');updateActiveToc()}
function bindCopy(){content.querySelectorAll('pre').forEach(function(p){if(p.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.textContent='复制';b.addEventListener('click',function(){var c=(p.querySelector('code')||{}).textContent||p.textContent||'';navigator.clipboard.writeText(c).then(function(){b.textContent='已复制';setTimeout(function(){b.textContent='复制'},2000)})});p.appendChild(b)})}
function updateTreeIcon(node){var btn=node&&node.querySelector('.tree-toggle:not(:disabled)');var path=btn&&btn.querySelector('.tree-toggle-path');if(path)path.setAttribute('d',node.classList.contains('expanded')?btn.getAttribute('data-expanded-path'):btn.getAttribute('data-collapsed-path'))}
function resolveId(id){if(sections[id])return id;var start=document.querySelector('.tree-node[data-node-id="'+CSS.escape(id||'')+'"]');function firstIn(node){if(!node)return null;if(node.getAttribute('data-previewable')==='1'&&sections[node.getAttribute('data-node-id')])return node.getAttribute('data-node-id');var kids=node.querySelectorAll(':scope > .tree-children > .tree-node');for(var i=0;i<kids.length;i++){var f=firstIn(kids[i]);if(f)return f}return null}var from=firstIn(start);if(from)return from;for(var k in sections){if(Object.prototype.hasOwnProperty.call(sections,k))return k}return id}
function selectNode(id){var real=resolveId(id);var s=sections[real];if(!s)return;if(content)content.innerHTML=s.html||'<h1>'+escapeText(s.name)+'</h1><p>暂无内容</p>';document.querySelectorAll('.tree-item').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-node-id')===real)});var node=document.querySelector('.tree-node[data-node-id="'+CSS.escape(real)+'"]');while(node){node.classList.add('expanded');updateTreeIcon(node);node=node.parentElement&&node.parentElement.closest('.tree-node')}buildToc();bindCopy();window.scrollTo({top:0})}
document.querySelectorAll('.tree-item').forEach(function(item){item.addEventListener('click',function(e){var target=e.target;var toggle=target&&target.closest&&target.closest('.tree-toggle');if(toggle){var node=item.closest('.tree-node');if(node&&toggle.disabled!==true){node.classList.toggle('expanded');updateTreeIcon(node)}return}selectNode(item.getAttribute('data-node-id'))})});
window.addEventListener('scroll',updateActiveToc);
selectNode(window.__DOC_INITIAL__);
})();
</script></body></html>`;
};

const sanitizeFileName = (name: string) => (name || "文档").replace(/[\\/:*?"<>|]/g, "_").trim() || "文档";

const cleanExportHtml = (html: string) => String(html || "")
  .replace(/<p>(\s*<br\s*\/?>\s*)+<\/p>/gi, "")
  .replace(/<p>(&nbsp;|\s)*<\/p>/gi, "")
  .replace(/<p><\/p>/gi, "");

const headingsToWordParagraphs = (html: string) => {
  const sizes: Record<string, number> = { "1": 22, "2": 18, "3": 15, "4": 14, "5": 14, "6": 14 };
  return String(html || "")
    .replace(/<h([1-6])(\s[^>]*)?>/gi, (_full, level) => `<p style="font-size:${sizes[level] || 14}px;font-weight:700;margin-top:6px!important;margin-bottom:3px!important;line-height:1.3">`)
    .replace(/<\/h[1-6]>/gi, "</p>");
};

const wordHtmlDocument = (title: string, content: string, options: { skipTitle?: boolean } = {}) => {
  const body = options.skipTitle ? cleanExportHtml(content) : `<h1>${escapeHtml(title || "未命名文档")}</h1>${cleanExportHtml(content)}`;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1F2329}.word-page{width:100%}p{margin:0 0 4px}ul,ol{margin:2px 0 4px;padding-left:22px}li{margin:0}img{max-width:560px;width:auto;height:auto;display:block;margin:4px auto}table{border-collapse:collapse;width:100%;margin:4px 0}th,td{border:1px solid #DDE1E6;padding:4px 8px;text-align:left;vertical-align:top;font-size:13px}th{background:#F5F7FA;font-weight:700}blockquote{border-left:3px solid #005EFF;padding:3px 10px;margin:4px 0;background:#F0F5FF;color:#4E5969}pre{background:#F5F7FA;padding:5px 10px;margin:4px 0;white-space:pre-wrap}code{background:#F2F3F5;padding:1px 3px}hr{border:none;border-top:1px solid #DDE1E6;margin:6px 0}</style></head><body><div class="word-page">${headingsToWordParagraphs(body)}</div></body></html>`;
};

const pdfPrintHtmlDocument = (title: string, content: string, options: { skipTitle?: boolean } = {}) => {
  const body = options.skipTitle ? cleanExportHtml(content) : `<h1 class="pdf-title">${escapeHtml(title || "未命名文档")}</h1>${cleanExportHtml(content)}`;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${escapeHtml(title || "PDF")}</title><style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.8;color:#131212;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pdf-page{width:100%;max-width:100%;margin:0;padding:0;word-wrap:break-word;overflow-wrap:anywhere}
.pdf-title{font-size:24px;font-weight:600;line-height:1.35;margin:0 0 16px;padding:0 0 12px;border-bottom:1px solid #ebecf0;color:#131212}
h1{font-size:22px;font-weight:600;margin:20px 0 12px;line-height:1.4;color:#131212}
h2{font-size:18px;font-weight:600;margin:18px 0 10px;line-height:1.45;color:#131212}
h3{font-size:16px;font-weight:600;margin:16px 0 8px;line-height:1.5;color:#131212}
h4,h5,h6{font-size:15px;font-weight:600;margin:14px 0 8px;line-height:1.5;color:#131212}
p{margin:0 0 12px}
ul,ol{margin:0 0 12px;padding-left:24px}
li{margin:4px 0}
img,.doc-image{max-width:100%!important;width:auto!important;max-height:220mm;height:auto!important;display:block;margin:12px 0;border-radius:8px;object-fit:contain;page-break-inside:avoid;break-inside:avoid}
video,.doc-video{display:none!important}
table{width:100%;border-collapse:collapse;margin:12px 0;page-break-inside:avoid}
th,td{border:1px solid #ebecf0;padding:8px 12px;text-align:left;vertical-align:top;font-size:14px}
th{background:#f7f8fa;font-weight:600}
blockquote{border-left:3px solid #134CFF;padding:12px 20px;margin:12px 0;background:#f7f8fa;color:#606266;border-radius:0 8px 8px 0}
pre{background:#f7f8fa;padding:12px 16px;margin:12px 0;white-space:pre-wrap;border-radius:8px;font-size:13px}
code{background:#f2f3f5;padding:1px 4px;border-radius:4px;font-size:0.92em}
hr{border:none;border-top:1px solid #ebecf0;margin:20px 0}
a{color:#134CFF;text-decoration:underline}
.doc-attachment{display:inline-flex;align-items:center;background:#f7f8fa;border:1px solid #ebecf0;border-radius:8px;color:#303133;font-size:13px;margin:12px 0;padding:10px 12px;text-decoration:none}
</style></head><body><main class="pdf-page">${body}</main><script>
window.addEventListener('load',function(){
  var imgs=Array.from(document.images||[]);
  Promise.all(imgs.map(function(img){
    if(img.complete&&img.naturalWidth>0)return Promise.resolve();
    return new Promise(function(resolve){
      var done=function(){resolve()};
      img.addEventListener('load',done,{once:true});
      img.addEventListener('error',done,{once:true});
      if(img.decode)img.decode().then(done).catch(done);
      setTimeout(done,15000);
    });
  })).then(function(){setTimeout(function(){window.print()},160)}).catch(function(){setTimeout(function(){window.print()},160)});
});
</script></body></html>`;
};

function countDescendants(node: OutlineNode): number {
  return node.children.reduce((acc, child) => acc + 1 + countDescendants(child), 0);
}

function buildDeleteMessage(type: "doc" | "branch" | "leaf", name: string, count?: number): string {
  if (type === "doc") return `确定删除【${name}】及其下 ${count ?? 0} 个子文档？\n不可撤销。`;
  if (type === "branch") return `确定删除【${name}】及其下 ${count} 个子文件内容？\n不可撤销。`;
  return `确定删除【${name}】内容？\n不可撤销。`;
}

function DeleteConfirmModal({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  const lines = message.split("\n");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[378px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.1)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between px-[24px] h-[56px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[normal]">提示</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d={deleteSvg.p163cf00} stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
        {/* 内容 */}
        <div className="flex items-start gap-[8px] px-[24px] pb-[20px]">
          <div className="relative shrink-0 size-[20px] mt-[1px]">
            <svg className="block size-full" fill="none" viewBox="0 0 20 20">
              <path d={deleteSvg.pf7a1b80} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="flex flex-col">
            {lines.map((line, i) => (
              <p key={i} className="font-['PingFang_SC:Regular',sans-serif] text-[#606266] text-[14px] leading-[1.6]">{line}</p>
            ))}
          </div>
        </div>
        {/* 按钮 */}
        <div className="flex items-center justify-end gap-[12px] px-[24px] pb-[16px]">
          <button
            className="h-[34px] px-[16px] rounded-[6px] border border-[#ebecf0] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
          >取消</button>
          <button
            className="h-[34px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={() => { onConfirm(); onClose(); }}
          >确定</button>
        </div>
      </div>
    </div>
  );
}

function findNode(nodes: OutlineNode[], id: string): OutlineNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function findNodeDepth(nodes: OutlineNode[], id: string, depth = 0): number {
  for (const n of nodes) {
    if (n.id === id) return depth;
    const d = findNodeDepth(n.children, id, depth + 1);
    if (d >= 0) return d;
  }
  return -1;
}

function OutlineIllustration() {
  return (
    <div className="relative w-[400px] h-[300px] shrink-0">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 400 300">
        <path clipRule="evenodd" d={outlineSvg.p385aee00} fill="#EBECF0" fillRule="evenodd" opacity="0.51" />
        <path d={outlineSvg.p2b635c00} stroke="#131212" strokeWidth="1.2" />
        <path d={outlineSvg.p97e4930} stroke="#131212" strokeWidth="1.2" />
        <path d={outlineSvg.p1cf8d280} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p3e27a680} fill="#134CFF" fillRule="evenodd" />
        <path d={outlineSvg.p7d22400} stroke="#0012DD" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p10511500} fill="#134CFF" fillRule="evenodd" />
        <path d={outlineSvg.p174c8ef0} stroke="#0012DD" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p36673280} fill="#134CFF" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.p3d246700} fill="#EBECF0" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.pb50b100} fill="#EBECF0" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.p399afe00} fill="white" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.p4108780} fill="#134CFF" fillRule="evenodd" />
        <path d={outlineSvg.p35775a00} stroke="#0012DD" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p12583b80} fill="#134CFF" fillRule="evenodd" />
        <path d={outlineSvg.p4ae8500} stroke="#0012DD" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p117f8c80} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p1ba2fb00} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p158e1800} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.pe2b8c00} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p2c3ea380} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p3175d700} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p3c7c1180} fill="#EBECF0" fillRule="evenodd" />
        <path d={outlineSvg.p3c84cc00} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p28eb7d00} fill="#EBECF0" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.p36e70300} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.pa966a80} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.pa82f0} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p3c0a5400} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.pfa79800} fill="#EBECF0" fillRule="evenodd" />
        <path d={outlineSvg.p199c0000} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p11a46300} fill="#EBECF0" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.p30693300} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p30693300} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p17af9280} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p17af9280} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p239c5c00} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p39435200} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p1ea6e000} fill="#131212" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.p152ce100} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p152ce100} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p1d3bee00} fill="#134CFF" fillRule="evenodd" />
        <path d={outlineSvg.p33014400} stroke="#0012DD" strokeWidth="1.2" />
        <path d={outlineSvg.p135b8100} stroke="#131212" strokeWidth="1.2" />
        <path d={outlineSvg.p26fc9800} fill="white" />
        <path clipRule="evenodd" d={outlineSvg.p949eb00} fill="white" fillRule="evenodd" />
        <path d={outlineSvg.p3b8b3900} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p3a3f0ac0} fill="#131212" fillRule="evenodd" />
        <path d={outlineSvg.p72f6f00} stroke="#131212" strokeWidth="1.2" />
        <path d={outlineSvg.p90e3400} stroke="#131212" strokeWidth="1.2" />
        <path d={outlineSvg.p21e58b00} stroke="#131212" strokeWidth="1.2" />
        <path d={outlineSvg.p5b99900} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p3619dbf0} fill="#EBECF0" fillRule="evenodd" />
        <path clipRule="evenodd" d={outlineSvg.p2834d200} fill="#EBECF0" fillRule="evenodd" opacity="0.51" />
        <path clipRule="evenodd" d={outlineSvg.p27505d80} fill="#131212" fillRule="evenodd" />
        <path d={outlineSvg.p226ce00} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p390760f0} fill="#131212" fillRule="evenodd" />
        <path d={outlineSvg.p3b896780} stroke="#131212" strokeWidth="1.2" />
        <path d={outlineSvg.p22239260} stroke="#131212" strokeWidth="1.2" />
        <path clipRule="evenodd" d={outlineSvg.p2dbff300} fill="#131212" fillRule="evenodd" />
      </svg>
    </div>
  );
}

function IllustrationSvg() {
  return (
    <div className="relative w-[400px] h-[300px] shrink-0">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 400 300">
        <g id="Frame">
          <path d={svgPaths.p2a62ee00} id="Vector" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p2be36580} id="Vector_2" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p1662df00} id="Vector_3" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p260a5b00} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector_4" />
          <path clipRule="evenodd" d={svgPaths.p3130ad00} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_5" />
          <path d={svgPaths.p1b31680} id="Vector_6" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p23224700} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_7" />
          <path d={svgPaths.p34a24b00} id="Vector_8" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p69e2e80} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_9" />
          <path d={svgPaths.p339e4680} id="Vector_10" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p3473d400} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_11" />
          <path d={svgPaths.p25ab780} id="Vector_12" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.pe2a7200} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_13" />
          <path d={svgPaths.p2ec12e00} id="Vector_14" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p193e2600} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_15" />
          <path d={svgPaths.p1859fac0} id="Vector_16" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.pf2bd80} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_17" />
          <path d={svgPaths.p315dee00} id="Vector_18" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p2210a000} fill="var(--fill-0, #93959F)" fillRule="evenodd" id="Vector_19" />
          <path d={svgPaths.p15633700} id="Vector_20" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p384e2400} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_21" />
          <path d={svgPaths.p384e2400} id="Vector_22" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p8bc77c0} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_23" />
          <path d={svgPaths.p8bc77c0} id="Vector_24" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.pa469040} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_25" />
          <path d={svgPaths.p35ac9d00} id="Vector_26" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p3888c800} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_27" />
          <path d={svgPaths.p2f63d500} id="Vector_28" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p2cca1d80} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector_29" />
          <path d={svgPaths.p1796b680} id="Vector_30" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p5328500} id="Vector_31" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p31ece000} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector_32" />
          <path d={svgPaths.p37645d00} id="Vector_33" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p1d351100} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector_34" />
          <path d={svgPaths.p11777180} id="Vector_35" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p4050e80} id="Vector_36" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p9560400} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector_37" />
          <path clipRule="evenodd" d={svgPaths.p24d8380} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_38" />
          <path d={svgPaths.p6568500} id="Vector_39" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p3d36a900} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector_40" />
          <path clipRule="evenodd" d={svgPaths.p79ec700} fill="var(--fill-0, #134CFF)" fillRule="evenodd" id="Vector_41" />
          <path d={svgPaths.p3cecd280} id="Vector_42" stroke="var(--stroke-0, #0012DD)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p10f33c00} fill="var(--fill-0, #134CFF)" fillRule="evenodd" id="Vector_43" />
          <path d={svgPaths.p30fad880} id="Vector_44" stroke="var(--stroke-0, #0012DD)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p3cc94600} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_45" />
          <path d={svgPaths.p1e53c840} id="Vector_46" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p6235b80} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_47" />
          <path d={svgPaths.p6235b80} id="Vector_48" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p36fb100} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_49" />
          <path d={svgPaths.p239d0c80} id="Vector_50" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p391b0d00} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_51" />
          <path d={svgPaths.p391b0d00} id="Vector_52" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p30710d80} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_53" />
          <path d={svgPaths.p2b08e600} id="Vector_54" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p1eaa8c00} id="Vector_55" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.pb43b400} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_56" />
          <path d={svgPaths.pfda4700} id="Vector_57" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p2fc5cc00} id="Vector_58" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p2ef1100} id="Vector_59" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p22a97800} id="Vector_60" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path d={svgPaths.p3b326680} id="Vector_61" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p9016500} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_62" />
          <path d={svgPaths.p2afa1b00} id="Vector_63" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p1a264e00} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_64" />
          <path d={svgPaths.p194c9380} id="Vector_65" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p23489280} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_66" />
          <path d={svgPaths.p3d15c900} id="Vector_67" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p5a5d500} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_68" />
          <path d={svgPaths.p353b0a00} id="Vector_69" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.pb206f00} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_70" />
          <path d={svgPaths.p2ca27800} id="Vector_71" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p146d1600} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_72" />
          <path d={svgPaths.p20384d80} id="Vector_73" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p2e18e600} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_74" />
          <path d={svgPaths.p36db4400} id="Vector_75" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p16e75800} fill="var(--fill-0, #EBECF0)" fillRule="evenodd" id="Vector_76" />
          <path d={svgPaths.p26c5c900} id="Vector_77" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p6ca4200} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_78" />
          <path d={svgPaths.p1315ff00} id="Vector_79" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p2e3de4f0} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_80" />
          <path d={svgPaths.p200abf80} id="Vector_81" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p32e26c70} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector_82" />
          <path d={svgPaths.pc45f600} id="Vector_83" stroke="var(--stroke-0, black)" strokeWidth="1.2" />
          <path clipRule="evenodd" d={svgPaths.p34512380} fill="var(--fill-0, #134CFF)" fillRule="evenodd" id="Vector_84" />
          <path d={svgPaths.p44f780} id="Vector_85" stroke="var(--stroke-0, #0012DD)" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-[12px]">
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">编辑器渲染异常</p>
          <button className="px-[12px] py-[6px] rounded-[6px] bg-[#134CFF] text-white text-[13px] cursor-pointer hover:opacity-80"
            onClick={() => this.setState({ hasError: false })}>重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function EditorToolBtn({ label, cmd, exec, activeFormats, children, action, getBtnRef }: {
  label: string; cmd?: string; exec?: (c: string, v?: string) => void;
  activeFormats?: Set<string>; children: React.ReactNode; action?: (e: React.MouseEvent<HTMLButtonElement>) => void; getBtnRef?: (el: HTMLButtonElement | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const [tipPos, setTipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const ref = useRef<HTMLButtonElement>(null);
  const handledPointerRef = useRef(false);
  const runAction = (e: React.MouseEvent<HTMLButtonElement>) => {
    action ? action(e) : (cmd && exec?.(cmd));
  };
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handledPointerRef.current = true;
    runAction(e);
  };
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (handledPointerRef.current) {
      handledPointerRef.current = false;
      return;
    }
    runAction(e);
  };
  const handleEnter = () => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setTipPos({ x: r.left + r.width / 2, y: r.top - 4 });
    }
    setHover(true);
  };
  return (
    <div className="relative">
      <button
        ref={(el) => { ref.current = el; getBtnRef?.(el); }}
        type="button"
        aria-label={label}
        title={label}
        className={`rounded-[4px] shrink-0 size-[28px] cursor-pointer transition-colors relative bg-transparent border-0 p-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#134CFF] focus-visible:outline-offset-1 ${hover || (cmd && activeFormats?.has(cmd)) ? "bg-[#f5f6f8]" : ""} active:bg-[#ebecf0]`}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHover(false)}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {children}
      </button>
      {hover && createPortal(
        <div
          className="fixed z-[290] bg-white border border-[#ebecf0] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] text-[#131212] text-[14px] px-[8px] py-[8px] rounded-[8px] pointer-events-none whitespace-nowrap"
          style={{ left: tipPos.x, top: tipPos.y, transform: "translate(-50%, -100%)" }}
        >
          {label}
        </div>,
        document.body,
      )}
    </div>
  );
}

const FONT_FAMILIES = ["系统默认", "PingFang SC", "Microsoft YaHei", "SimSun", "KaiTi"];
const FONT_SIZES = ["12px","13px","14px","15px","16px","17px","18px","20px","22px","24px","26px","28px","30px","32px"];
const HEADING_OPTIONS = ["正文","一级标题","二级标题","三级标题","四级标题","五级标题"];
const COLOR_PRESETS = [
  "#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#efefef","#f3f3f3","#ffffff",
  "#980000","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff",
  "#e6b8af","#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#c9daf8","#cfe2f3","#d9d2e9","#ead1dc",
  "#dd7e6b","#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#a4c2f4","#9fc5e8","#b4a7d6","#d5a6bd",
  "#cc4125","#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6d9eeb","#6fa8dc","#8e7cc3","#c27ba0",
  "#a61c00","#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3c78d8","#3d85c6","#674ea7","#a64d79",
  "#85200c","#990000","#b45f06","#bf9000","#38761d","#134f5c","#1155cc","#0b5394","#351c75","#741b47"
];

const normalizeHexColor = (value: unknown, fallback = "#000000"): string => {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const toHex = (n: string) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0");
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }
  return fallback;
};

function ColorPicker({
  onSelect,
  onClose,
  position,
  currentColor,
  mode = "fore",
}: {
  onSelect: (color: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
  currentColor: string;
  mode?: "fore" | "back";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = normalizeHexColor(currentColor, mode === "back" ? "#fef0f0" : "#000000");
  const [customColor, setCustomColor] = useState(initial);
  const [previewColor, setPreviewColor] = useState(initial);
  useEffect(() => {
    const next = normalizeHexColor(currentColor, mode === "back" ? "#fef0f0" : "#000000");
    setCustomColor(next);
    setPreviewColor(next);
  }, [currentColor, mode]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = window.setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);
  const applyColor = (color: string) => {
    const next = normalizeHexColor(color, previewColor);
    setCustomColor(next);
    setPreviewColor(next);
    onSelect(next);
  };
  return createPortal(
    <div
      ref={ref}
      className="fixed z-[280] bg-white rounded-[12px] shadow-[0px_12px_24px_-4px_rgba(36,36,36,0.12)] border border-[#ebecf0] p-[12px] w-[260px]"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-[8px]">
        <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px]">{mode === "back" ? "背景颜色" : "文字颜色"}</p>
        <button type="button" className="size-[20px] flex items-center justify-center rounded-[4px] hover:bg-[#f5f6f8] cursor-pointer text-[#8d8e99]" onClick={onClose}>&times;</button>
      </div>
      <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] mb-[6px]">预设颜色</p>
      <div className="h-[28px] rounded-[6px] border border-[#d0d0d0] mb-[10px]" style={{ background: previewColor }} />
      <div className="grid grid-cols-10 gap-[3px] mb-[10px]">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={`size-[20px] rounded-[3px] cursor-pointer transition-transform border p-0 ${c === previewColor ? "border-[#131212] scale-110" : "border-[rgba(0,0,0,0.1)] hover:scale-110 hover:border-[#131212]"}`}
            style={{ background: c }}
            onMouseEnter={() => setPreviewColor(c)}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyColor(c);
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-[8px] border-t border-[#ebecf0] pt-[8px]">
        <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] shrink-0">自定义</p>
        <label className="relative size-[28px] shrink-0 rounded-[4px] flex items-center justify-center cursor-pointer hover:bg-[#f5f6f8] transition-colors">
          <svg className="block size-[16px]" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M8.00027 4V4.02215M4.02225 8.00017H4.0001M10.8287 5.1717L10.8131 5.18736M5.18755 10.8129L5.17188 10.8285M5.18755 5.18711L5.17188 5.17144M8.0001 14.4C4.46548 14.4 1.6001 11.5346 1.6001 8C1.6001 4.46538 4.46548 1.6 8.0001 1.6C11.5347 1.6 14.4001 4.46538 14.4001 8C14.4001 9.07604 13.4058 9.792 12.3298 9.792H11.9121C11.6964 9.792 11.4837 9.84221 11.2907 9.93867C10.6044 10.2818 10.3263 11.1164 10.6694 11.8026C10.7659 11.9956 10.8161 12.2083 10.8161 12.424V12.5501C10.8161 13.2838 10.4044 13.9786 9.69676 14.1727C9.15641 14.3209 8.58749 14.4 8.0001 14.4Z" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="color"
            value={normalizeHexColor(customColor, previewColor)}
            onChange={(e) => applyColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer border-none p-0"
            title="选择颜色"
          />
        </label>
        <input
          type="text"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 h-[28px] rounded-[4px] border border-[#ebecf0] px-[8px] text-[12px] text-[#131212] outline-none focus:border-[#134CFF]"
          style={{ fontFamily: "monospace" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && /^#[0-9a-fA-F]{3,6}$/.test((e.target as HTMLInputElement).value)) {
              applyColor((e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? "bg-[#15803D]" : type === "error" ? "bg-[#E53E3E]" : "bg-[#131212]";
  return createPortal(
    <div className={`fixed top-[16px] left-1/2 -translate-x-1/2 z-[300] ${bg} text-white text-[14px] px-[16px] py-[8px] rounded-[8px] shadow-lg pointer-events-none`}
      style={{ fontFamily: "PingFang SC, sans-serif" }}>{message}</div>,
    document.body,
  );
}

function MoreMenu({ onClose, position, onInsertHr, onInsertCodeBlock }: { onClose: () => void; position: { x: number; y: number }; onInsertHr: () => void; onInsertCodeBlock: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const items = [
    { label: "分割线", icon: <path d="M3 10H17M3 14H17" stroke="#131212" strokeLinecap="round" strokeWidth="1.2"/>, action: onInsertHr },
    { label: "代码块", icon: <path d="M6 7L3 10L6 13M10 7L13 10L10 13" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/>, action: onInsertCodeBlock },
  ];
  return createPortal(
    <div ref={ref} className="fixed z-[280] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] p-[4px] flex flex-col gap-[4px] min-w-[120px]"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}>
      {items.map(({ label, icon, action }) => (
        <div key={label} className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] text-[14px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap"
          style={{ fontFamily: "PingFang SC, sans-serif" }}
          onClick={() => { action(); onClose(); }}>
          <div className="relative shrink-0 size-[16px]"><svg className="block size-full" fill="none" viewBox="0 0 20 20">{icon}</svg></div>
          {label}
        </div>
      ))}
    </div>,
    document.body,
  );
}

function RichEditor({ nodeId, initialHtml, onContentChange, fontSize: propFontSize, lineHeight: propLineHeight, theme: propTheme }: {
  nodeId: string; initialHtml?: string; onContentChange?: (html: string, text: string) => void;
  fontSize?: string; lineHeight?: string; theme?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("unsaved");
  const [charCount, setCharCount] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [tocHeadings, setTocHeadings] = useState<{ tag: string; text: string; id: string }[]>([]);
  const [tocActiveId, setTocActiveId] = useState<string | null>(null);
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const [tableToolbarPos, setTableToolbarPos] = useState({ top: 0, left: 0 });
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [tableResizing, setTableResizing] = useState<{col: number; table: HTMLTableElement; startX: number; startW: number} | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<"fore" | "back" | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });
  const foreColorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [headingDropPos, setHeadingDropPos] = useState({ x: 0, y: 0 });
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [fontDropPos, setFontDropPos] = useState({ x: 0, y: 0 });
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [sizeDropPos, setSizeDropPos] = useState({ x: 0, y: 0 });
  const [alignDropPos, setAlignDropPos] = useState({ x: 0, y: 0 });
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [currentHeading, setCurrentHeading] = useState("一级标题");
  const [currentFont, setCurrentFont] = useState("系统默认");
  const [currentSize, setCurrentSize] = useState("15px");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [moreMenuPos, setMoreMenuPos] = useState({ x: 0, y: 0 });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalText, setLinkModalText] = useState("");
  const [linkModalUrl, setLinkModalUrl] = useState("");
  const [linkModalMode, setLinkModalMode] = useState<"insert" | "edit">("insert");
  const [linkModalPos, setLinkModalPos] = useState({ x: 0, y: 0 });
  const linkBtnRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ top: number; left: number; maxHeight?: number } | null>(null);
  const slashIdxRef = useRef(-1);
  const slashMenuElRef = useRef<HTMLDivElement | null>(null);
  const preEmptyRef = useRef(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [selectedImgRect, setSelectedImgRect] = useState<DOMRect | null>(null);
  const [editorVisibleRect, setEditorVisibleRect] = useState<DOMRect | null>(null);
  const imgOverlayFrame = useRef<number | null>(null);
  const [imgResize, setImgResize] = useState<{ startX: number; startY: number; startW: number; startH: number; handle: string; img: HTMLImageElement } | null>(null);
  const [imageRatioLocked, setImageRatioLocked] = useState(true);
  const [imgBarSlider, setImgBarSlider] = useState(false);

  const SlashIcon = ({ path, isFill }: { path: string | string[]; isFill?: boolean }) => (
    <svg className="block size-[16px]" fill="none" viewBox="0 0 20 20">
      {(Array.isArray(path) ? path : [path]).map((d, i) => isFill
        ? <path key={i} d={d} fill="#131212" />
        : <path key={i} d={d} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
      )}
    </svg>
  );

  const slashItems = [
    { label: "一级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H1</span>, action: () => exec("formatBlock", "<h1>") },
    { label: "二级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H2</span>, action: () => exec("formatBlock", "<h2>") },
    { label: "三级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H3</span>, action: () => exec("formatBlock", "<h3>") },
    { label: "正文", icon: <span className="text-[11px] font-semibold text-[#131212]">T</span>, action: () => exec("formatBlock", "<p>") },
    { label: "有序列表", icon: <SlashIcon path={editorSvg.p31fc8400} />, action: () => exec("insertHTML", '<ol style="margin:8px 0;padding-left:24px;list-style:decimal"><li>&nbsp;</li></ol>') },
    { label: "无序列表", icon: <SlashIcon path={editorSvg.p1ddeb0c0} />, action: () => exec("insertHTML", '<ul style="margin:8px 0;padding-left:24px;list-style:disc"><li>&nbsp;</li></ul>') },
    { label: "引用块", icon: <SlashIcon path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill />, action: () => toggleBlockquote() },
    { label: "代码块", icon: <SlashIcon path={editorSvg.p36d5aa00} />, action: () => exec("insertHTML", '<pre style="background:#f5f5f5;border-radius:4px;padding:12px;font-family:monospace;font-size:13px;overflow-x:auto;margin:8px 0">&nbsp;</pre>') },
    { label: "表格", icon: <SlashIcon path={editorSvg.p808b680} />, action: () => { handleTableInsert(); } },
    { label: "分割线", icon: <svg className="block size-[16px]" fill="none" viewBox="0 0 20 20"><path d="M3 10H17" stroke="#131212" strokeLinecap="round" strokeWidth="1.2" /></svg>, action: () => exec("insertHorizontalRule") },
  ];

  const updateFormats = useCallback(() => {
    try {
      const s = new Set<string>();
      if (document.queryCommandState("bold")) s.add("bold");
      if (document.queryCommandState("italic")) s.add("italic");
      if (document.queryCommandState("strikeThrough")) s.add("strikeThrough");
      if (document.queryCommandState("underline")) s.add("underline");
      const sel = window.getSelection();
      if (sel?.anchorNode) {
        const node = (sel.anchorNode as HTMLElement);
        if (node.closest?.("blockquote")) s.add("blockquote");
        // 同步标题下拉框：根据当前光标所在块级标签判断层级
        const blockEl = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
        if (blockEl?.closest?.("a")) s.add("link");
        const tag = blockEl?.closest?.("h1,h2,h3,h4,h5,h6,p,blockquote,pre,li")?.tagName?.toLowerCase();
        const headingMap: Record<string, string> = { h1: "一级标题", h2: "二级标题", h3: "三级标题", h4: "四级标题", h5: "五级标题" };
        const detected = headingMap[tag ?? ""] ?? "正文";
        setCurrentHeading((prev) => (prev === detected ? prev : detected));
      }
      setActiveFormats(s);
    } catch (e) { console.error("updateFormats error:", e); }
  }, []);

  const normalizeEditorHtml = (html: string) => {
    const container = document.createElement("div");
    container.innerHTML = html || emptyParagraph;
    container.querySelectorAll('div:has(input[type="checkbox"])').forEach((item) => {
      const el = item as HTMLElement;
      el.setAttribute("data-task-item", "true");
      el.style.cssText = "display:flex;align-items:flex-start;gap:8px;margin:4px 0";
      const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (input) input.style.cssText = "cursor:pointer;flex-shrink:0;width:14px;height:14px;margin:6px 0 0";
      const spans = Array.from(el.querySelectorAll('span[contenteditable="true"]')) as HTMLElement[];
      spans.forEach((span, index) => {
        span.style.cssText = "flex:1;outline:none;word-break:break-word;min-width:0;display:block";
        if (index > 0 && !span.textContent?.trim()) span.remove();
      });
      const parent = el.parentElement;
      if (parent?.tagName === "P") parent.after(el);
    });
    container.querySelectorAll("p").forEach((p) => {
      if (!p.textContent?.trim() && p.children.length === 0) p.remove();
    });
    return container.innerHTML || emptyParagraph;
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = normalizeEditorHtml(initialHtml || emptyParagraph);
    if (el.innerHTML !== html) el.innerHTML = html;
    clearSelectedImg();
    const text = el.innerText ?? "";
    setCharCount(text.replace(/\s/g, "").length);
    setSaveStatus("saved");
    updateToc();
  }, [nodeId, initialHtml]);

  const handleInput = () => {
    try {
      const el = editorRef.current;
      const text = el?.innerText ?? "";
      setCharCount(text.replace(/\s/g, "").length);
      setSaveStatus("unsaved");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveStatus("saving");
        setTimeout(() => {
          const now = new Date();
          setSavedAt(`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
          setSaveStatus("saved");
        }, 200);
      }, 800);
      onContentChange?.(el?.innerHTML ?? "", text);
      updateFormats();
      updateToc();
    } catch (e) { console.error("handleInput error:", e); }
  };

  const exec = (cmd: string, value?: string) => {
    try {
      if (editorRef.current && !editorRef.current.isEqualNode(document.activeElement)) editorRef.current?.focus();
      document.execCommand(cmd, false, value);
      updateFormats();
    } catch (e) {
      console.error("execCommand error:", cmd, value, e);
    }
  };

  const rememberSelection = () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount || sel.getRangeAt(0).collapsed || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const root = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer as HTMLElement
      : range.commonAncestorContainer.parentElement;
    if (root && editorRef.current.contains(root)) savedRangeRef.current = range.cloneRange();
  };

  const isRangeInEditor = (range: Range) => {
    if (!editorRef.current) return false;
    const root = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer as HTMLElement
      : range.commonAncestorContainer.parentElement;
    return !!root && editorRef.current.contains(root);
  };

  const getLinkFromNode = (node: Node | null) => {
    if (!node || !editorRef.current) return null;
    const el = node.nodeType === 1 ? node as HTMLElement : node.parentElement;
    const link = el?.closest?.("a") as HTMLAnchorElement | null;
    return link && editorRef.current.contains(link) ? link : null;
  };

  const getCurrentLink = () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;
    return getLinkFromNode(sel.anchorNode) || getLinkFromNode(sel.focusNode);
  };

  const getLinkRange = () => {
    const sel = window.getSelection();
    if (sel?.rangeCount && isRangeInEditor(sel.getRangeAt(0))) return sel.getRangeAt(0).cloneRange();
    if (savedRangeRef.current && isRangeInEditor(savedRangeRef.current)) return savedRangeRef.current.cloneRange();
    return null;
  };

  const openLinkModal = (position: { x: number; y: number }) => {
    const currentLink = getCurrentLink();
    if (currentLink) {
      activeLinkRef.current = currentLink;
      savedRangeRef.current = null;
      setLinkModalMode("edit");
      setLinkModalText(currentLink.textContent || "");
      setLinkModalUrl(currentLink.getAttribute("href") || "");
      setLinkModalPos(position);
      setShowLinkModal(true);
      return;
    }
    const range = getLinkRange();
    activeLinkRef.current = null;
    setLinkModalMode("insert");
    setLinkModalUrl("");
    if (!range) {
      editorRef.current?.focus();
      const fallbackRange = document.createRange();
      fallbackRange.selectNodeContents(editorRef.current!);
      fallbackRange.collapse(false);
      savedRangeRef.current = fallbackRange;
      setLinkModalText("");
    } else {
      savedRangeRef.current = range;
      setLinkModalText(range.toString());
    }
    setLinkModalPos(position);
    setShowLinkModal(true);
  };

  const insertLink = ({ text, url }: { text: string; url: string }) => {
    const existingLink = activeLinkRef.current;
    if (existingLink && editorRef.current?.contains(existingLink)) {
      existingLink.href = url;
      existingLink.target = "_blank";
      existingLink.rel = "noreferrer";
      existingLink.textContent = text.trim() || url;
      existingLink.style.color = "#134CFF";
      existingLink.style.textDecoration = "underline";
      existingLink.style.cursor = "pointer";
      activeLinkRef.current = null;
      savedRangeRef.current = null;
      setLinkModalText("");
      setLinkModalUrl("");
      setToast({ message: "链接已更新", type: "success" });
      handleInput();
      updateFormats();
      return;
    }
    const range = savedRangeRef.current;
    if (!range || !editorRef.current) return;
    const sel = window.getSelection();
    editorRef.current.focus();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const label = text.trim() || (!range.collapsed ? range.toString() : "") || url;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    link.style.color = "#134CFF";
    link.style.textDecoration = "underline";
    link.style.cursor = "pointer";

    range.deleteContents();
    range.insertNode(link);

    const after = document.createRange();
    after.setStartAfter(link);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);
    savedRangeRef.current = null;
    activeLinkRef.current = null;
    setLinkModalText("");
    setLinkModalUrl("");
    setToast({ message: "链接已插入", type: "success" });
    handleInput();
    updateFormats();
  };

  const removeCurrentLink = () => {
    const link = getCurrentLink();
    if (link) {
      const text = document.createTextNode(link.textContent || "");
      link.replaceWith(text);
      const range = document.createRange();
      range.setStartAfter(text);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      handleInput();
      updateFormats();
      setToast({ message: "链接已清除", type: "success" });
      return;
    }
    exec("unlink");
    handleInput();
  };

  const toggleBlockquote = () => {
    const sel = window.getSelection();
    if (sel?.anchorNode) {
      const bq = (sel.anchorNode as HTMLElement)?.closest?.("blockquote");
      if (bq) {
        const p = document.createElement("div");
        p.innerHTML = "<br>";
        bq.after(p);
        bq.childNodes.forEach((child) => bq.parentElement?.insertBefore(child, bq));
        bq.remove();
        const r = document.createRange();
        r.setStart(p, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      } else {
        exec("insertHTML", '<blockquote style="border-left:3px solid #d0d0d0;margin:8px 0;padding:4px 12px;color:#666;background:#f9f9f9">&nbsp;</blockquote>');
      }
    }
    updateFormats();
  };

  const Btn = ({ label, cmd, action, children, getBtnRef }: { label: string; cmd?: string; action?: (e: React.MouseEvent) => void; children: React.ReactNode; getBtnRef?: (el: HTMLDivElement | null) => void }) => (
    <EditorToolBtn label={label} cmd={cmd} exec={exec} activeFormats={activeFormats} action={action} getBtnRef={getBtnRef}>{children}</EditorToolBtn>
  );

  const IconSvg = ({ path, fill, stroke, viewBox = "0 0 20 20", isFill }: { path: string | string[]; fill?: string; stroke?: string; viewBox?: string; isFill?: boolean }) => (
    <div className="absolute left-[2px] size-[20px] top-[2px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox={viewBox}>
        {(Array.isArray(path) ? path : [path]).map((d, i) => (
          isFill
            ? <path key={i} d={d} fill={fill ?? "#131212"} />
            : <path key={i} d={d} stroke={stroke ?? "#131212"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        ))}
      </svg>
    </div>
  );

  const Dropdown = ({ items, onSelect, onClose }: { items: string[]; onSelect: (v: string) => void; onClose: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);
    return (
      <div ref={ref} className="absolute z-[200] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] p-[4px] flex flex-col gap-[4px] min-w-[120px]">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] text-[14px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={() => { onSelect(item); onClose(); }}>{item}</div>
        ))}
      </div>
    );
  };

  const handleColorBtnClick = (type: "fore" | "back", e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (sel?.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    const r = e.currentTarget.getBoundingClientRect();
    setColorPickerPos({ x: r.left, y: r.bottom + 4 });
    setShowColorPicker(type);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      exec("insertImage", url);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    exec("insertHTML", `<video controls src="${url}" style="display:block;max-width:100%;margin:12px 0;border-radius:8px;background:#000"></video>`);
    e.target.value = "";
  };

  const handleTableInsert = () => {
    setTableRows("3");
    setTableCols("3");
    setShowTableModal(true);
  };

  const doTableInsert = () => {
    setShowTableModal(false);
    const rows = parseInt(tableRows, 10);
    const cols = parseInt(tableCols, 10);
    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) return;
    editorRef.current?.focus();
    const table = document.createElement("table");
    table.style.cssText = "border-collapse:collapse;width:100%;margin:8px 0;border:1px solid #EEF0F5";
    const tbody = document.createElement("tbody");
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(r === 0 ? "th" : "td");
        cell.setAttribute("contenteditable", "true");
        cell.style.cssText = `border:1px solid #EEF0F5;padding:6px 8px;min-width:60px;vertical-align:top${r === 0 ? ";font-weight:600;text-align:left" : ""}`;
        cell.innerHTML = "&nbsp;";
        tr.appendChild(cell);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const br = document.createElement("br");
    const sel = window.getSelection();
    let range: Range;
    if (sel?.rangeCount && (sel.getRangeAt(0).intersectsNode?.(editorRef.current!) || sel.getRangeAt(0).commonAncestorContainer === editorRef.current)) {
      range = sel.getRangeAt(0);
      range.deleteContents();
    } else {
      range = document.createRange();
      const last = editorRef.current?.lastChild;
      if (last) { range.setStartAfter(last); } else { range.setStart(editorRef.current!, 0); }
    }
    range.insertNode(table);
    range.setStartAfter(table);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
    table.after(br);
    updateFormats();
  };

  const createTaskItem = (text = "") => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-task-item", "true");
    wrapper.style.cssText = "display:flex;align-items:flex-start;gap:8px;margin:4px 0";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.style.cssText = "cursor:pointer;flex-shrink:0;width:14px;height:14px;margin:6px 0 0";
    const span = document.createElement("span");
    span.contentEditable = "true";
    span.style.cssText = "flex:1;outline:none;word-break:break-word;min-width:0;display:block";
    span.textContent = text || "\u00a0";
    wrapper.appendChild(cb);
    wrapper.appendChild(span);
    return { wrapper, span };
  };

  const toggleTaskList = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const currentEl = range.startContainer.nodeType === 1 ? range.startContainer as HTMLElement : range.startContainer.parentElement;
    const taskItem = currentEl?.closest?.('[data-task-item="true"]') as HTMLElement | null;
    if (taskItem) {
      const text = taskItem.querySelector("span")?.textContent || "";
      const p = document.createElement("p");
      p.textContent = text.trim() || "\u00a0";
      taskItem.replaceWith(p);
      return;
    }

    const selectedText = range.toString();
    const { wrapper, span } = createTaskItem(selectedText);
    const block = currentEl?.closest?.('p, div, li, h1, h2, h3, h4, h5, h6, blockquote') as HTMLElement | null;
    range.deleteContents();
    if (block && block !== editorRef.current && editorRef.current?.contains(block)) {
      block.after(wrapper);
      if (!block.textContent?.trim() && block.children.length === 0) block.remove();
    } else {
      range.insertNode(wrapper);
    }
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    newRange.collapse(false);
    sel.addRange(newRange);
    handleInput();
  };

  const clearSelectedImg = () => {
    if (imgOverlayFrame.current !== null) {
      cancelAnimationFrame(imgOverlayFrame.current);
      imgOverlayFrame.current = null;
    }
    setSelectedImg(null);
    setSelectedImgRect(null);
    setEditorVisibleRect(null);
  };

  const selectImg = (img: HTMLImageElement) => {
    setSelectedImg(img);
    setSelectedImgRect(img.getBoundingClientRect());
    setEditorVisibleRect(editorRef.current?.getBoundingClientRect() ?? null);
  };

  const refreshSelectedImgRect = useCallback((clearWhenHidden = true) => {
    if (!selectedImg || !editorRef.current || !editorRef.current.contains(selectedImg)) {
      clearSelectedImg();
      return;
    }
    const imgRect = selectedImg.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    const isVisible = imgRect.bottom > editorRect.top + 2 && imgRect.top < editorRect.bottom - 2 && imgRect.right > editorRect.left + 2 && imgRect.left < editorRect.right - 2;
    if (!isVisible) {
      if (clearWhenHidden) clearSelectedImg();
      else {
        setSelectedImgRect(null);
        setEditorVisibleRect(editorRect);
      }
      return;
    }
    setSelectedImgRect(imgRect);
    setEditorVisibleRect(editorRect);
  }, [selectedImg]);

  const scheduleSelectedImgRectRefresh = useCallback((clearWhenHidden = true) => {
    if (imgOverlayFrame.current !== null) cancelAnimationFrame(imgOverlayFrame.current);
    imgOverlayFrame.current = requestAnimationFrame(() => {
      imgOverlayFrame.current = null;
      refreshSelectedImgRect(clearWhenHidden);
    });
  }, [refreshSelectedImgRect]);

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      e.preventDefault();
      selectImg(target as HTMLImageElement);
    } else if (!target.closest(".img-resize-handle")) {
      clearSelectedImg();
    }
  };

  const handleImgResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;
    const rect = selectedImg.getBoundingClientRect();
    setImgResize({
      startX: e.clientX, startY: e.clientY,
      startW: selectedImg.offsetWidth, startH: selectedImg.offsetHeight,
      handle, img: selectedImg,
    });
  };

  useEffect(() => {
    if (!imgResize) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - imgResize.startX;
      const dy = e.clientY - imgResize.startY;
      let newW = imgResize.startW;
      let newH = imgResize.startH;
      const ratio = imgResize.startW / imgResize.startH;
      const h = imgResize.handle;
      if (h.includes("e")) newW = Math.max(40, imgResize.startW + dx);
      if (h.includes("w")) newW = Math.max(40, imgResize.startW - dx);
      if (h.includes("s")) newH = Math.max(40, imgResize.startH + dy);
      if (h.includes("n")) newH = Math.max(40, imgResize.startH - dy);
      if (h === "ne" || h === "se" || h === "nw" || h === "sw") {
        if (imageRatioLocked) {
          if (h.includes("e") || h.includes("w")) newH = newW / ratio;
          else newW = newH * ratio;
        }
      }
      imgResize.img.style.width = `${newW}px`;
      imgResize.img.style.height = `${newH}px`;
      imgResize.img.style.maxWidth = "none";
      setSelectedImgRect(imgResize.img.getBoundingClientRect());
    };
    const onUp = () => { setImgResize(null); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [imgResize, imageRatioLocked]);

  useEffect(() => {
    if (!selectedImg) return;
    const editor = editorRef.current;
    if (!editor) return;
    refreshSelectedImgRect();
    const onScroll = () => {
      setSelectedImgRect(null);
      scheduleSelectedImgRectRefresh(false);
    };
    const onResize = () => scheduleSelectedImgRectRefresh();
    editor.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      editor.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (imgOverlayFrame.current !== null) {
        cancelAnimationFrame(imgOverlayFrame.current);
        imgOverlayFrame.current = null;
      }
    };
  }, [selectedImg, refreshSelectedImgRect, scheduleSelectedImgRectRefresh]);

  const getCaretMenuPosition = () => {
    const editorRect = editorRef.current?.getBoundingClientRect();
    const fallback = { left: (editorRect?.left ?? 24) + 16, top: (editorRect?.top ?? 120) + 32 };
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return fallback;
    const range = sel.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      const marker = document.createElement("span");
      marker.appendChild(document.createTextNode("\u200b"));
      range.insertNode(marker);
      rect = marker.getBoundingClientRect();
      marker.remove();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (rect.left === 0 && rect.top === 0) return fallback;
    return { left: rect.left, top: rect.bottom + 4 };
  };

  const removeSlashAndRun = (action: () => void) => {
    const sel = window.getSelection();
    if (sel?.rangeCount && sel.anchorNode && sel.anchorOffset > 0) {
      const range = sel.getRangeAt(0);
      range.setStart(range.startContainer, range.startOffset - 1);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete");
    }
    action();
  };

  const updateToc = () => {
    const el = editorRef.current;
    if (!el) return;
    const headings = el.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const items: { tag: string; text: string; id: string }[] = [];
    headings.forEach((h, i) => {
      if (!h.id) h.id = `toc-${i}-${Date.now()}`;
      items.push({ tag: h.tagName.toLowerCase(), text: (h as HTMLElement).innerText.slice(0, 50), id: h.id });
    });
    setTocHeadings(items);
  };

  useEffect(() => {
    updateToc();
    const el = editorRef.current;
    if (!el) return;
    const onScroll = () => {
      const headings = el.querySelectorAll("h1, h2, h3, h4, h5, h6");
      let active: string | null = null;
      const viewTop = el.scrollTop + 100;
      headings.forEach((h) => {
        if ((h as HTMLElement).offsetTop <= viewTop) active = h.id;
      });
      setTocActiveId(active);
      updateToc();
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [nodeId, initialHtml]);

  const insertTableRow = (direction: "above" | "below") => {
    const sel = window.getSelection();
    if (!sel?.focusNode) return;
    const td = sel.focusNode.parentElement?.closest?.("td") || sel.focusNode.parentElement?.closest?.("th");
    if (!td) return;
    const tr = td.closest("tr");
    if (!tr) return;
    const tbody = tr.closest("table")?.querySelector("tbody");
    if (!tbody) return;
    const newTr = document.createElement("tr");
    const cols = tr.querySelectorAll("td, th").length;
    const isFirstRow = tr === tr.closest("table")?.querySelector("tr");
    for (let i = 0; i < cols; i++) {
      const cell = document.createElement(isFirstRow && direction === "above" ? "th" : "td");
      cell.style.border = "1px solid #EEF0F5";
      cell.style.padding = "4px";
      cell.style.minWidth = "40px";
      cell.innerHTML = "&nbsp;";
      newTr.appendChild(cell);
    }
    if (direction === "above") tbody.insertBefore(newTr, tr);
    else tr.after(newTr);
    updateFormats();
  };

  const deleteTableRow = () => {
    const sel = window.getSelection();
    if (!sel?.focusNode) return;
    const td = sel.focusNode.parentElement?.closest?.("td") || sel.focusNode.parentElement?.closest?.("th");
    if (!td) return;
    const tr = td.closest("tr");
    if (!tr) return;
    const tbody = tr.closest("tbody");
    if (tbody && tbody.querySelectorAll("tr").length > 1) tr.remove();
    updateFormats();
  };

  const deleteTableCol = () => {
    const sel = window.getSelection();
    if (!sel?.focusNode) return;
    const td = sel.focusNode.parentElement?.closest?.("td") || sel.focusNode.parentElement?.closest?.("th");
    if (!td) return;
    const idx = Array.from(td.parentElement?.children ?? []).indexOf(td);
    const table = td.closest("table");
    if (!table) return;
    table.querySelectorAll("tr").forEach(tr => {
      const cell = tr.children[idx];
      if (cell) cell.remove();
    });
    updateFormats();
  };

  const insertTableCol = (direction: "left" | "right") => {
    const sel = window.getSelection();
    if (!sel?.focusNode) return;
    const td = sel.focusNode.parentElement?.closest?.("td") || sel.focusNode.parentElement?.closest?.("th");
    if (!td) return;
    const idx = Array.from(td.parentElement?.children ?? []).indexOf(td);
    const table = td.closest("table");
    if (!table) return;
    const isFirst = (tr: HTMLTableRowElement) => tr === tr.closest("table")?.querySelector("tr");
    table.querySelectorAll("tr").forEach(tr => {
      const cell = document.createElement(isFirst(tr) ? "th" : "td");
      cell.style.border = "1px solid #EEF0F5";
      cell.style.padding = "4px";
      cell.innerHTML = "&nbsp;";
      const insertIdx = direction === "left" ? idx : idx + 1;
      const refCell = tr.children[Math.min(insertIdx, tr.children.length - 1)];
      if (tr.children.length > insertIdx && refCell) tr.insertBefore(cell, refCell);
      else tr.appendChild(cell);
    });
    updateFormats();
  };

  const alignTableCol = (align: "left" | "center" | "right") => {
    const sel = window.getSelection();
    if (!sel?.focusNode) return;
    const td = sel.focusNode.parentElement?.closest?.("td") || sel.focusNode.parentElement?.closest?.("th");
    if (!td) return;
    const idx = Array.from(td.parentElement?.children ?? []).indexOf(td);
    const table = td.closest("table");
    if (!table) return;
    table.querySelectorAll("tr").forEach(tr => {
      const cell = tr.children[idx] as HTMLElement;
      if (cell) cell.style.textAlign = align;
    });
    updateFormats();
  };

  useEffect(() => {
    if (!tableResizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - tableResizing.startX;
      const newW = Math.max(40, tableResizing.startW + dx);
      const rows = tableResizing.table.querySelectorAll("tr");
      rows.forEach(tr => {
        const cell = tr.children[tableResizing.col] as HTMLElement;
        if (cell) cell.style.width = `${newW}px`;
      });
    };
    const onUp = () => setTableResizing(null);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [tableResizing]);

  const handleTableMouseMove = (e: React.MouseEvent) => {
    const cell = (e.target as HTMLElement)?.closest?.("td, th");
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const onRight = e.clientX > rect.right - 5 && e.clientX < rect.right + 3;
    (cell as HTMLElement).style.cursor = onRight ? "col-resize" : "";
  };

  const handleTableMouseDown = (e: React.MouseEvent) => {
    const cell = (e.target as HTMLElement)?.closest?.("td, th");
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    if (e.clientX > rect.right - 5 && e.clientX < rect.right + 3) {
      e.preventDefault(); e.stopPropagation();
      const tr = cell.parentElement;
      const idx = Array.from(tr?.children ?? []).indexOf(cell);
      const table = cell.closest("table");
      if (table && idx >= 0) setTableResizing({ col: idx, table, startX: e.clientX, startW: cell.offsetWidth });
    }
  };

  return (
    <div className="absolute left-0 right-0 top-[60px] bottom-0 flex flex-col">
      <style>{`td[contenteditable="true"],th[contenteditable="true"]{outline:none;cursor:text}td[contenteditable="true"]:focus,th[contenteditable="true"]:focus{box-shadow:inset 0 0 0 2px rgba(0,94,255,0.18);background:#FAFCFF}tr:nth-child(odd) td{background:rgba(238,240,245,0.502)}tr:nth-child(odd) th{background:rgba(238,240,245,0.502)}[data-task-item="true"] span{white-space:pre-wrap}[data-task-item="true"]{max-width:100%}`}</style>
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input ref={attachInputRef} type="file" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          exec("insertText", `[附件:${file.name}]`);
          URL.revokeObjectURL(url);
        }
        e.target.value = "";
      }} />
      {/* 工具栏 */}
      <div className="relative flex items-center gap-[24px] px-[24px] py-[6px] border-b border-[#EBECF0] bg-white flex-shrink-0 overflow-x-auto">
        {/* 段落/字体下拉 */}
        <div className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHeadingDropPos({ x: r.left, y: r.bottom + 4 });
            setShowHeadingDropdown(!showHeadingDropdown);
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[56px] truncate">{currentHeading}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
          {showHeadingDropdown && (
            <div className="fixed z-[200]" style={{ left: headingDropPos.x, top: headingDropPos.y }}><Dropdown items={HEADING_OPTIONS} onSelect={(v) => {
              setCurrentHeading(v);
              const idx = HEADING_OPTIONS.indexOf(v);
              if (idx === 0) exec("formatBlock", "<p>");
              else exec("formatBlock", `<h${idx}>`);
            }} onClose={() => setShowHeadingDropdown(false)} /></div>
          )}
        </div>
        <div className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setFontDropPos({ x: r.left, y: r.bottom + 4 });
            setShowFontDropdown(!showFontDropdown);
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[56px] truncate">{currentFont}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
          {showFontDropdown && (
            <div className="fixed z-[200]" style={{ left: fontDropPos.x, top: fontDropPos.y }}><Dropdown items={FONT_FAMILIES} onSelect={(v) => {
              setCurrentFont(v);
              if (v === "系统默认") exec("removeFormat");
              else exec("fontName", v);
            }} onClose={() => setShowFontDropdown(false)} /></div>
          )}
        </div>
        <div className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setSizeDropPos({ x: r.left, y: r.bottom + 4 });
            setShowSizeDropdown(!showSizeDropdown);
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[46px] truncate">{currentSize}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
          {showSizeDropdown && (
            <div className="fixed z-[200]" style={{ left: sizeDropPos.x, top: sizeDropPos.y }}><Dropdown items={FONT_SIZES} onSelect={(v) => {
              setCurrentSize(v);
              exec("fontSize", "3");
              const fs = parseInt(v);
              const el = editorRef.current;
              if (el) {
                const sel = window.getSelection();
                if (sel?.rangeCount) {
                  const span = document.createElement("span");
                  span.style.fontSize = v;
                  span.textContent = sel.toString();
                  sel.getRangeAt(0).deleteContents();
                  sel.getRangeAt(0).insertNode(span);
                  sel.removeAllRanges();
                }
              }
            }} onClose={() => setShowSizeDropdown(false)} /></div>
          )}
        </div>
        {/* 格式按钮 */}
        <Btn label="加粗" cmd="bold" action={() => exec("bold")}><IconSvg path={editorSvg.p3290fd80} /></Btn>
        <Btn label="斜体" cmd="italic" action={() => exec("italic")}><IconSvg path={editorSvg.p3837edc0} /></Btn>
        <Btn label="删除线" cmd="strikeThrough" action={() => exec("strikeThrough")}><IconSvg path={editorSvg.p2ae8080} /></Btn>
        <Btn label="下划线" cmd="underline" action={() => exec("underline")}><IconSvg path={editorSvg.pc604cd0} /></Btn>
        <Btn label="字体颜色" action={(e) => {
          const sel = window.getSelection();
          if (sel?.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
          e.stopPropagation();
          setColorPickerPos({ x: e.clientX, y: e.clientY + 4 });
          setShowColorPicker(showColorPicker === "fore" ? null : "fore");
        }} getBtnRef={(el) => { foreColorRef.current = el; }}>
          <IconSvg path={[editorSvg.peaacc00, "M4 17H16"]} stroke="#131212" />
        </Btn>
        <Btn label="背景颜色" action={(e) => {
          const sel = window.getSelection();
          if (sel?.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
          e.stopPropagation();
          setColorPickerPos({ x: e.clientX, y: e.clientY + 4 });
          setShowColorPicker(showColorPicker === "back" ? null : "back");
        }} getBtnRef={(el) => { bgColorRef.current = el; }}>
          <div className="absolute left-[2px] size-[20px] top-[2px]">
            <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 20 20">
              <rect fill="#FEF0F0" height="20" rx="4" width="20"/>
              <path d={editorSvg.p16c26880} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            </svg>
          </div>
        </Btn>
        <Btn label="任务列表" action={toggleTaskList}><IconSvg path={editorSvg.p30909380} /></Btn>
        <Btn label="有序列表" action={() => exec("insertHTML", '<ol style="margin:8px 0;padding-left:24px;list-style:decimal"><li>&nbsp;</li></ol>')}><IconSvg path={editorSvg.p31fc8400} /></Btn>
        <Btn label="无序列表" action={() => exec("insertHTML", '<ul style="margin:8px 0;padding-left:24px;list-style:disc"><li>&nbsp;</li></ul>')}><IconSvg path={editorSvg.p1ddeb0c0} /></Btn>
        <Btn label="减少缩进" action={() => exec("outdent")}><IconSvg path={editorSvg.p3244ee00} /></Btn>
        <Btn label="增加缩进" action={() => exec("indent")}><IconSvg path={editorSvg.p25bdc300} /></Btn>
        <div className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAlignDropPos({ x: r.left, y: r.bottom + 4 }); setShowAlignDropdown(!showAlignDropdown); }}>
          <div className="size-[24px] rounded-[6px] flex items-center justify-center hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors">
            <IconSvg path={editorSvg.p2c9c5c80} />
          </div>
          {showAlignDropdown && (
            <div className="fixed z-[200]" style={{ left: alignDropPos.x, top: alignDropPos.y }}>
              <Dropdown items={["左对齐", "居中对齐", "右对齐"]} onSelect={(v) => {
                if (v === "左对齐") exec("justifyLeft");
                else if (v === "居中对齐") exec("justifyCenter");
                else exec("justifyRight");
                setShowAlignDropdown(false);
              }} onClose={() => setShowAlignDropdown(false)} />
            </div>
          )}
        </div>
        <Btn label="引用块" action={toggleBlockquote}><IconSvg path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill /></Btn>
        <Btn label="代码块" action={() => exec("insertHTML", '<pre style="background:#f5f5f5;border-radius:4px;padding:12px;font-family:monospace;font-size:13px;overflow-x:auto;margin:8px 0">&nbsp;</pre>')}><IconSvg path={editorSvg.p36d5aa00} /></Btn>
        <div className={`rounded-[6px] transition-colors ${showLinkModal || activeFormats.has("link") ? "bg-[#fff5f5] ring-1 ring-[#ff4d4f]" : ""}`}>
          <Btn label="插入链接" action={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openLinkModal({ x: r.left - 150, y: r.bottom + 8 });
          }} getBtnRef={(el) => { linkBtnRef.current = el; }}><IconSvg path={editorSvg.pda5c3c0} stroke={showLinkModal || activeFormats.has("link") ? "#ff4d4f" : "#131212"} /></Btn>
        </div>
        <Btn label="清除链接" action={removeCurrentLink}><IconSvg path={editorSvg.p3418c200} /></Btn>
        <Btn label="插入图片" action={() => imgInputRef.current?.click()}><IconSvg path={editorSvg.p2a7b5cf0} isFill fill="#131212" /></Btn>
        <Btn label="插入视频" action={() => videoInputRef.current?.click()}><IconSvg path={editorSvg.p1a4aa900} /></Btn>
        <Btn label="清除格式" action={() => exec("removeFormat")}><IconSvg path={editorSvg.p3e282b00} stroke="#131212" /></Btn>
        <Btn label="附件" action={() => attachInputRef.current?.click()}><IconSvg path={editorSvg.p149b2100} /></Btn>
        <Btn label="表格" action={handleTableInsert}><IconSvg path={editorSvg.p808b680} /></Btn>
        <Btn label="复制锚点链接" action={() => {
          const sel = window.getSelection();
          if (!sel?.rangeCount) return;
          const anchorId = `anchor-${Date.now()}`;
          const p = sel.getRangeAt(0).startContainer.parentElement?.closest("div,p,h1,h2,h3,h4,h5,h6,li");
          if (p) { p.id = anchorId; }
          const docId = nodeId;
          const link = `manual-doc://doc/${docId}#${anchorId}`;
          navigator.clipboard?.writeText(link);
          setToast({ message: "锚点链接已复制到剪贴板", type: "success" });
        }}><IconSvg path={editorSvg.pda5c3c0} /></Btn>
      </div>
      {/* 表格编辑工具栏 */}
      {showTableToolbar && (
        <div className="fixed z-[200] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] p-[4px] flex items-center gap-[4px]"
          style={{ left: tableToolbarPos.left, top: tableToolbarPos.top }}
          onMouseDown={(e) => e.preventDefault()}>
          <div className="flex items-center gap-[4px] px-[8px] py-[4px] text-[12px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]">表格</div>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={() => insertTableRow("above")}>上方行</button>
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={() => insertTableRow("below")}>下方行</button>
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={deleteTableRow}>删行</button>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={() => insertTableCol("left")}>左列</button>
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={() => insertTableCol("right")}>右列</button>
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={deleteTableCol}>删列</button>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={() => alignTableCol("left")}>左对齐</button>
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={() => alignTableCol("center")}>居中</button>
          <button className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors flex items-center gap-[4px]" style={{ fontFamily: "PingFang SC, sans-serif" }} onClick={() => alignTableCol("right")}>右对齐</button>
        </div>
      )}
      {/* 颜色选择器 */}
      {showColorPicker && (
        <ColorPicker
          currentColor={showColorPicker === "fore" ? "#000000" : "#000000"}
          onSelect={(color) => {
            const range = savedRangeRef.current;
            if (range) {
              const sel = window.getSelection();
              if (sel) { sel.removeAllRanges(); sel.addRange(range); }
            }
            editorRef.current?.focus();
            document.execCommand("styleWithCSS", false, "true");
            if (showColorPicker === "fore") document.execCommand("foreColor", false, color);
            else document.execCommand("hiliteColor", false, color);
            updateFormats();
          }}
          onClose={() => { setShowColorPicker(null); savedRangeRef.current = null; }}
          position={colorPickerPos}
        />
      )}
      {showLinkModal && (
        <LinkModal
          position={linkModalPos}
          initialText={linkModalText}
          initialUrl={linkModalUrl}
          mode={linkModalMode}
          triggerRef={linkBtnRef}
          onClose={() => { setShowLinkModal(false); savedRangeRef.current = null; activeLinkRef.current = null; setLinkModalText(""); setLinkModalUrl(""); }}
          onConfirm={insertLink}
        />
      )}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowTableModal(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white rounded-[16px] w-[360px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] p-[24px] flex flex-col gap-[20px]"
            onClick={(e) => e.stopPropagation()}>
            <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px]">插入表格</p>
            <div className="flex gap-[16px]">
              <div className="flex-1 flex flex-col gap-[6px]">
                <label className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">行数</label>
                <input type="number" min="1" max="20" value={tableRows}
                  onChange={(e) => setTableRows(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doTableInsert(); if (e.key === "Escape") setShowTableModal(false); }}
                  className="h-[36px] rounded-[8px] border border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF]"
                  style={{ fontFamily: "PingFang SC, sans-serif" }} />
              </div>
              <div className="flex-1 flex flex-col gap-[6px]">
                <label className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">列数</label>
                <input type="number" min="1" max="10" value={tableCols}
                  onChange={(e) => setTableCols(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doTableInsert(); if (e.key === "Escape") setShowTableModal(false); }}
                  className="h-[36px] rounded-[8px] border border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF]"
                  style={{ fontFamily: "PingFang SC, sans-serif" }} />
              </div>
            </div>
            <div className="flex justify-end gap-[12px]">
              <button className="h-[36px] px-[20px] rounded-[8px] border border-[#e5e7eb] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0]"
                style={{ fontFamily: "PingFang SC, sans-serif" }}
                onClick={() => setShowTableModal(false)}>取消</button>
              <button className="h-[36px] px-[20px] rounded-[8px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80"
                style={{ fontFamily: "PingFang SC, sans-serif" }}
                onClick={doTableInsert}>插入表格</button>
            </div>
          </div>
        </div>
      )}
      {/* 斜杠菜单 */}
      {slashMenu && (
        <div ref={slashMenuElRef} className="fixed z-[200] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] py-[4px] min-w-[180px] overflow-y-auto overscroll-contain"
          style={{ left: slashMenu.left, top: slashMenu.top, maxHeight: slashMenu.maxHeight ?? "min(70vh, 480px)" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {slashItems.map((item, idx) => (
            <div key={item.label} data-slash-idx={idx}
              className={`flex items-center gap-[8px] px-[12px] py-[7px] cursor-pointer transition-colors ${idx === slashIdxRef.current ? "bg-[#f5f6f8]" : "hover:bg-[#f5f6f8]"}`}
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setSlashMenu(null); removeSlashAndRun(item.action); }}
            >
              <div className="size-[20px] flex items-center justify-center rounded-[4px] bg-[#ebecf0] text-[11px] font-bold text-[#131212]">{item.icon}</div>
              <span className="text-[14px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {/* 编辑区 */}
      <div className="flex-1 min-h-0 bg-white flex justify-center overflow-hidden">
        <div className="flex min-h-0 w-full max-w-[1248px] px-[24px] gap-[60px]">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={() => { rememberSelection(); updateFormats(); }}
        onMouseUp={() => { rememberSelection(); updateFormats(); }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const table = target.closest("table");
          if (table) {
            const r = table.getBoundingClientRect();
            setTableToolbarPos({ left: r.left, top: r.top > 80 ? r.top - 44 : r.bottom + 8 });
          }
          setShowTableToolbar(!!table);
          if (target.tagName === "IMG") {
            e.preventDefault();
            selectImg(target as HTMLImageElement);
          } else if (!target.closest(".img-resize-handle")) {
            clearSelectedImg();
          }
          if (target.tagName === "A" && target.getAttribute("href")?.startsWith("#internal-")) {
            e.preventDefault();
            const id = target.getAttribute("href")?.replace("#internal-", "");
            const anchor = document.getElementById(id);
            if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
        onKeyDown={(e) => {
          try {
            const isCmd = e.metaKey || e.ctrlKey;
          if (isCmd && e.key === "s") {
            e.preventDefault();
            const now = new Date();
            setSavedAt(`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
            setToast({ message: "已保存", type: "success" });
          } else if (isCmd && e.key === "z") {
            e.preventDefault();
            if (e.shiftKey) document.execCommand("redo");
            else document.execCommand("undo");
            updateFormats();
          } else if (isCmd && e.key === "n") {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("opencode-new-doc"));
          } else if (isCmd && e.key === "k") {
            e.preventDefault();
            const pos = getCaretMenuPosition();
            openLinkModal({ x: pos.left - 150, y: pos.top + 8 });
          } else if (e.key === " " && !slashMenu) {
            const sel = window.getSelection();
            if (sel?.rangeCount) {
              const node = sel.anchorNode;
              if (node?.nodeType === 3) {
                const offset = sel.anchorOffset;
                const text = node.textContent?.slice(0, offset) ?? "";
                const mdMatch = text.match(/(?:^|\n)(#{1,6}|[-\*+]|\d+\.|>|```)$/);
                if (mdMatch) {
                  const start = offset - mdMatch[1].length;
                  e.preventDefault();
                  sel.collapse(node, start);
                  sel.deleteFromDocument();
                  const token = mdMatch[1];
                  if (token.startsWith("#")) exec("formatBlock", `<h${token.length}>`);
                  else if (token === "-" || token === "*") exec("insertHTML", '<ul style="margin:8px 0;padding-left:24px;list-style:disc"><li>&nbsp;</li></ul>');
                  else if (token.match(/^\d+\.$/)) exec("insertHTML", '<ol style="margin:8px 0;padding-left:24px;list-style:decimal"><li>&nbsp;</li></ol>');
                  else if (token === ">") exec("formatBlock", "<blockquote>");
                  else if (token === "```") exec("formatBlock", "<pre>");
                }
              }
            }
          } else if (e.key === "Enter" && !slashMenu) {
            const sel = window.getSelection();
            if (sel?.rangeCount) {
              const node = sel.anchorNode;
              const currentEl = node?.nodeType === 1 ? node as HTMLElement : node?.parentElement;
              const taskWrapper = currentEl?.closest?.('[data-task-item="true"]') as HTMLElement | null;
              if (taskWrapper) {
                e.preventDefault();
                const span = taskWrapper.querySelector("span");
                if (!span?.textContent?.trim()) {
                  const p = document.createElement("p");
                  p.innerHTML = "<br>";
                  taskWrapper.after(p);
                  taskWrapper.remove();
                  const r = document.createRange();
                  r.setStart(p, 0);
                  r.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(r);
                  handleInput();
                  return;
                }
                const next = createTaskItem("");
                taskWrapper.after(next.wrapper);
                const r = document.createRange();
                r.selectNodeContents(next.span);
                r.collapse(false);
                sel.removeAllRanges();
                sel.addRange(r);
                handleInput();
                return;
              }
              const bq = (node as HTMLElement)?.closest?.("blockquote") as HTMLElement | null;
              if (bq) {
                e.preventDefault();
                const textBefore = sel.anchorNode?.textContent?.slice(0, sel.anchorOffset) ?? "";
                const empty = !textBefore.trim();
                if (empty) {
                  bq.after(document.createElement("br"));
                  const p = document.createElement("div");
                  p.appendChild(document.createElement("br"));
                  bq.after(p);
                  const r = document.createRange();
                  r.setStart(p, 0);
                  r.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(r);
                } else {
                  const p = document.createElement("div");
                  p.style.cssText = "margin:0";
                  p.appendChild(document.createElement("br"));
                  bq.appendChild(p);
                  const r = document.createRange();
                  r.setStart(p, 0);
                  r.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(r);
                }
                return;
              }
              const pre = (node as HTMLElement)?.closest?.("pre") as HTMLElement | null;
              if (pre) {
                e.preventDefault();
                const textBefore = sel.anchorNode?.textContent?.slice(0, sel.anchorOffset) ?? "";
                if (!textBefore.trim()) {
                  if (preEmptyRef.current) {
                    preEmptyRef.current = false;
                    const div = document.createElement("div");
                    div.innerHTML = "<br>";
                    pre.after(div);
                    const r = document.createRange();
                    r.setStart(div, 0);
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                    return;
                  }
                  preEmptyRef.current = true;
                } else {
                  preEmptyRef.current = false;
                }
                if (sel.rangeCount) {
                  const range = sel.getRangeAt(0);
                  range.deleteContents();
                  const br = document.createElement("br");
                  range.insertNode(br);
                  range.setStartAfter(br);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
                return;
              }
              const listItem = (node as HTMLElement)?.closest?.("li") as HTMLElement | null;
              if (listItem && !listItem.textContent?.trim()) {
                e.preventDefault();
                const parentList = listItem.parentElement;
                if (parentList) {
                  if (parentList.children.length > 1) {
                    listItem.remove();
                  } else {
                    parentList.after(document.createElement("br"));
                    parentList.remove();
                    sel.removeAllRanges();
                    return;
                  }
                }
              }
              if (node?.nodeType === 3) {
                const text = node.textContent ?? "";
                const trimmed = text.trim();
                if (/^(---|\*\*\*|___)$/.test(trimmed)) {
                  e.preventDefault();
                  const p = node.parentElement;
                  if (p && p.tagName !== "DIV" && p.parentElement?.tagName === "DIV") {
                    p.innerHTML = "";
                    const hr = document.createElement("hr");
                    hr.contentEditable = "false";
                    hr.style.cssText = "border:none;border-top:1px solid #d0d0d0;margin:16px 0";
                    p.appendChild(hr);
                    const br = document.createElement("br");
                    p.parentElement.insertBefore(br, p.nextSibling);
                    sel.collapse(p.nextSibling!, 0);
                  }
                } else if (/\\*\\*[^*]+\\*\\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\\*[^*]+\\*|_[^_]+_/.test(text)) {
                  const tokenRegex = /\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;
                  const parts: { text: string; attrs: Record<string, string> }[] = [];
                  let lastIdx = 0;
                  let m;
                  while ((m = tokenRegex.exec(text)) !== null) {
                    if (m.index > lastIdx) parts.push({ text: text.slice(lastIdx, m.index), attrs: {} });
                    if (m[1] !== undefined) parts.push({ text: m[1], attrs: { fontWeight: "bold" } });
                    else if (m[2] !== undefined) parts.push({ text: m[2], attrs: { fontWeight: "bold" } });
                    else if (m[3] !== undefined) parts.push({ text: m[3], attrs: { textDecoration: "line-through" } });
                    else if (m[4] !== undefined) parts.push({ text: m[4], attrs: { fontFamily: "monospace" } });
                    else if (m[5] !== undefined) parts.push({ text: m[5], attrs: { fontStyle: "italic" } });
                    else if (m[6] !== undefined) parts.push({ text: m[6], attrs: { fontStyle: "italic" } });
                    lastIdx = m.index + m[0].length;
                  }
                  if (lastIdx < text.length) parts.push({ text: text.slice(lastIdx), attrs: {} });
                  if (parts.length > 0 && parts.some(p => Object.keys(p.attrs).length > 0)) {
                    e.preventDefault();
                    const pEl = node.parentElement;
                    if (pEl) {
                      pEl.innerHTML = "";
                      for (const part of parts) {
                        const span = document.createElement("span");
                        span.textContent = part.text;
                        Object.entries(part.attrs).forEach(([k, v]) => { (span.style as any)[k] = v; });
                        pEl.appendChild(span);
                      }
                    }
                  }
                }
              }
            }
          } else if (e.key === "/" && !slashMenu) {
            const sel = window.getSelection();
            const textBefore = sel?.focusNode?.textContent?.slice(0, sel.focusOffset) || "";
            if (textBefore.trim() !== "") return;
            const caret = getCaretMenuPosition();
            const caretBottom = caret.top - 4;
            setSlashMenu(getSlashMenuPlacement(
              { left: caret.left, top: caretBottom, bottom: caretBottom },
              { itemCount: slashItems.length },
            ));
            slashIdxRef.current = -1;
          } else if (e.key === "Escape") {
            setSlashMenu(null);
            setShowMoreMenu(false);
          } else if (e.key === "ArrowDown" && slashMenu) {
            e.preventDefault();
            slashIdxRef.current = Math.min(slashIdxRef.current + 1, slashItems.length - 1);
            setSlashMenu({ ...slashMenu });
            requestAnimationFrame(() => {
              const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${slashIdxRef.current}"]`);
              el?.scrollIntoView({ block: "nearest" });
            });
          } else if (e.key === "ArrowUp" && slashMenu) {
            e.preventDefault();
            slashIdxRef.current = Math.max(slashIdxRef.current - 1, 0);
            setSlashMenu({ ...slashMenu });
            requestAnimationFrame(() => {
              const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${slashIdxRef.current}"]`);
              el?.scrollIntoView({ block: "nearest" });
            });
          } else if (e.key === "Enter" && slashMenu) {
            e.preventDefault();
            if (slashIdxRef.current >= 0) {
              const item = slashItems[slashIdxRef.current];
              setSlashMenu(null);
              removeSlashAndRun(item.action);
            } else {
              setSlashMenu(null);
            }
          } else if (e.key === "Backspace") {
            const sel = window.getSelection();
            const text = sel?.focusNode?.textContent || "";
            if (text.trim() === "/" && sel?.focusOffset === 1) {
              setSlashMenu(null);
            }
          }
        } catch (e) { console.error("keydown error:", e); }
        }}
        onPaste={(e: React.ClipboardEvent) => {
          const items = e.clipboardData?.items;
          if (items) {
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.startsWith("image/")) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => { exec("insertImage", reader.result as string); };
                  reader.readAsDataURL(file);
                }
                return;
              }
            }
          }
          const text = e.clipboardData.getData("text/plain");
          if (text && /^(#{1,6}\s|[-\*+]\s|\d+\.\s|>\s)/m.test(text)) {
            e.preventDefault();
            const html = text
              .split("\n")
              .map(line => {
                const h = line.match(/^(#{1,6})\s+(.+)/);
                if (h) return `<h${h[1].length}>${h[2]}</h${h[1].length}>`;
                if (/^[-\*+]\s/.test(line)) return `<li>${line.replace(/^[-\*+]\s/, "")}</li>`;
                if (/^\d+\.\s/.test(line)) return `<li>${line.replace(/^\d+\.\s/, "")}</li>`;
                if (/^>\s/.test(line)) return `<blockquote style="border-left:3px solid #d0d0d0;margin:8px 0;padding:4px 12px;color:#666;background:#f9f9f9">${line.replace(/^>\s/, "")}</blockquote>`;
                return line;
              })
              .join("\n");
            exec("insertHTML", html);
          }
        }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const files = e.dataTransfer?.files;
          if (files) {
            for (let i = 0; i < files.length; i++) {
              if (files[i].type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = () => { exec("insertImage", reader.result as string); };
                reader.readAsDataURL(files[i]);
              }
            }
          }
        }}
        onDoubleClick={(e: React.MouseEvent) => {
          const img = (e.target as HTMLElement).closest("img");
          if (!img || img.closest(".img-resize-bar")) return;
          e.stopPropagation();
          const overlay = document.createElement("div");
          overlay.className = "lightbox-overlay";
          overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;cursor:pointer";
          const clone = document.createElement("img");
          clone.src = (img as HTMLImageElement).src;
          clone.style.cssText = "max-width:90vw;max-height:90vh;border-radius:8px;object-fit:contain";
          overlay.appendChild(clone);
          overlay.addEventListener("click", () => overlay.remove());
          document.body.appendChild(overlay);
        }}
        onMouseMove={handleTableMouseMove}
        onMouseDownCapture={handleTableMouseDown}
        className="flex-1 min-w-0 w-full max-w-[960px] overflow-y-auto hide-scrollbar outline-none px-[24px] py-[20px] text-[#131212] min-h-0 relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ fontFamily: "PingFang SC, sans-serif", fontSize: propFontSize || "15px", lineHeight: propLineHeight || "1.8", msOverflowStyle: "none" }}
        data-placeholder="输入 / 打开命令菜单，或直接开始编写"
      />
          <aside className="hidden lg:flex w-[180px] shrink-0 min-h-0 py-[20px] flex-col">
            <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] leading-[22px] mb-[10px]">目录</p>
            <div className="flex-1 overflow-y-auto hide-scrollbar pr-[4px]">
              {tocHeadings.length > 0 ? tocHeadings.map((h, i) => {
                const level = Math.max(1, parseInt(h.tag[1]) || 1);
                const isActive = tocActiveId === h.id;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`relative w-full min-h-[28px] flex items-center text-left cursor-pointer transition-colors ${isActive ? "text-[#134CFF]" : "text-[#8d8e99] hover:text-[#131212]"}`}
                    style={{ paddingLeft: `${8 + (level - 1) * 12}px`, fontFamily: "PingFang SC, sans-serif" }}
                    onClick={() => {
                      const el = document.getElementById(h.id);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <span className={`block truncate text-[13px] leading-[28px] ${isActive ? "font-medium" : "font-normal"}`}>{h.text}</span>
                  </button>
                );
              }) : <p className="py-[5px] text-[12px] leading-[18px] text-[#8d8e99]" style={{ fontFamily: "PingFang SC, sans-serif" }}>暂无标题</p>}
            </div>
          </aside>
        </div>
      </div>
      {selectedImg && selectedImgRect && (() => {
        const r = selectedImgRect;
        const editorR = editorVisibleRect;
        if (!editorR) return null;
        const handles = ["nw","n","ne","e","se","s","sw","w"];
        const cursors: Record<string, string> = { nw:"nwse-resize", n:"ns-resize", ne:"nesw-resize", e:"ew-resize", se:"nwse-resize", s:"ns-resize", sw:"nesw-resize", w:"ew-resize" };
        const boxLeft = r.left - 4;
        const boxTop = r.top - 4;
        const boxWidth = r.width + 8;
        const boxHeight = r.height + 8;
        const clipTop = Math.max(0, editorR.top - boxTop);
        const clipRight = Math.max(0, boxLeft + boxWidth - editorR.right);
        const clipBottom = Math.max(0, boxTop + boxHeight - editorR.bottom);
        const clipLeft = Math.max(0, editorR.left - boxLeft);
        return (
          <div className="fixed pointer-events-none z-[220]" style={{ left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight, clipPath: `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)` }}>
            <div className="absolute inset-0 border border-[#134CFF] pointer-events-none" />
            {handles.map((h) => {
              const pos: Record<string, React.CSSProperties> = {
                nw: { left: -6, top: -6 }, n: { left: "50%", top: -6, transform: "translateX(-50%)" }, ne: { right: -6, top: -6 },
                e: { right: -6, top: "50%", transform: "translateY(-50%)" },
                se: { right: -6, bottom: -6 }, s: { left: "50%", bottom: -6, transform: "translateX(-50%)" }, sw: { left: -6, bottom: -6 },
                w: { left: -6, top: "50%", transform: "translateY(-50%)" },
              };
              return (
                <div key={h} className="img-resize-handle absolute size-[12px] bg-white border-2 border-[#134CFF] rounded-full pointer-events-auto cursor-pointer z-10"
                  style={{ ...pos[h], cursor: cursors[h] }}
                  onMouseDown={(e) => handleImgResizeStart(e, h)} />
              );
            })}
          </div>
        );
      })()}
      {selectedImg && selectedImgRect && (() => {
        const r = selectedImgRect;
        const editorR = editorVisibleRect;
        if (!editorR) return null;
        const barLeft = r.left + r.width / 2;
        const barTop = r.bottom + 8;
        if (barTop < editorR.top || barTop + 44 > editorR.bottom) return null;
        const applyWidth = (pct: string) => {
          if (!selectedImg) return;
          if (pct === "auto") {
            selectedImg.style.width = "";
            selectedImg.style.height = "";
            selectedImg.style.maxWidth = "";
          } else {
            const v = parseInt(pct);
            selectedImg.style.width = `${v}%`;
            selectedImg.style.height = "auto";
            selectedImg.style.maxWidth = "none";
          }
          setSelectedImgRect(selectedImg.getBoundingClientRect());
          updateFormats();
        };
        return (
          <div className="img-resize-bar fixed z-[230] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] px-[8px] py-[6px] flex items-center gap-[6px]"
            style={{ left: barLeft, top: barTop, transform: "translateX(-50%)" }}
            onMouseDown={(e) => e.stopPropagation()}>
            {["25","50","75","100"].map(pct => (
              <button key={pct} className="h-[24px] px-[6px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap"
                style={{ fontFamily: "PingFang SC, sans-serif" }}
                onClick={(e) => { e.stopPropagation(); applyWidth(pct); }}>{pct}%</button>
            ))}
            <div className="w-[1px] h-[16px] bg-[#ebecf0]" />
            <button className="h-[24px] px-[6px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] whitespace-nowrap"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              onClick={(e) => { e.stopPropagation(); applyWidth("auto"); }}>原始</button>
            <div className="w-[1px] h-[16px] bg-[#ebecf0]" />
            <button className={`size-[24px] rounded-[4px] flex items-center justify-center cursor-pointer transition-colors ${imageRatioLocked ? "bg-[#ebecf0]" : "hover:bg-[#f5f6f8]"}`}
              onClick={(e) => { e.stopPropagation(); setImageRatioLocked(!imageRatioLocked); }}
              title={imageRatioLocked ? "锁定图片比例" : "解除比例锁定"}>
              <svg className="size-[14px]" fill="none" viewBox="0 0 14 14">
                <path d="M4.5 6.5H9.5L8.5 9.5H5.5L4.5 6.5Z" stroke={imageRatioLocked ? "#134CFF" : "#8D8E99"} strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M5 6.5V4.5C5 3.395 5.895 2.5 7 2.5C8.105 2.5 9 3.395 9 4.5V6.5" stroke={imageRatioLocked ? "#134CFF" : "#8D8E99"} strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="w-[1px] h-[16px] bg-[#ebecf0]" />
            <input
              className="w-[32px] h-[24px] rounded-[4px] border border-[#ebecf0] text-[12px] text-[#131212] text-center outline-none focus:border-[#134CFF]"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              placeholder="%"
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedImg) {
                  const v = parseInt((e.target as HTMLInputElement).value);
                  if (v && v >= 5 && v <= 100) { selectedImg.style.width = `${v}%`; selectedImg.style.height = "auto"; selectedImg.style.maxWidth = "none"; }
                  setSelectedImgRect(selectedImg.getBoundingClientRect());
                  (e.target as HTMLInputElement).value = "";
                  updateFormats();
                }
              }}
              onBlur={(e) => {
                if (selectedImg) {
                  const v = parseInt(e.target.value);
                  if (v && v >= 5 && v <= 100) { selectedImg.style.width = `${v}%`; selectedImg.style.height = "auto"; selectedImg.style.maxWidth = "none"; }
                  setSelectedImgRect(selectedImg.getBoundingClientRect());
                  e.target.value = "";
                  updateFormats();
                }
              }}
            />
            <div className="relative size-[24px] cursor-col-resize flex items-center justify-center rounded-[4px] hover:bg-[#f5f6f8]"
              onMouseDown={(e) => {
                if (!selectedImg) return;
                e.stopPropagation(); e.preventDefault();
                setImgBarSlider(true);
                const img = selectedImg;
                const startX = e.clientX;
                const startW = img.offsetWidth;
                const parentW = img.parentElement?.offsetWidth || 1;
                const onMove = (ev: MouseEvent) => {
                  const dx = ev.clientX - startX;
                  const pct = Math.max(5, Math.min(100, Math.round((startW + dx) / parentW * 100)));
                  img.style.width = `${pct}%`; img.style.height = "auto"; img.style.maxWidth = "none";
                  setSelectedImgRect(img.getBoundingClientRect());
                };
                const onUp = () => { setImgBarSlider(false); document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); updateFormats(); };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}>
              <svg className="size-[14px]" fill="none" viewBox="0 0 14 14">
                <path d="M3 11L11 3M3 11H11M3 11V3" stroke="#8D8E99" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        );
      })()}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* 状态栏 */}
      <div className="flex items-center justify-between px-[24px] py-[10px] border-t border-[#EBECF0] bg-white flex-shrink-0">
        <div className="flex items-center gap-[8px]">
          <div className="relative shrink-0 size-[8px]">
            <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 8 8">
              <circle cx="4" cy="4" fill={saveStatus === "saving" ? "#F59E0B" : saveStatus === "saved" ? "#15803D" : "#8D8E99"} r="4" />
            </svg>
          </div>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px] whitespace-nowrap">
            {saveStatus === "saving" ? "保存中..." : savedAt ? `已保存，更新于${savedAt}` : "未保存"}
          </p>
        </div>
        <div className="flex items-center gap-[25px]">
          <div className="flex items-center gap-[8px]">
            <div className="relative shrink-0 size-[14px]">
              <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 14 14">
                <path d={editorSvg.p2ce2bc00} stroke="#8D8E99" strokeLinecap="round" strokeWidth="1.2" />
              </svg>
            </div>
            <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">大纲</p>
          </div>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">{charCount}字符 {(() => {
            const text = editorRef.current?.innerText ?? "";
            const wordCount = text.replace(/\s/g, "").length > 0 ? text.match(/[\u4e00-\u9fff\u3400-\u4dbf]|[a-zA-Z0-9]+/g)?.length ?? 0 : 0;
            return `${wordCount}字`;
          })()}</p>
        </div>
      </div>
    </div>
  );
}

const getEditorTextCount = (text: string) => text.replace(/\s/g, "").length;
const getEditorWordCount = (text: string) => text.replace(/\s/g, "").length > 0
  ? text.match(/[\u4e00-\u9fff\u3400-\u4dbf]|[a-zA-Z0-9]+/g)?.length ?? 0
  : 0;
const getSlashMenuPlacement = (
  anchor: { left: number; top: number; bottom: number },
  options?: { itemCount?: number; menuWidth?: number },
) => {
  const menuWidth = options?.menuWidth ?? 190;
  const itemCount = Math.max(1, options?.itemCount ?? 14);
  const estimatedHeight = Math.min(8 + itemCount * 36, Math.max(200, window.innerHeight - 24));
  const gap = 6;
  const margin = 12;
  const spaceBelow = window.innerHeight - anchor.bottom - margin;
  const spaceAbove = anchor.top - margin;
  const placeBelow = spaceBelow >= Math.min(estimatedHeight, 240) || spaceBelow >= spaceAbove;
  const available = Math.max(120, placeBelow ? spaceBelow - gap : spaceAbove - gap);
  const maxHeight = Math.min(estimatedHeight, available);
  let top = placeBelow ? anchor.bottom + gap : anchor.top - gap - maxHeight;
  top = Math.max(margin, Math.min(top, window.innerHeight - maxHeight - margin));
  const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - menuWidth - margin));
  return { left, top, maxHeight };
};

const formatSavedAt = () => {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const isTiptapBlockEmpty = (editor: any) => {
  const parentText = editor.state.selection.$from.parent.textContent ?? "";
  return parentText.replace(/\u00a0/g, "").trim().length === 0;
};

const isCurrentCodeLineEmpty = (editor: any) => {
  const { $from } = editor.state.selection;
  const textBefore = editor.state.doc.textBetween($from.start(), editor.state.selection.from, "\n", "\n");
  const currentLine = textBefore.split("\n").pop() ?? "";
  return currentLine.replace(/\u00a0/g, "").trim().length === 0;
};

const insertParagraphAfterAncestor = (editor: any, ancestorName: string) => editor.chain().focus().command(({ state, dispatch }: any) => {
  const { $from } = state.selection;
  let depth = -1;
  for (let d = $from.depth; d > 0; d -= 1) {
    if ($from.node(d).type.name === ancestorName) {
      depth = d;
      break;
    }
  }
  if (depth < 0) return false;
  const posAfter = $from.after(depth);
  const paragraph = state.schema.nodes.paragraph.create();
  const tr = state.tr.insert(posAfter, paragraph);
  tr.setSelection(state.selection.constructor.near(tr.doc.resolve(posAfter + 1)));
  dispatch?.(tr);
  return true;
}).run();

const VideoNode = TiptapNode.create({
  name: "video",
  group: "block",
  inline: false,
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      poster: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", {
      ...HTMLAttributes,
      controls: "true",
      class: "doc-video",
      style: "display:block;max-width:100%;margin:12px 0;border-radius:8px;background:#000",
    }];
  },
});

const AttachmentNode = TiptapNode.create({
  name: "attachment",
  group: "block",
  inline: false,
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (element) => element.getAttribute("href") },
      fileName: { default: "附件", parseHTML: (element) => element.getAttribute("data-file-name") },
      fileSize: { default: 0, parseHTML: (element) => Number(element.getAttribute("data-file-size") || 0) },
      fileType: { default: "application/octet-stream", parseHTML: (element) => element.getAttribute("data-file-type") },
    };
  },
  parseHTML() {
    return [{ tag: "a[data-attachment][href]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const fileName = String(HTMLAttributes.fileName || HTMLAttributes["data-file-name"] || "附件");
    const fileSize = Number(HTMLAttributes.fileSize || HTMLAttributes["data-file-size"] || 0);
    return ["a", {
      href: HTMLAttributes.src,
      download: fileName,
      "data-attachment": "true",
      "data-file-name": fileName,
      "data-file-size": String(fileSize),
      "data-file-type": String(HTMLAttributes.fileType || "application/octet-stream"),
      class: "doc-attachment",
      title: `下载 ${fileName}`,
    }, `${fileName} · ${formatFileSize(fileSize)}`];
  },
});

const BlockAnchorExtension = Extension.create({
  name: "blockAnchor",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading", "blockquote", "codeBlock"],
      attributes: {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("id"),
          renderHTML: (attributes) => attributes.id ? { id: attributes.id } : {},
        },
      },
    }];
  },
});

const tableRowHeightAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute("data-row-height") || element.style.height || null,
  renderHTML: (attributes: { rowHeight?: string | null }) => {
    if (!attributes.rowHeight) return {};
    return {
      "data-row-height": attributes.rowHeight,
      style: `height:${attributes.rowHeight};min-height:${attributes.rowHeight}`,
    };
  },
};

const TableCellWithRowHeight = TableCell.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      rowHeight: tableRowHeightAttribute,
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeHtmlAttrs(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

const TableHeaderWithRowHeight = TableHeader.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      rowHeight: tableRowHeightAttribute,
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["th", mergeHtmlAttrs(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

const INDENT_TYPES = ["paragraph", "heading"] as const;
const INDENT_STEP_PX = 24;
const INDENT_MAX = 8;

const IndentExtension = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: [...INDENT_TYPES],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const data = Number(element.getAttribute("data-indent") || 0);
              if (Number.isFinite(data) && data > 0) return Math.min(INDENT_MAX, Math.max(0, Math.round(data)));
              const margin = element.style.marginLeft || "";
              const px = Number.parseFloat(margin);
              if (Number.isFinite(px) && px > 0) return Math.min(INDENT_MAX, Math.max(0, Math.round(px / INDENT_STEP_PX)));
              return 0;
            },
            renderHTML: (attributes) => {
              const level = Number(attributes.indent) || 0;
              if (!level) return {};
              return {
                "data-indent": String(level),
                style: `margin-left: ${level * INDENT_STEP_PX}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }) => {
        const { $from, from, to } = state.selection;
        let changed = false;
        const applyAt = (pos: number, node: any) => {
          if (!INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) return;
          const current = Number(node.attrs.indent) || 0;
          const next = Math.min(INDENT_MAX, current + 1);
          if (next === current) return;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        };
        if (from === to) {
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) {
              applyAt($from.before(depth), node);
              break;
            }
          }
        } else {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) applyAt(pos, node);
          });
        }
        if (changed && dispatch) dispatch(tr);
        return changed;
      },
      outdent: () => ({ tr, state, dispatch }) => {
        const { $from, from, to } = state.selection;
        let changed = false;
        const applyAt = (pos: number, node: any) => {
          if (!INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) return;
          const current = Number(node.attrs.indent) || 0;
          const next = Math.max(0, current - 1);
          if (next === current) return;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        };
        if (from === to) {
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) {
              applyAt($from.before(depth), node);
              break;
            }
          }
        } else {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) applyAt(pos, node);
          });
        }
        if (changed && dispatch) dispatch(tr);
        return changed;
      },
    } as any;
  },
});

const TyporaKeymap = Extension.create({
  name: "typoraKeymap",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": () => this.editor.chain().focus().toggleBlockquote().run(),
      "Mod-Enter": () => {
        if (this.editor.isActive("codeBlock")) return this.editor.chain().focus().exitCode().run();
        return false;
      },
      Escape: () => {
        if (this.editor.isActive("codeBlock")) return this.editor.chain().focus().exitCode().run();
        return false;
      },
      Tab: () => {
        if (this.editor.isActive("listItem")) return this.editor.chain().focus().sinkListItem("listItem").run();
        if (this.editor.isActive("taskItem")) return this.editor.chain().focus().sinkListItem("taskItem").run();
        return this.editor.commands.indent();
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) return this.editor.chain().focus().liftListItem("listItem").run();
        if (this.editor.isActive("taskItem")) return this.editor.chain().focus().liftListItem("taskItem").run();
        return this.editor.commands.outdent();
      },
      Space: () => {
        const { $from } = this.editor.state.selection;
        const start = $from.start();
        const from = this.editor.state.selection.from;
        const textBefore = this.editor.state.doc.textBetween(start, from, "\n", "\n");
        const clearTrigger = () => this.editor.chain().focus().deleteRange({ from: start, to: from });
        if (/^#{1,6}$/.test(textBefore)) {
          return clearTrigger().toggleHeading({ level: textBefore.length as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }
        if (textBefore === ">") {
          return clearTrigger().toggleBlockquote().run();
        }
        if (/^\d+\.$/.test(textBefore)) {
          return clearTrigger().toggleOrderedList().run();
        }
        if (/^[-*+]$/.test(textBefore)) {
          return clearTrigger().toggleBulletList().run();
        }
        if (textBefore === "```") {
          return clearTrigger().toggleCodeBlock().run();
        }
        return false;
      },
      Enter: () => {
        if (this.editor.isActive("codeBlock")) {
          if (isCurrentCodeLineEmpty(this.editor)) return this.editor.chain().focus().exitCode().run();
          return this.editor.commands.newlineInCode();
        }
        if (this.editor.isActive("blockquote") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().toggleBlockquote().setParagraph().run();
        }
        if (this.editor.isActive("taskItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("taskItem").setParagraph().run();
        }
        if (this.editor.isActive("listItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("listItem").setParagraph().run();
        }
        return false;
      },
      Backspace: () => {
        if (this.editor.isActive("blockquote") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().toggleBlockquote().setParagraph().run();
        }
        if (this.editor.isActive("taskItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("taskItem").setParagraph().run();
        }
        if (this.editor.isActive("listItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("listItem").setParagraph().run();
        }
        return false;
      },
    };
  },
});

function RichEditorTiptap({ docName, nodeId, initialHtml, onContentChange, fontSize: propFontSize, lineHeight: propLineHeight, theme: propTheme }: {
  docName: string; nodeId: string; initialHtml?: string; onContentChange?: (html: string, text: string) => void;
  fontSize?: string; lineHeight?: string; theme?: string;
}) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const lastExternalHtmlRef = useRef("");
  const lastSyncedNodeIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [toolbarTick, setToolbarTick] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  type ToolbarPanel = null | "heading" | "font" | "size" | "align" | "fore" | "back" | "link" | "table";
  const [toolbarPanel, setToolbarPanel] = useState<ToolbarPanel>(null);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });
  const [headingDropPos, setHeadingDropPos] = useState({ x: 0, y: 0 });
  const [fontDropPos, setFontDropPos] = useState({ x: 0, y: 0 });
  const [sizeDropPos, setSizeDropPos] = useState({ x: 0, y: 0 });
  const [alignDropPos, setAlignDropPos] = useState({ x: 0, y: 0 });
  const [linkModalPos, setLinkModalPos] = useState({ x: 0, y: 0 });
  const [linkModalText, setLinkModalText] = useState("");
  const [linkModalUrl, setLinkModalUrl] = useState("");
  const [linkModalMode, setLinkModalMode] = useState<"insert" | "edit">("insert");
  const showColorPicker = toolbarPanel === "fore" || toolbarPanel === "back" ? toolbarPanel : null;
  const showHeadingDropdown = toolbarPanel === "heading";
  const showFontDropdown = toolbarPanel === "font";
  const showSizeDropdown = toolbarPanel === "size";
  const showAlignDropdown = toolbarPanel === "align";
  const showLinkModal = toolbarPanel === "link";
  const showTableModal = toolbarPanel === "table";
  const setShowColorPicker = (v: "fore" | "back" | null) => setToolbarPanel(v);
  const setShowHeadingDropdown = (v: boolean) => setToolbarPanel(v ? "heading" : null);
  const setShowFontDropdown = (v: boolean) => setToolbarPanel(v ? "font" : null);
  const setShowSizeDropdown = (v: boolean) => setToolbarPanel(v ? "size" : null);
  const setShowAlignDropdown = (v: boolean) => setToolbarPanel(v ? "align" : null);
  const setShowLinkModal = (v: boolean) => setToolbarPanel(v ? "link" : null);
  const setShowTableModal = (v: boolean) => setToolbarPanel(v ? "table" : null);
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const [tableToolbarPos, setTableToolbarPos] = useState({ top: 0, left: 0 });
  const [tableRowHandles, setTableRowHandles] = useState<{ top: number; left: number; width: number; index: number; row: HTMLTableRowElement }[]>([]);
  const [activeRowResizeIndex, setActiveRowResizeIndex] = useState<number | null>(null);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [selectedImgRect, setSelectedImgRect] = useState<DOMRect | null>(null);
  const [editorVisibleRect, setEditorVisibleRect] = useState<DOMRect | null>(null);
  const [imageRatioLocked, setImageRatioLocked] = useState(true);
  const [imageCustomPct, setImageCustomPct] = useState("");
  const [imgBarSlider, setImgBarSlider] = useState(false);
  const selectedImagePosRef = useRef<number | null>(null);
  const [tocHeadings, setTocHeadings] = useState<{ tag: string; text: string; id: string }[]>([]);
  const [tocActiveId, setTocActiveId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ top: number; left: number; maxHeight?: number } | null>(null);
  const [slashActive, setSlashActive] = useState(-1);
  const slashMenuRef = useRef<typeof slashMenu>(null);
  const slashActiveRef = useRef(-1);
  const slashMenuElRef = useRef<HTMLDivElement | null>(null);
  const slashItemsRef = useRef<{ label: string; icon: React.ReactNode; action: () => void; kind?: "file" }[]>([]);
  const editorInstanceRef = useRef<any>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  imageRatioLockedRef.current = imageRatioLocked;
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const pendingSlashCleanupRef = useRef<{ from: number; to: number } | null>(null);
  const tocListRef = useRef<HTMLDivElement>(null);
  const tocButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const tocScrollRafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  slashMenuRef.current = slashMenu;
  slashActiveRef.current = slashActive;

  const saveEditorSelection = useCallback(() => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return null;
    const selection = { from: activeEditor.state.selection.from, to: activeEditor.state.selection.to };
    savedSelectionRef.current = selection;
    return selection;
  }, []);

  const updateTableToolbar = useCallback((activeEditor = editorInstanceRef.current) => {
    if (!activeEditor || !activeEditor.isActive("table")) {
      setShowTableToolbar(false);
      setTableRowHandles([]);
      return;
    }
    saveEditorSelection();
    const { from } = activeEditor.state.selection;
    const domAtPos = activeEditor.view.domAtPos(from);
    const node = domAtPos.node.nodeType === Node.ELEMENT_NODE
      ? domAtPos.node as Element
      : domAtPos.node.parentElement;
    const table = node?.closest?.("table");
    if (!table) {
      setShowTableToolbar(false);
      setTableRowHandles([]);
      return;
    }
    const wrapper = table.closest(".tableWrapper") ?? table;
    const rect = wrapper.getBoundingClientRect();
    const toolbarBottom = toolbarRef.current?.getBoundingClientRect().bottom ?? 120;
    const editorTop = activeEditor.view.dom.getBoundingClientRect().top;
    const safeTop = Math.max(toolbarBottom + 8, editorTop);
    const rowRects = Array.from(table.querySelectorAll("tr")).map((row, index) => {
      const rowRect = row.getBoundingClientRect();
      return {
        index,
        left: Math.max(12, rowRect.left),
        top: rowRect.bottom - 6,
        width: Math.max(80, rowRect.width),
        row,
      };
    }).filter((handle) => handle.top >= safeTop && handle.top < window.innerHeight - 8);
    const tableBarTop = Math.max(safeTop, rect.top - 42);
    setTableToolbarPos({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 620)),
      top: tableBarTop,
    });
    setTableRowHandles(rowRects);
    setShowTableToolbar(true);
  }, [saveEditorSelection]);

  const clearImageToolbar = useCallback(() => {
    selectedImagePosRef.current = null;
    setSelectedImgRect(null);
    setEditorVisibleRect(null);
  }, []);

  const updateImageToolbar = useCallback((activeEditor = editorInstanceRef.current) => {
    if (!activeEditor || activeEditor.isDestroyed || !activeEditor.isActive("image")) {
      clearImageToolbar();
      return;
    }
    const { from } = activeEditor.state.selection;
    let pos: number | null = null;
    const nodeAt = activeEditor.state.doc.nodeAt(from);
    if (nodeAt?.type?.name === "image") pos = from;
    else {
      const $from = activeEditor.state.selection.$from;
      for (let d = $from.depth; d >= 0; d--) {
        const n = $from.node(d);
        if (n.type.name === "image") {
          pos = $from.before(d);
          break;
        }
      }
      if (pos == null) {
        const maybe = activeEditor.state.selection as { node?: { type?: { name?: string } }; from: number };
        if (maybe.node?.type?.name === "image") pos = maybe.from;
      }
    }
    if (pos == null) {
      clearImageToolbar();
      return;
    }
    const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
    if (!dom) {
      clearImageToolbar();
      return;
    }
    const img = (dom.tagName === "IMG" ? dom : dom.querySelector("img")) as HTMLImageElement | null;
    const target = img ?? dom;
    const rect = target.getBoundingClientRect();
    const toolbarBottom = toolbarRef.current?.getBoundingClientRect().bottom ?? 120;
    if (rect.bottom + 56 < toolbarBottom || rect.top > window.innerHeight) {
      clearImageToolbar();
      return;
    }
    selectedImagePosRef.current = pos;
    setSelectedImgRect(rect);
    setEditorVisibleRect(activeEditor.view.dom.getBoundingClientRect());
  }, [clearImageToolbar]);

  const applySelectedImageWidth = useCallback((pct: number | "auto") => {
    const activeEditor = editorInstanceRef.current;
    const pos = selectedImagePosRef.current;
    if (!activeEditor || pos == null) return;
    const node = activeEditor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== "image") return;
    const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
    const img = (dom?.tagName === "IMG" ? dom : dom?.querySelector("img")) as HTMLImageElement | null;
    if (pct === "auto") {
      if (img) {
        img.style.width = "";
        img.style.height = "";
        img.style.maxWidth = "";
      }
      syncContainerToImage(dom);
      activeEditor.chain().setNodeSelection(pos).updateAttributes("image", { width: null, height: null }).run();
    } else {
      const parentW = activeEditor.view.dom.clientWidth || 1;
      const width = Math.max(48, Math.round(parentW * Math.min(100, Math.max(5, pct)) / 100));
      const naturalW = img?.naturalWidth || Number(node.attrs.width) || width;
      const naturalH = img?.naturalHeight || Number(node.attrs.height) || width;
      const locked = imageRatioLockedRef.current;
      const sized = fitImageSize(width, width / (naturalW / Math.max(1, naturalH)), naturalW, naturalH, locked);
      if (img) {
        img.style.width = `${sized.width}px`;
        img.style.height = locked ? "auto" : `${sized.height}px`;
        img.style.maxWidth = "none";
      }
      syncContainerToImage(dom);
      activeEditor.chain().setNodeSelection(pos).updateAttributes("image", {
        width: sized.width,
        height: locked ? null : sized.height,
      }).run();
    }
    window.requestAnimationFrame(() => {
      syncContainerToImage(activeEditor.view.nodeDOM(pos) as HTMLElement | null);
      updateImageToolbar(activeEditor);
    });
  }, [updateImageToolbar]);

  const persistRowHeight = useCallback((cells: HTMLTableCellElement[], height: number) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor || cells.length === 0) return;
    const value = `${Math.round(height)}px`;
    let tr = activeEditor.state.tr;
    cells.forEach((cell) => {
      const rawPos = activeEditor.view.posAtDOM(cell, 0);
      const candidates = [rawPos - 1, rawPos, rawPos + 1].filter((pos, index, arr) => pos >= 0 && arr.indexOf(pos) === index);
      const cellPos = candidates.find((pos) => {
        const node = activeEditor.state.doc.nodeAt(pos);
        return node?.type.name === "tableCell" || node?.type.name === "tableHeader";
      });
      if (cellPos == null) return;
      const node = tr.doc.nodeAt(cellPos);
      if (!node) return;
      tr = tr.setNodeMarkup(cellPos, undefined, { ...node.attrs, rowHeight: value }, node.marks);
    });
    if (tr.docChanged) activeEditor.view.dispatch(tr);
    window.setTimeout(() => updateTableToolbar(activeEditor), 0);
  }, [updateTableToolbar]);

  const ensureHeadingAnchors = useCallback((activeEditor: any) => {
    if (!activeEditor || activeEditor.isDestroyed) return false;
    const seenIds = new Set<string>();
    const safeNodeId = (nodeId || "document").replace(/[^a-zA-Z0-9_-]/g, "-");
    let transaction = activeEditor.state.tr;
    activeEditor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name !== "heading") return;
      const currentId = typeof node.attrs.id === "string" ? node.attrs.id.trim() : "";
      if (currentId && !seenIds.has(currentId)) {
        seenIds.add(currentId);
        return;
      }
      const randomPart = typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const nextId = `heading-${safeNodeId}-${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, "-");
      seenIds.add(nextId);
      transaction = transaction.setNodeMarkup(pos, undefined, { ...node.attrs, id: nextId }, node.marks);
    });
    if (!transaction.docChanged) return false;
    activeEditor.view.dispatch(transaction);
    return true;
  }, [nodeId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        codeBlock: {
          HTMLAttributes: { class: "doc-code-block" },
        },
        blockquote: {
          HTMLAttributes: { class: "doc-blockquote" },
        },
        bulletList: {
          keepMarks: true,
          HTMLAttributes: { class: "doc-list doc-bullet-list" },
        },
        orderedList: {
          keepMarks: true,
          HTMLAttributes: { class: "doc-list doc-ordered-list" },
        },
      }),
      TyporaKeymap,
      TextStyle,
      Color,
      BackgroundColor,
      FontFamily,
      FontSize,
      LineHeight,
      IndentExtension,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Placeholder.configure({ placeholder: "输入 / 呼出命令，或直接开始写作" }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { class: "doc-link", target: "_blank", rel: "noreferrer" },
      }),
      BlockAnchorExtension,
      VideoNode,
      AttachmentNode,
      ResizableImage.configure({
        allowBase64: true,
        HTMLAttributes: { class: "doc-image" },
        resize: { enabled: true, alwaysPreserveAspectRatio: false, minWidth: 48, minHeight: 48 },
      }),
      Table.configure({
        resizable: true,
        cellMinWidth: 96,
        handleWidth: 6,
        lastColumnResizable: false,
        HTMLAttributes: { class: "doc-table" },
      }),
      TableRow,
      TableHeaderWithRowHeight,
      TableCellWithRowHeight,
      TaskList.configure({ HTMLAttributes: { class: "doc-task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "doc-task-item" } }),
    ],
    content: sanitizeHtml(initialHtml || emptyParagraph),
    editorProps: {
      handleDOMEvents: {
        keydown: (view, event) => {
          const activeEditor = editorInstanceRef.current;
          if (!activeEditor) return false;
          if (slashMenuRef.current) {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopImmediatePropagation();
              setSlashMenu(null);
              return true;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              event.stopImmediatePropagation();
              const count = slashItemsRef.current.length;
              if (count > 0) {
                const next = event.key === "ArrowDown"
                  ? (slashActiveRef.current + 1 + count) % count
                  : (slashActiveRef.current - 1 + count) % count;
                slashActiveRef.current = next;
                setSlashActive(next);
                requestAnimationFrame(() => {
                  const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${next}"]`);
                  el?.scrollIntoView({ block: "nearest" });
                });
              }
              return true;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopImmediatePropagation();
              const item = slashItemsRef.current[slashActiveRef.current] ?? slashItemsRef.current[0];
              if (item) {
                if (item.kind === "file") runSlashFileAction(item.action);
                else runSlashAction(item.action);
              }
              return true;
            }
          }
          if (event.key === "Tab") {
            if (activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) {
              event.preventDefault();
              const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
              return event.shiftKey
                ? activeEditor.chain().focus().liftListItem(itemName).run()
                : activeEditor.chain().focus().sinkListItem(itemName).run();
            }
            return false;
          }
          if ((event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) && activeEditor.isActive("codeBlock")) {
            event.preventDefault();
            return activeEditor.chain().focus().exitCode().run();
          }
          if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
          if (activeEditor.isActive("codeBlock")) {
            if (isCurrentCodeLineEmpty(activeEditor)) {
              event.preventDefault();
              return activeEditor.chain().focus().exitCode().run();
            }
            return false;
          }
          if (activeEditor.isActive("blockquote") && isTiptapBlockEmpty(activeEditor)) {
            event.preventDefault();
            return insertParagraphAfterAncestor(activeEditor, "blockquote");
          }
          if ((activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) && isTiptapBlockEmpty(activeEditor)) {
            event.preventDefault();
            const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
            return activeEditor.chain().focus().liftListItem(itemName).setParagraph().run();
          }
          return false;
        },
      },
      attributes: {
        class: "doc-tiptap-content ProseMirror h-full min-h-0 overflow-y-auto overscroll-contain px-[24px] py-[24px] outline-none",
        style: `font-size:${propFontSize || "15px"};line-height:${propLineHeight || "1.8"};font-family:PingFang SC, sans-serif;`,
      },
      handleKeyDown(view, event) {
        const activeEditor = editorInstanceRef.current;
        if (!activeEditor) return false;
        if (event.key === "Tab") {
          if (activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) {
            event.preventDefault();
            const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
            return event.shiftKey
              ? activeEditor.chain().focus().liftListItem(itemName).run()
              : activeEditor.chain().focus().sinkListItem(itemName).run();
          }
          return false;
        }
        if ((event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) && activeEditor.isActive("codeBlock")) {
          event.preventDefault();
          return activeEditor.chain().focus().exitCode().run();
        }
        if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
        if (activeEditor.isActive("codeBlock")) {
          if (isCurrentCodeLineEmpty(activeEditor)) {
            event.preventDefault();
            return activeEditor.chain().focus().exitCode().run();
          }
          return false;
        }
        if (activeEditor.isActive("blockquote") && isTiptapBlockEmpty(activeEditor)) {
          event.preventDefault();
          return insertParagraphAfterAncestor(activeEditor, "blockquote");
        }
        if ((activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) && isTiptapBlockEmpty(activeEditor)) {
          event.preventDefault();
          const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
          return activeEditor.chain().focus().liftListItem(itemName).setParagraph().run();
        }
        return false;
      },
      handleTextInput(view, from, to, text) {
        const activeEditor = editorInstanceRef.current;
        if (text === "/") {
          const { $from } = view.state.selection;
          const lineText = view.state.doc.textBetween($from.start(), from, "\n", "\n");
          if (!lineText.trim()) {
            const rect = view.coordsAtPos(from);
            window.setTimeout(() => {
              if (activeEditor?.isDestroyed) return;
              setSlashMenu(getSlashMenuPlacement(
                { left: rect.left, top: rect.top, bottom: rect.bottom },
                { itemCount: slashItemsRef.current.length || 14 },
              ));
              setSlashActive(0);
            }, 0);
          }
          return false;
        }
        if (text !== " " || !activeEditor) return false;
        const { $from } = view.state.selection;
        const start = $from.start();
        const textBefore = view.state.doc.textBetween(start, from, "\n", "\n");
        const clearTrigger = () => activeEditor.chain().focus().deleteRange({ from: start, to: from });
        if (/^#{1,6}$/.test(textBefore)) {
          return clearTrigger().toggleHeading({ level: textBefore.length as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }
        if (textBefore === ">") return clearTrigger().toggleBlockquote().run();
        if (/^\d+\.$/.test(textBefore)) return clearTrigger().toggleOrderedList().run();
        if (/^[-*+]$/.test(textBefore)) return clearTrigger().toggleBulletList().run();
        if (textBefore === "```") return clearTrigger().toggleCodeBlock().run();
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i += 1) {
            if (items[i].type.startsWith("image/")) {
              const file = items[i].getAsFile();
              if (!file) return false;
              event.preventDefault();
              savedSelectionRef.current = { from: view.state.selection.from, to: view.state.selection.to };
              void insertImageFromFile(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const image = Array.from(files).find((file) => file.type.startsWith("image/"));
        if (!image) return false;
        event.preventDefault();
        const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
        savedSelectionRef.current = { from: dropPos, to: dropPos };
        void insertImageFromFile(image);
        return true;
      },
    },
    onCreate({ editor }) {
      if (ensureHeadingAnchors(editor)) return;
      const text = editor.getText();
      setCharCount(getEditorTextCount(text));
      setWordCount(getEditorWordCount(text));
      lastExternalHtmlRef.current = sanitizeHtml(initialHtml || emptyParagraph);
      refreshToc(editor);
    },
    onUpdate({ editor }) {
      if (ensureHeadingAnchors(editor)) return;
      const html = sanitizeHtml(editor.getHTML());
      const text = editor.getText();
      lastExternalHtmlRef.current = html;
      setCharCount(getEditorTextCount(text));
      setWordCount(getEditorWordCount(text));
      setSaveStatus("unsaved");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveStatus("saving");
        window.setTimeout(() => {
          setSavedAt(formatSavedAt());
          setSaveStatus("saved");
        }, 160);
      }, 500);
      onContentChange?.(html, text);
      setToolbarTick((tick) => tick + 1);
      refreshToc(editor);
      updateImageToolbar(editor);
    },
    onSelectionUpdate({ editor }) {
      setToolbarTick((tick) => tick + 1);
      updateTableToolbar(editor);
      updateImageToolbar(editor);
    },
  }, [nodeId, updateTableToolbar, updateImageToolbar, ensureHeadingAnchors]);
  editorInstanceRef.current = editor;

  const refreshToc = useCallback((activeEditor: any) => {
    if (!activeEditor || activeEditor.isDestroyed) return;
    const headings: { tag: string; text: string; id: string }[] = [];
    activeEditor.state.doc.descendants((node: any) => {
      if (node.type.name !== "heading") return;
      const text = String(node.textContent || "").trim().slice(0, 50);
      const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
      if (text && id) headings.push({ tag: `h${node.attrs.level || 1}`, text, id });
    });
    setTocHeadings(headings);
    setTocActiveId((current) => current && headings.some((heading) => heading.id === current) ? current : headings[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = sanitizeHtml(initialHtml || emptyParagraph);
    const nodeChanged = lastSyncedNodeIdRef.current !== nodeId;
    const externalChanged = next !== lastExternalHtmlRef.current;
    if (!nodeChanged && !externalChanged) return;

    lastSyncedNodeIdRef.current = nodeId;
    lastExternalHtmlRef.current = next;
    const current = sanitizeHtml(editor.getHTML());
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    const text = editor.getText();
    setCharCount(getEditorTextCount(text));
    setWordCount(getEditorWordCount(text));
    setSaveStatus("saved");
    setSavedAt(formatSavedAt());
    if (!ensureHeadingAnchors(editor)) refreshToc(editor);
  }, [editor, nodeId, initialHtml, refreshToc, ensureHeadingAnchors]);

  const scrollToHeading = useCallback((headingId: string, behavior: ScrollBehavior = "smooth") => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor || activeEditor.isDestroyed) return false;
    const scrollElement = activeEditor.view.dom as HTMLElement;
    const target = scrollElement.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`);
    if (!target) return false;
    const containerRect = scrollElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTop = Math.max(0, scrollElement.scrollTop + targetRect.top - containerRect.top - 20);
    scrollElement.scrollTo({ top: targetTop, behavior });
    setTocActiveId(headingId);
    return true;
  }, []);

  useEffect(() => {
    if (!editor || new URLSearchParams(window.location.search).get("node") !== nodeId || !window.location.hash) return;
    const anchorId = decodeURIComponent(window.location.hash.slice(1));
    const timer = window.setTimeout(() => { scrollToHeading(anchorId, "smooth"); }, 120);
    return () => window.clearTimeout(timer);
  }, [editor, nodeId, initialHtml, scrollToHeading, tocHeadings]);

  useEffect(() => {
    if (!editor) return;
    const scrollElement = editor.view.dom as HTMLElement;
    const updateActiveHeading = () => {
      tocScrollRafRef.current = null;
      const headings = Array.from(scrollElement.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]"));
      if (headings.length === 0) {
        setTocActiveId(null);
        return;
      }
      const containerRect = scrollElement.getBoundingClientRect();
      const activationLine = containerRect.top + 36;
      let activeHeading = headings[0];
      headings.forEach((heading) => {
        if (heading.getBoundingClientRect().top <= activationLine) activeHeading = heading;
      });
      if (scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 4) {
        activeHeading = headings[headings.length - 1];
      }
      setTocActiveId(activeHeading.id);
    };
    const handleScroll = () => {
      if (tocScrollRafRef.current != null) return;
      tocScrollRafRef.current = window.requestAnimationFrame(updateActiveHeading);
    };
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      if (tocScrollRafRef.current != null) window.cancelAnimationFrame(tocScrollRafRef.current);
      tocScrollRafRef.current = null;
    };
  }, [editor, nodeId, tocHeadings]);

  useEffect(() => {
    if (!tocActiveId) return;
    const list = tocListRef.current;
    const button = tocButtonRefs.current.get(tocActiveId);
    if (!list || !button) return;
    const listRect = list.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.top < listRect.top) list.scrollTop -= listRect.top - buttonRect.top + 4;
    else if (buttonRect.bottom > listRect.bottom) list.scrollTop += buttonRect.bottom - listRect.bottom + 4;
  }, [tocActiveId]);

  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        if (editor.isActive("listItem") || editor.isActive("taskItem")) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const itemName = editor.isActive("taskItem") ? "taskItem" : "listItem";
          if (event.shiftKey) editor.chain().focus().liftListItem(itemName).run();
          else editor.chain().focus().sinkListItem(itemName).run();
        }
        return;
      }
      if ((event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) && editor.isActive("codeBlock")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        editor.chain().focus().exitCode().run();
        return;
      }
      if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (editor.isActive("codeBlock") && isCurrentCodeLineEmpty(editor)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        editor.chain().focus().exitCode().run();
        return;
      }
      if (editor.isActive("blockquote") && isTiptapBlockEmpty(editor)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        insertParagraphAfterAncestor(editor, "blockquote");
        return;
      }
      if ((editor.isActive("listItem") || editor.isActive("taskItem")) && isTiptapBlockEmpty(editor)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const itemName = editor.isActive("taskItem") ? "taskItem" : "listItem";
        editor.chain().focus().liftListItem(itemName).setParagraph().run();
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener("keydown", handler, true);
    return () => dom.removeEventListener("keydown", handler, true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      updateTableToolbar(editor);
      updateImageToolbar(editor);
    };
    const onViewportChange = () => {
      setToolbarPanel(null);
      setSlashMenu(null);
      handler();
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    document.addEventListener("mouseup", handler);
    document.addEventListener("fullscreenchange", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("fullscreenchange", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, [editor, updateTableToolbar, updateImageToolbar]);

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimeout(saveTimer.current);
    if (tocScrollRafRef.current != null) window.cancelAnimationFrame(tocScrollRafRef.current);
  }, []);

  const runEditorCommand = useCallback((command: (activeEditor: any) => boolean | void) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor || activeEditor.isDestroyed) {
      setToast({ message: "编辑器正在初始化，请稍后重试", type: "info" });
      return false;
    }
    try {
      const selection = savedSelectionRef.current;
      if (selection) {
        const maxPos = activeEditor.state.doc.content.size;
        const from = Math.max(0, Math.min(selection.from, maxPos));
        const to = Math.max(0, Math.min(selection.to, maxPos));
        activeEditor.chain().focus().setTextSelection({ from, to }).run();
      } else if (!activeEditor.isFocused) {
        activeEditor.chain().focus().run();
      }
      return command(activeEditor) !== false;
    } catch (error) {
      console.error("Editor command failed:", error);
      setToast({ message: "编辑命令执行失败，请重新选择内容后重试", type: "error" });
      return false;
    }
  }, []);

  const getCurrentHeading = () => {
    if (!editor) return "正文";
    for (let level = 1; level <= 5; level += 1) {
      if (editor.isActive("heading", { level })) return HEADING_OPTIONS[level];
    }
    return "正文";
  };
  const getCurrentFont = () => editor?.getAttributes("textStyle").fontFamily || "系统默认";
  const getCurrentSize = () => editor?.getAttributes("textStyle").fontSize || propFontSize || "15px";
  const activeFormats = new Set<string>();
  if (editor?.isActive("bold")) activeFormats.add("bold");
  if (editor?.isActive("italic")) activeFormats.add("italic");
  if (editor?.isActive("strike")) activeFormats.add("strikeThrough");
  if (editor?.isActive("underline")) activeFormats.add("underline");
  if (editor?.isActive("blockquote")) activeFormats.add("blockquote");
  if (editor?.isActive("link")) activeFormats.add("link");
  void toolbarTick;
  void propTheme;

  const IconSvg = ({ path, fill, stroke, viewBox = "0 0 20 20", isFill }: { path: string | string[]; fill?: string; stroke?: string; viewBox?: string; isFill?: boolean }) => (
    <div className="absolute left-[4px] size-[20px] top-[4px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox={viewBox}>
        {(Array.isArray(path) ? path : [path]).map((d, i) => (
          isFill
            ? <path key={i} d={d} fill={fill ?? "#131212"} />
            : <path key={i} d={d} stroke={stroke ?? "#131212"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        ))}
      </svg>
    </div>
  );

  const InlineIconSvg = ({ path, fill, stroke, viewBox = "0 0 20 20", isFill }: { path: string | string[]; fill?: string; stroke?: string; viewBox?: string; isFill?: boolean }) => (
    <svg className="block size-[16px]" fill="none" preserveAspectRatio="xMidYMid meet" viewBox={viewBox} aria-hidden="true">
      {(Array.isArray(path) ? path : [path]).map((d, i) => (
        isFill
          ? <path key={i} d={d} fill={fill ?? "#131212"} />
          : <path key={i} d={d} stroke={stroke ?? "#131212"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
      ))}
    </svg>
  );

  const Btn = ({ label, cmd, action, children, getBtnRef }: { label: string; cmd?: string; action?: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; getBtnRef?: (el: HTMLButtonElement | null) => void }) => (
    <EditorToolBtn
      label={label}
      cmd={cmd}
      activeFormats={activeFormats}
      action={(e) => {
        saveEditorSelection();
        action?.(e);
      }}
      getBtnRef={getBtnRef}
    >{children}</EditorToolBtn>
  );

  const Dropdown = ({ items, onSelect, onClose, position }: { items: string[]; onSelect: (v: string) => void; onClose: () => void; position: { x: number; y: number } }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
      const timer = window.setTimeout(() => document.addEventListener("mousedown", handler), 0);
      return () => {
        window.clearTimeout(timer);
        document.removeEventListener("mousedown", handler);
      };
    }, [onClose]);
    return createPortal(
      <div
        ref={ref}
        className="fixed z-[280] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] p-[4px] flex flex-col gap-[4px] min-w-[120px]"
        style={{ left: position.x, top: position.y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <button key={item} type="button" className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] text-[14px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap text-left"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(item);
              onClose();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}>{item}</button>
        ))}
      </div>,
      document.body,
    );
  };

  const closeAllToolbarPanels = () => setToolbarPanel(null);

  const toggleToolbarPanel = (panel: Exclude<ToolbarPanel, null>, pos?: { x: number; y: number }) => {
    if (pos) {
      if (panel === "heading") setHeadingDropPos(pos);
      else if (panel === "font") setFontDropPos(pos);
      else if (panel === "size") setSizeDropPos(pos);
      else if (panel === "align") setAlignDropPos(pos);
      else if (panel === "fore" || panel === "back") setColorPickerPos(pos);
    }
    setToolbarPanel((cur) => (cur === panel ? null : panel));
  };

  const applyTextAlign = (align: "left" | "center" | "right" | "justify") => runEditorCommand((activeEditor) => {
    if (activeEditor.chain().focus().setTextAlign(align).run()) return true;
    const { state, view } = activeEditor;
    const { $from, from, to } = state.selection;
    const types = new Set(["paragraph", "heading"]);
    const tr = state.tr;
    let changed = false;
    const applyAt = (pos: number, node: any) => {
      if (!types.has(node.type.name)) return;
      if (node.attrs?.textAlign === align) return;
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: align });
      changed = true;
    };
    if (from === to) {
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth);
        if (types.has(node.type.name)) {
          applyAt($from.before(depth), node);
          break;
        }
      }
    } else {
      state.doc.nodesBetween(from, to, (node: any, pos: number) => {
        applyAt(pos, node);
      });
    }
    if (!changed) {
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth);
        if (types.has(node.type.name)) {
          applyAt($from.before(depth), node);
          break;
        }
      }
    }
    if (changed) {
      view.dispatch(tr);
      activeEditor.commands.focus();
      return true;
    }
    return false;
  });

  const applyIndent = (dir: 1 | -1) => runEditorCommand((activeEditor) => {
    if (activeEditor.isActive("taskItem")) {
      return dir > 0
        ? activeEditor.chain().focus().sinkListItem("taskItem").run()
        : activeEditor.chain().focus().liftListItem("taskItem").run();
    }
    if (activeEditor.isActive("listItem")) {
      return dir > 0
        ? activeEditor.chain().focus().sinkListItem("listItem").run()
        : activeEditor.chain().focus().liftListItem("listItem").run();
    }
    return dir > 0
      ? activeEditor.chain().focus().indent().run()
      : activeEditor.chain().focus().outdent().run();
  });

  const openLinkDialog = (anchorRect?: DOMRect) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    restoreEditorSelection(activeEditor);
    const attrs = activeEditor.getAttributes("link");
    const selectedText = activeEditor.state.doc.textBetween(activeEditor.state.selection.from, activeEditor.state.selection.to, " ");
    setLinkModalMode(attrs.href ? "edit" : "insert");
    setLinkModalText(selectedText || "");
    setLinkModalUrl(attrs.href || "");
    const caretPos = getCaretMenuPosition();
    setLinkModalPos(anchorRect ? { x: anchorRect.left - 150, y: anchorRect.bottom + 8 } : { x: caretPos.left - 150, y: caretPos.top + 8 });
    setToolbarPanel("link");
  };

  const restoreEditorSelection = (activeEditor = editorInstanceRef.current) => {
    if (!activeEditor) return false;
    const selection = savedSelectionRef.current;
    if (!selection) {
      activeEditor.chain().focus().run();
      return true;
    }
    const maxPos = activeEditor.state.doc.content.size;
    const from = Math.max(0, Math.min(selection.from, maxPos));
    const to = Math.max(0, Math.min(selection.to, maxPos));
    activeEditor.chain().focus().setTextSelection({ from, to }).run();
    return true;
  };

  const markSlashCleanup = () => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return null;
    const { from } = activeEditor.state.selection;
    const textBefore = activeEditor.state.doc.textBetween(Math.max(0, from - 1), from);
    const cleanup = textBefore === "/" ? { from: from - 1, to: from } : null;
    pendingSlashCleanupRef.current = cleanup;
    return cleanup;
  };

  const cleanupPendingSlash = () => {
    const activeEditor = editorInstanceRef.current;
    const cleanup = pendingSlashCleanupRef.current;
    pendingSlashCleanupRef.current = null;
    if (!activeEditor || !cleanup) return false;
    activeEditor.chain().focus().deleteRange(cleanup).run();
    savedSelectionRef.current = { from: cleanup.from, to: cleanup.from };
    return true;
  };

  const openLinkModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    saveEditorSelection();
    openLinkDialog(e.currentTarget.getBoundingClientRect());
  };

  const applyLink = ({ text, url }: { text: string; url: string }) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    if (text.trim() && activeEditor.state.selection.empty) {
      activeEditor.chain().focus().insertContent(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(text.trim())}</a>`).run();
      return;
    }
    activeEditor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank", rel: "noreferrer" }).run();
  };

  const insertImageFromFile = async (file?: File | null) => {
    const activeEditor = editorInstanceRef.current;
    if (!file || !activeEditor) return;
    try {
      const src = await compressImageForEmbed(file);
      if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
      cleanupPendingSlash();
      restoreEditorSelection(activeEditor);
      if (!activeEditor.chain().focus().setImage({ src, alt: file.name }).run()) throw new Error("图片插入失败");
      setToast({ message: "图片已插入", type: "success" });
    } catch (error) {
      console.error("Failed to insert image:", error);
      if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "图片插入失败", type: "error" });
    }
  };

  const insertVideoFromFile = async (file?: File | null) => {
    const activeEditor = editorInstanceRef.current;
    if (!file || !activeEditor) return;
    try {
      if (!file.type.startsWith("video/")) throw new Error("请选择视频文件");
      if (file.size > MAX_VIDEO_BYTES) throw new Error("视频不能超过 20MB");
      const src = await fileToDataUrl(file);
      if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
      cleanupPendingSlash();
      restoreEditorSelection(activeEditor);
      if (!activeEditor.chain().focus().insertContent({ type: "video", attrs: { src, controls: true } }).run()) throw new Error("视频插入失败");
      setToast({ message: "视频已插入", type: "success" });
    } catch (error) {
      console.error("Failed to insert video:", error);
      if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "视频插入失败", type: "error" });
    }
  };

  const insertAttachmentFromFile = async (file?: File | null) => {
    const activeEditor = editorInstanceRef.current;
    if (!file || !activeEditor) return;
    try {
      if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("附件不能超过 10MB");
      const src = await fileToDataUrl(file);
      if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
      cleanupPendingSlash();
      restoreEditorSelection(activeEditor);
      if (!activeEditor.chain().focus().insertContent({
        type: "attachment",
        attrs: { src, fileName: file.name, fileSize: file.size, fileType: file.type || "application/octet-stream" },
      }).run()) throw new Error("附件插入失败");
      setToast({ message: "附件已插入", type: "success" });
    } catch (error) {
      console.error("Failed to insert attachment:", error);
      if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "附件插入失败", type: "error" });
    }
  };

  const openImagePicker = () => {
    saveEditorSelection();
    imgInputRef.current?.click();
  };

  const openVideoPicker = () => {
    saveEditorSelection();
    videoInputRef.current?.click();
  };

  const openAttachmentPicker = () => {
    saveEditorSelection();
    attachInputRef.current?.click();
  };

  const openTableDialog = () => {
    saveEditorSelection();
    setTableRows("3");
    setTableCols("3");
    setToolbarPanel("table");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    void insertImageFromFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    void insertVideoFromFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const startTableRowResize = (
    event: React.PointerEvent<HTMLDivElement>,
    handle: { index: number; row: HTMLTableRowElement },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const row = handle.row;
    const cells = Array.from(row.querySelectorAll("td, th")) as HTMLTableCellElement[];
    if (cells.length === 0 || !row.isConnected) return;

    const resizeHandle = event.currentTarget;
    const pointerId = event.pointerId;
    const startY = event.clientY;
    const startHeight = row.getBoundingClientRect().height;
    let latestHeight = startHeight;
    let finished = false;

    const applyHeight = (height: number) => {
      latestHeight = Math.max(34, height);
      const value = `${latestHeight}px`;
      row.style.height = value;
      row.style.minHeight = value;
      cells.forEach((cell) => {
        cell.style.height = value;
        cell.style.minHeight = value;
      });
      resizeHandle.style.top = `${row.getBoundingClientRect().bottom - 6}px`;
    };

    const cleanup = (persist: boolean) => {
      if (finished) return;
      finished = true;
      document.body.classList.remove("table-row-resize-cursor");
      setActiveRowResizeIndex(null);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("keydown", onKeyDown, true);
      try {
        resizeHandle.releasePointerCapture?.(pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
      if (persist) persistRowHeight(cells, latestHeight);
      window.setTimeout(() => updateTableToolbar(editorInstanceRef.current), 0);
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      applyHeight(startHeight + moveEvent.clientY - startY);
    };
    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      upEvent.preventDefault();
      applyHeight(startHeight + upEvent.clientY - startY);
      cleanup(true);
    };
    const onCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      cleanup(true);
    };
    const onBlur = () => cleanup(true);
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") cleanup(false);
    };

    setActiveRowResizeIndex(handle.index);
    document.body.classList.add("table-row-resize-cursor");
    try {
      resizeHandle.setPointerCapture?.(pointerId);
    } catch {
      // Window-level listeners still keep the drag active without capture.
    }
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    window.addEventListener("blur", onBlur);
    document.addEventListener("keydown", onKeyDown, true);
  };

  const runTableCommand = (command: "addRowBefore" | "addRowAfter" | "deleteRow" | "addColumnBefore" | "addColumnAfter" | "deleteColumn" | "deleteTable") => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    restoreEditorSelection(activeEditor);
    activeEditor.chain().focus()[command]().run();
    if (command === "deleteTable") setShowTableToolbar(false);
    window.setTimeout(() => updateTableToolbar(activeEditor), 0);
  };

  const insertTable = () => {
    const activeEditor = editorInstanceRef.current;
    const rows = parseInt(tableRows, 10);
    const cols = parseInt(tableCols, 10);
    if (!activeEditor || Number.isNaN(rows) || Number.isNaN(cols) || rows < 1 || rows > 20 || cols < 1 || cols > 10) {
      setToast({ message: "表格行数需为 1-20，列数需为 1-10", type: "error" });
      return;
    }
    try {
      restoreEditorSelection(activeEditor);
      if (!activeEditor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()) throw new Error("表格插入失败");
      setShowTableModal(false);
      setToast({ message: "表格已插入", type: "success" });
      window.setTimeout(() => updateTableToolbar(activeEditor), 0);
    } catch (error) {
      console.error("Failed to insert table:", error);
      setToast({ message: "表格插入失败，请重新选择插入位置", type: "error" });
    }
  };

  const copyAnchorLink = async () => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    restoreEditorSelection(activeEditor);
    const blockType = activeEditor.state.selection.$from.parent.type.name;
    if (!["paragraph", "heading", "blockquote", "codeBlock"].includes(blockType)) {
      setToast({ message: "请将光标放在正文、标题、引用或代码块中", type: "info" });
      return;
    }
    const existingId = activeEditor.getAttributes(blockType).id as string | undefined;
    const anchorId = existingId || `anchor-${nodeId}-${crypto.randomUUID()}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!existingId && !activeEditor.chain().focus().updateAttributes(blockType, { id: anchorId }).run()) {
      setToast({ message: "锚点创建失败", type: "error" });
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("doc", docName);
      url.searchParams.set("node", nodeId);
      url.hash = anchorId;
      await navigator.clipboard.writeText(url.toString());
      setToast({ message: "锚点链接已复制到剪贴板", type: "success" });
    } catch (error) {
      console.error("Failed to copy anchor:", error);
      setToast({ message: "无法访问剪贴板，请检查浏览器权限", type: "error" });
    }
  };

  const getCaretMenuPosition = () => {
    const rect = editor?.view.coordsAtPos(editor.state.selection.from);
    const menuWidth = 190;
    const menuHeight = 320;
    const rawLeft = rect?.left ?? 320;
    const rawTop = (rect?.bottom ?? 140) + 6;
    return {
      left: Math.max(12, Math.min(rawLeft, window.innerWidth - menuWidth - 12)),
      top: Math.max(12, Math.min(rawTop, window.innerHeight - menuHeight - 12)),
    };
  };

  const runSlashAction = (action: () => void) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    const { from } = activeEditor.state.selection;
    const textBefore = activeEditor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (textBefore === "/") {
      activeEditor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
      savedSelectionRef.current = { from: from - 1, to: from - 1 };
    } else {
      saveEditorSelection();
    }
    setSlashMenu(null);
    action();
  };

  const runSlashFileAction = (action: () => void) => {
    saveEditorSelection();
    markSlashCleanup();
    setSlashMenu(null);
    action();
    window.setTimeout(() => cleanupPendingSlash(), 0);
  };

  const slashItems = [
    { label: "一级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H1</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 1 }).run()) },
    { label: "二级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H2</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 2 }).run()) },
    { label: "三级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H3</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 3 }).run()) },
    { label: "正文", icon: <span className="text-[11px] font-semibold text-[#131212]">T</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().setParagraph().run()) },
    { label: "有序列表", icon: <InlineIconSvg path={editorSvg.p31fc8400} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleOrderedList().run()) },
    { label: "无序列表", icon: <InlineIconSvg path={editorSvg.p1ddeb0c0} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBulletList().run()) },
    { label: "任务列表", icon: <InlineIconSvg path={editorSvg.p30909380} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleTaskList().run()) },
    { label: "引用块", icon: <InlineIconSvg path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBlockquote().run()) },
    { label: "代码块", icon: <InlineIconSvg path={editorSvg.p36d5aa00} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleCodeBlock().run()) },
    { label: "链接", icon: <InlineIconSvg path={editorSvg.pda5c3c0} />, action: () => openLinkDialog() },
    { label: "图片", icon: <InlineIconSvg path={editorSvg.p2a7b5cf0} isFill fill="#131212" />, action: openImagePicker, kind: "file" as const },
    { label: "视频", icon: <InlineIconSvg path={editorSvg.p1a4aa900} />, action: openVideoPicker, kind: "file" as const },
    { label: "附件", icon: <InlineIconSvg path={editorSvg.p149b2100} />, action: openAttachmentPicker, kind: "file" as const },
    { label: "表格", icon: <InlineIconSvg path={editorSvg.p808b680} />, action: openTableDialog },
  ];
  slashItemsRef.current = slashItems;

  return (
    <div className="absolute left-0 right-0 top-[60px] bottom-0 flex flex-col">
      <style>{`
        .doc-tiptap-content p{margin:0 0 10px}.doc-tiptap-content h1{font-size:28px;line-height:1.45;margin:18px 0 12px;font-weight:700}.doc-tiptap-content h2{font-size:24px;line-height:1.45;margin:16px 0 10px;font-weight:700}.doc-tiptap-content h3{font-size:20px;line-height:1.5;margin:14px 0 8px;font-weight:650}.doc-tiptap-content h4,.doc-tiptap-content h5,.doc-tiptap-content h6{font-size:17px;line-height:1.55;margin:12px 0 8px;font-weight:650}
        .doc-tiptap-content .doc-blockquote{border-left:3px solid #134CFF;background:#f7f8fa;margin:12px 0;padding:10px 14px;color:#606266;border-radius:0 8px 8px 0}.doc-tiptap-content .doc-blockquote p:last-child{margin-bottom:0}
        .doc-tiptap-content .doc-list{margin:8px 0 10px;padding-left:28px}.doc-tiptap-content .doc-ordered-list{list-style:decimal}.doc-tiptap-content .doc-ordered-list .doc-ordered-list{list-style:lower-alpha}.doc-tiptap-content .doc-ordered-list .doc-ordered-list .doc-ordered-list{list-style:lower-roman}.doc-tiptap-content .doc-bullet-list{list-style:disc}.doc-tiptap-content .doc-bullet-list .doc-bullet-list{list-style:circle}.doc-tiptap-content .doc-bullet-list .doc-bullet-list .doc-bullet-list{list-style:square}.doc-tiptap-content li{margin:4px 0;padding-left:2px}.doc-tiptap-content li>p{margin:0}.doc-tiptap-content .doc-task-list{list-style:none;margin:8px 0 10px;padding-left:0}.doc-tiptap-content .doc-task-item{display:flex;gap:8px;align-items:flex-start}.doc-tiptap-content .doc-task-item>label{margin-top:2px}.doc-tiptap-content .doc-task-item>div{flex:1}
        .doc-tiptap-content .doc-code-block{background:#f5f6f8;border:1px solid #ebecf0;border-radius:8px;padding:12px 14px;margin:12px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.65;white-space:pre-wrap}
        .doc-tiptap-content .doc-link{color:#134CFF;text-decoration:underline}.doc-tiptap-content .doc-image{display:block;max-width:100%;height:auto;margin:0;border-radius:8px;cursor:pointer}.doc-tiptap-content [data-resize-container][data-node="image"]{display:inline-flex;width:fit-content;margin:12px 0;max-width:100%;outline:none;position:relative}.doc-tiptap-content [data-resize-container][data-node="image"].ProseMirror-selectednode{outline:2px solid #134CFF;outline-offset:2px;border-radius:8px}.doc-tiptap-content [data-resize-wrapper]{display:block;width:fit-content;max-width:100%;height:auto;line-height:0;position:relative}.doc-tiptap-content [data-resize-handle]{background:#fff;border:2px solid #134CFF;border-radius:50%;box-sizing:border-box;height:12px;opacity:0;pointer-events:none;position:absolute;width:12px;z-index:3}.doc-tiptap-content [data-resize-container].ProseMirror-selectednode [data-resize-handle],.doc-tiptap-content [data-resize-container][data-resize-state="true"] [data-resize-handle]{opacity:1;pointer-events:auto}.doc-tiptap-content [data-resize-handle="top-left"]{cursor:nwse-resize;left:0;top:0;transform:translate(-50%,-50%)}.doc-tiptap-content [data-resize-handle="top-right"]{cursor:nesw-resize;right:0;top:0;transform:translate(50%,-50%)}.doc-tiptap-content [data-resize-handle="bottom-left"]{bottom:0;cursor:nesw-resize;left:0;transform:translate(-50%,50%)}.doc-tiptap-content [data-resize-handle="bottom-right"]{bottom:0;cursor:nwse-resize;right:0;transform:translate(50%,50%)}.doc-tiptap-content .doc-video{display:block;max-width:100%;margin:12px 0;border-radius:8px;background:#000}.doc-tiptap-content .doc-attachment{align-items:center;background:#f7f8fa;border:1px solid #ebecf0;border-radius:8px;color:#303133;display:flex;font-size:13px;margin:12px 0;max-width:520px;min-height:42px;padding:10px 12px;text-decoration:none}.doc-tiptap-content .doc-attachment:hover{border-color:#cfd4df;background:#f2f4f7}
        .doc-tiptap-content .tableWrapper{display:block;margin:14px 0;max-width:100%;overflow-x:auto;overflow-y:hidden;padding:2px 0 8px}.doc-tiptap-content .tableWrapper table,.doc-tiptap-content table.doc-table,.doc-tiptap-content table{border:1px solid #EEF0F5;border-collapse:collapse;border-spacing:0;display:table;margin:0;max-width:none;overflow:visible;table-layout:fixed;width:100%}.doc-tiptap-content table td,.doc-tiptap-content table th,.doc-tiptap-content .doc-table td,.doc-tiptap-content .doc-table th{border:1px solid #EEF0F5;box-sizing:border-box;min-width:96px;padding:7px 9px;position:relative;vertical-align:top}.doc-tiptap-content table th,.doc-tiptap-content .doc-table th{background:#f7f8fa;color:#131212;font-weight:600;text-align:left}.doc-tiptap-content table tr:nth-child(odd) td,.doc-tiptap-content .doc-table tr:nth-child(odd) td{background:rgba(238,240,245,0.502)}.doc-tiptap-content table td>*,.doc-tiptap-content table th>*,.doc-tiptap-content .doc-table td>*,.doc-tiptap-content .doc-table th>*{margin-bottom:0!important}.doc-tiptap-content table td p,.doc-tiptap-content table th p{line-height:1.6;margin:0;min-height:20px}.doc-tiptap-content table td p:empty::before,.doc-tiptap-content table th p:empty::before{content:"\\00a0";display:inline-block}.doc-tiptap-content table .selectedCell:after,.doc-tiptap-content .doc-table .selectedCell:after{background:rgba(19,76,255,0.12);content:"";inset:0;pointer-events:none;position:absolute;z-index:2}.doc-tiptap-content table td:focus-within,.doc-tiptap-content table th:focus-within,.doc-tiptap-content .doc-table td:focus-within,.doc-tiptap-content .doc-table th:focus-within{box-shadow:inset 0 0 0 2px rgba(0,94,255,0.18);background:#FAFCFF!important}.doc-tiptap-content .column-resize-handle{background:#134CFF;bottom:-2px;pointer-events:none;position:absolute;right:-3px;top:0;width:3px}.resize-cursor{cursor:col-resize}.table-row-resize-cursor,.table-row-resize-cursor *{cursor:row-resize!important}.doc-table-row-resize-handle{background:transparent;border-radius:0;cursor:row-resize;height:12px;position:fixed;touch-action:none;z-index:280}.doc-table-row-resize-handle::after{background:transparent;border-radius:999px;content:"";height:2px;left:0;position:absolute;right:0;top:5px;transition:background-color .12s ease}.doc-table-row-resize-handle:hover::after{background:rgba(19,76,255,0.18)}.doc-table-row-resize-handle.is-resizing::after{background:rgba(19,76,255,0.42)}
        .doc-tiptap-content .is-empty::before{color:#b8bbc4;content:attr(data-placeholder);float:left;height:0;pointer-events:none}.doc-tiptap-content:focus{outline:none}
        .doc-tiptap-content p[style*="text-align"],.doc-tiptap-content h1[style*="text-align"],.doc-tiptap-content h2[style*="text-align"],.doc-tiptap-content h3[style*="text-align"],.doc-tiptap-content h4[style*="text-align"],.doc-tiptap-content h5[style*="text-align"],.doc-tiptap-content h6[style*="text-align"]{display:block}
        .doc-editor-toolbar{position:relative;z-index:260;isolation:isolate;pointer-events:auto}
        .doc-editor-toolbar button,.doc-editor-toolbar [role="button"]{pointer-events:auto}
      `}</style>
      <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input ref={attachInputRef} type="file" className="hidden" onChange={(e) => {
        void insertAttachmentFromFile(e.target.files?.[0]);
        e.target.value = "";
      }} />
      <div ref={toolbarRef} className="doc-editor-toolbar relative z-[260] isolate flex items-center gap-[24px] px-[24px] py-[6px] border-b border-[#EBECF0] bg-white flex-shrink-0 overflow-x-auto overscroll-x-contain">
        <button type="button" className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("heading", { x: r.left, y: r.bottom + 4 });
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[56px] truncate">{getCurrentHeading()}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
        </button>
        <button type="button" className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("font", { x: r.left, y: r.bottom + 4 });
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[56px] truncate">{getCurrentFont()}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
        </button>
        <button type="button" className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("size", { x: r.left, y: r.bottom + 4 });
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[46px] truncate">{getCurrentSize()}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
        </button>
        <Btn label="加粗" cmd="bold" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBold().run())}><IconSvg path={editorSvg.p3290fd80} /></Btn>
        <Btn label="斜体" cmd="italic" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleItalic().run())}><IconSvg path={editorSvg.p3837edc0} /></Btn>
        <Btn label="删除线" cmd="strikeThrough" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleStrike().run())}><IconSvg path={editorSvg.p2ae8080} /></Btn>
        <Btn label="下划线" cmd="underline" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleUnderline().run())}><IconSvg path={editorSvg.pc604cd0} /></Btn>
        <Btn label="字体颜色" action={(e) => {
          saveEditorSelection();
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("fore", { x: r.left, y: r.bottom + 4 });
        }}><IconSvg path={[editorSvg.peaacc00, "M4 17H16"]} stroke="#131212" /></Btn>
        <Btn label="背景颜色" action={(e) => {
          saveEditorSelection();
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("back", { x: r.left, y: r.bottom + 4 });
        }}>
          <div className="absolute left-[4px] size-[20px] top-[4px]"><svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 20 20"><rect fill="#FEF0F0" height="20" rx="4" width="20"/><path d={editorSvg.p16c26880} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" /></svg></div>
        </Btn>
        <Btn label="任务列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleTaskList().run())}><IconSvg path={editorSvg.p30909380} /></Btn>
        <Btn label="有序列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleOrderedList().run())}><IconSvg path={editorSvg.p31fc8400} /></Btn>
        <Btn label="无序列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBulletList().run())}><IconSvg path={editorSvg.p1ddeb0c0} /></Btn>
        <Btn label="减少缩进" action={() => applyIndent(-1)}><IconSvg path={editorSvg.p3244ee00} /></Btn>
        <Btn label="增加缩进" action={() => applyIndent(1)}><IconSvg path={editorSvg.p25bdc300} /></Btn>
        <button type="button" className={`relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0 ${showAlignDropdown || editor?.isActive({ textAlign: "center" }) || editor?.isActive({ textAlign: "right" }) || editor?.isActive({ textAlign: "justify" }) ? "opacity-100" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            saveEditorSelection();
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("align", { x: r.left, y: r.bottom + 4 });
          }}>
          <div className={`size-[28px] rounded-[6px] flex items-center justify-center hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors ${showAlignDropdown || editor?.isActive({ textAlign: "center" }) || editor?.isActive({ textAlign: "right" }) || editor?.isActive({ textAlign: "justify" }) ? "bg-[#f5f6f8]" : ""}`}><IconSvg path={editorSvg.p2c9c5c80} /></div>
        </button>
        <Btn label="引用块" cmd="blockquote" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBlockquote().run())}><IconSvg path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill /></Btn>
        <Btn label="代码块" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleCodeBlock().run())}><IconSvg path={editorSvg.p36d5aa00} /></Btn>
        <div className={`rounded-[6px] transition-colors ${showLinkModal || activeFormats.has("link") ? "bg-[#fff5f5] ring-1 ring-[#ff4d4f]" : ""}`}>
          <Btn label="插入链接" action={openLinkModal} getBtnRef={(el) => { linkBtnRef.current = el; }}><IconSvg path={editorSvg.pda5c3c0} stroke={showLinkModal || activeFormats.has("link") ? "#ff4d4f" : "#131212"} /></Btn>
        </div>
        <Btn label="清除链接" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().unsetLink().run())}><IconSvg path={editorSvg.p3418c200} /></Btn>
        <Btn label="插入图片" action={openImagePicker}><IconSvg path={editorSvg.p2a7b5cf0} isFill fill="#131212" /></Btn>
        <Btn label="插入视频" action={openVideoPicker}><IconSvg path={editorSvg.p1a4aa900} /></Btn>
        <Btn label="清除格式" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().unsetAllMarks().clearNodes().run())}><IconSvg path={editorSvg.p3e282b00} stroke="#131212" /></Btn>
        <Btn label="附件" action={openAttachmentPicker}><IconSvg path={editorSvg.p149b2100} /></Btn>
        <Btn label="表格" action={openTableDialog}><IconSvg path={editorSvg.p808b680} /></Btn>
        <Btn label="复制锚点链接" action={() => { void copyAnchorLink(); }}><IconSvg path={editorSvg.pda5c3c0} /></Btn>
      </div>
      {showColorPicker && (
        <ColorPicker
          mode={showColorPicker}
          currentColor={
            showColorPicker === "fore"
              ? normalizeHexColor(editor?.getAttributes("textStyle")?.color, "#000000")
              : normalizeHexColor(editor?.getAttributes("textStyle")?.backgroundColor, "#fef0f0")
          }
          onSelect={(color) => {
            runEditorCommand((activeEditor) => (
              showColorPicker === "fore"
                ? activeEditor.chain().focus().setColor(color).run()
                : activeEditor.chain().focus().setBackgroundColor(color).run()
            ));
          }}
          onClose={() => setShowColorPicker(null)}
          position={colorPickerPos}
        />
      )}
      {showHeadingDropdown && (
        <Dropdown items={HEADING_OPTIONS} position={headingDropPos} onSelect={(v) => {
          const idx = HEADING_OPTIONS.indexOf(v);
          runEditorCommand((activeEditor) => idx === 0
            ? activeEditor.chain().focus().setParagraph().run()
            : activeEditor.chain().focus().toggleHeading({ level: idx as 1 | 2 | 3 | 4 | 5 }).run());
        }} onClose={() => setShowHeadingDropdown(false)} />
      )}
      {showFontDropdown && (
        <Dropdown items={FONT_FAMILIES} position={fontDropPos} onSelect={(v) => runEditorCommand((activeEditor) => v === "系统默认" ? activeEditor.chain().focus().unsetFontFamily().run() : activeEditor.chain().focus().setFontFamily(v).run())} onClose={() => setShowFontDropdown(false)} />
      )}
      {showSizeDropdown && (
        <Dropdown items={FONT_SIZES} position={sizeDropPos} onSelect={(v) => runEditorCommand((activeEditor) => activeEditor.chain().focus().setFontSize(v).run())} onClose={() => setShowSizeDropdown(false)} />
      )}
      {showAlignDropdown && (
        <Dropdown
          items={["左对齐", "居中对齐", "右对齐", "两端对齐"]}
          position={alignDropPos}
          onSelect={(v) => applyTextAlign(v === "左对齐" ? "left" : v === "居中对齐" ? "center" : v === "右对齐" ? "right" : "justify")}
          onClose={() => setShowAlignDropdown(false)}
        />
      )}
      {showLinkModal && <LinkModal position={linkModalPos} initialText={linkModalText} initialUrl={linkModalUrl} mode={linkModalMode} triggerRef={linkBtnRef} onClose={() => setShowLinkModal(false)} onConfirm={applyLink} />}
      {showTableModal && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center" onClick={() => setShowTableModal(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white rounded-[16px] w-[360px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] p-[24px] flex flex-col gap-[20px]" onClick={(e) => e.stopPropagation()}>
            <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px]">插入表格</p>
            <div className="flex gap-[16px]">
              <label className="flex-1 flex flex-col gap-[6px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">行数<input type="number" min="1" max="20" value={tableRows} onChange={(e) => setTableRows(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") insertTable(); if (e.key === "Escape") setShowTableModal(false); }} className="h-[36px] rounded-[8px] border border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF]" /></label>
              <label className="flex-1 flex flex-col gap-[6px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">列数<input type="number" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") insertTable(); if (e.key === "Escape") setShowTableModal(false); }} className="h-[36px] rounded-[8px] border border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF]" /></label>
            </div>
            <div className="flex justify-end gap-[12px]"><button className="h-[36px] px-[20px] rounded-[8px] border border-[#e5e7eb] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0]" onClick={() => setShowTableModal(false)}>取消</button><button className="h-[36px] px-[20px] rounded-[8px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80" onClick={insertTable}>插入表格</button></div>
          </div>
        </div>,
        document.body,
      )}
      {showTableToolbar && createPortal(
        <div className="fixed z-[280] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] p-[4px] flex items-center gap-[4px]"
          style={{ left: tableToolbarPos.left, top: tableToolbarPos.top }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="flex items-center gap-[4px] px-[8px] py-[4px] text-[12px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]">表格</div>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addRowBefore"); }}>上方行</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addRowAfter"); }}>下方行</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteRow"); }}>删行</button>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addColumnBefore"); }}>左列</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addColumnAfter"); }}>右列</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteColumn"); }}>删列</button>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#ff4d4f] cursor-pointer hover:bg-[#fff5f5] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteTable"); }}>删表格</button>
        </div>,
        document.body,
      )}
      {showTableToolbar && createPortal(
        <>
          {tableRowHandles.map((handle) => (
            <div
              key={handle.index}
              className={`doc-table-row-resize-handle ${activeRowResizeIndex === handle.index ? "is-resizing" : ""}`}
              style={{ left: handle.left, top: handle.top, width: handle.width }}
              onPointerDown={(event) => startTableRowResize(event, handle)}
              title="拖拽调整行高"
              aria-label="拖拽调整行高"
            />
          ))}
        </>,
        document.body,
      )}
      {selectedImgRect && editorVisibleRect && (() => {
        const r = selectedImgRect;
        const editorR = editorVisibleRect;
        const barLeft = r.left + r.width / 2;
        const barTop = r.bottom + 8;
        if (barTop < editorR.top || barTop + 48 > editorR.bottom) return null;
        if (r.bottom < editorR.top || r.top > editorR.bottom) return null;
        const pctBtns = ["25", "50", "70", "100"] as const;
        const applyCustomPct = () => {
          const v = parseInt(imageCustomPct, 10);
          if (v && v >= 5 && v <= 100) applySelectedImageWidth(v);
          setImageCustomPct("");
        };
        return createPortal(
          <div
            className="img-resize-bar fixed z-[280] bg-white border border-[#ebecf0] rounded-[12px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] px-[10px] py-[6px] flex items-center gap-[6px]"
            style={{ left: barLeft, top: Math.max(barTop, (toolbarRef.current?.getBoundingClientRect().bottom ?? 0) + 8), transform: "translateX(-50%)" }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <span className="px-[4px] text-[13px] text-[#8d8e99] whitespace-nowrap select-none" style={{ fontFamily: "PingFang SC, sans-serif" }}>宽度</span>
            {pctBtns.map((pct) => (
              <button
                key={pct}
                type="button"
                className="h-[32px] min-w-[40px] px-[8px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap bg-white"
                style={{ fontFamily: "PingFang SC, sans-serif" }}
                onClick={(e) => { e.stopPropagation(); applySelectedImageWidth(Number(pct)); }}
              >{pct}%</button>
            ))}
            <button
              type="button"
              className="h-[32px] min-w-[32px] px-[8px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] whitespace-nowrap bg-white"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              title="恢复原图大小"
              onClick={(e) => { e.stopPropagation(); applySelectedImageWidth("auto"); }}
            >原</button>
            <button
              type="button"
              className={`size-[32px] rounded-[6px] border border-[#ebecf0] flex items-center justify-center cursor-pointer transition-colors bg-white ${imageRatioLocked ? "bg-[#f0f3ff] border-[#c9d5ff]" : "hover:bg-[#f5f6f8]"}`}
              title={imageRatioLocked ? "锁定缩放比例（已开）" : "锁定缩放比例（已关）"}
              onClick={(e) => { e.stopPropagation(); setImageRatioLocked((v) => !v); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3334 6.52874V2.66667H9.47109M13.3334 2.66667L8.82737 7.17242M2.66675 9.47127V13.3333H6.52907M2.66675 13.3333L7.17279 8.82759" stroke={imageRatioLocked ? "#134CFF" : "#131212"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="w-[1px] h-[20px] bg-[#ebecf0] mx-[2px]" />
            <div className="flex items-center gap-[4px]">
              <input
                className="w-[40px] h-[32px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] text-center outline-none focus:border-[#134CFF] bg-white"
                style={{ fontFamily: "PingFang SC, sans-serif" }}
                placeholder="%"
                value={imageCustomPct}
                onChange={(e) => setImageCustomPct(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCustomPct();
                  }
                }}
                onBlur={() => { if (imageCustomPct) applyCustomPct(); }}
                onMouseDown={(e) => e.stopPropagation()}
                title="自定义缩放比例"
              />
              <span className="text-[13px] text-[#8d8e99] select-none" style={{ fontFamily: "PingFang SC, sans-serif" }}>%</span>
            </div>
            <div className="w-[1px] h-[20px] bg-[#ebecf0] mx-[2px]" />
            <div
              className={`size-[32px] rounded-[6px] border border-[#ebecf0] flex items-center justify-center cursor-ew-resize bg-white hover:bg-[#f5f6f8] ${imgBarSlider ? "bg-[#f5f6f8]" : ""}`}
              title="等比缩放（拖拽调整宽度）"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const activeEditor = editorInstanceRef.current;
                const pos = selectedImagePosRef.current;
                if (!activeEditor || pos == null) return;
                const node = activeEditor.state.doc.nodeAt(pos);
                if (!node || node.type.name !== "image") return;
                const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
                const img = (dom?.tagName === "IMG" ? dom : dom?.querySelector("img")) as HTMLImageElement | null;
                if (!img) return;
                setImgBarSlider(true);
                const startX = e.clientX;
                const startW = img.offsetWidth || Number(node.attrs.width) || 100;
                const parentW = activeEditor.view.dom.clientWidth || 1;
                const naturalW = img.naturalWidth || startW;
                const naturalH = img.naturalHeight || startW;
                const onMove = (ev: MouseEvent) => {
                  const dx = ev.clientX - startX;
                  const nextW = Math.max(48, Math.min(parentW, Math.round(startW + dx)));
                  const locked = imageRatioLockedRef.current;
                  const sized = fitImageSize(nextW, nextW * (naturalH / Math.max(1, naturalW)), naturalW, naturalH, locked);
                  img.style.width = `${sized.width}px`;
                  img.style.height = locked ? "auto" : `${sized.height}px`;
                  img.style.maxWidth = "none";
                  syncContainerToImage(dom);
                  setSelectedImgRect(img.getBoundingClientRect());
                };
                const onUp = () => {
                  setImgBarSlider(false);
                  document.removeEventListener("mousemove", onMove);
                  document.removeEventListener("mouseup", onUp);
                  const finalW = Math.max(48, Math.round(img.offsetWidth));
                  const locked = imageRatioLockedRef.current;
                  const sized = fitImageSize(finalW, img.offsetHeight, naturalW, naturalH, locked);
                  syncContainerToImage(dom);
                  activeEditor.chain().setNodeSelection(pos).updateAttributes("image", {
                    width: sized.width,
                    height: locked ? null : sized.height,
                  }).run();
                  window.requestAnimationFrame(() => {
                    syncContainerToImage(activeEditor.view.nodeDOM(pos) as HTMLElement | null);
                    updateImageToolbar(activeEditor);
                  });
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.57541 1.60001C2.48447 1.60001 1.6001 2.48438 1.6001 3.57531M9.42232 1.60001H6.57787M14.4001 3.57532C14.4001 2.48438 13.5157 1.60001 12.4248 1.60001M1.6001 6.57778V9.42223M14.4001 9.42223V6.57778M1.6001 12.4247C1.6001 13.5156 2.48447 14.4 3.57541 14.4M12.4248 14.4C13.5157 14.4 14.4001 13.5156 14.4001 12.4247M6.57787 14.4H9.42232M1.6001 8.00001H6.57787C7.36335 8.00001 8.0001 8.63676 8.0001 9.42223V14.4H3.73343C2.55522 14.4 1.6001 13.4449 1.6001 12.2667V8.00001Z" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>,
          document.body,
        );
      })()}
      {slashMenu && createPortal(
        <div ref={slashMenuElRef} role="menu" className="fixed z-[280] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] py-[4px] min-w-[180px] overflow-y-auto overscroll-contain" style={{ left: slashMenu.left, top: slashMenu.top, maxHeight: slashMenu.maxHeight ?? "min(70vh, 480px)" }} onMouseDown={(e) => e.stopPropagation()}>
          {slashItems.map((item, idx) => <button key={item.label} type="button" role="menuitem" data-slash-idx={idx} aria-selected={idx === slashActive} className={`w-full flex items-center gap-[8px] px-[12px] py-[7px] cursor-pointer transition-colors text-left ${idx === slashActive ? "bg-[#f5f6f8]" : "hover:bg-[#f5f6f8]"}`} onMouseEnter={() => setSlashActive(idx)} onMouseDown={(e) => { e.stopPropagation(); if (item.kind !== "file") e.preventDefault(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (item.kind === "file") runSlashFileAction(item.action); else runSlashAction(item.action); }}><div className="size-[20px] flex items-center justify-center rounded-[4px] bg-[#ebecf0] text-[11px] font-bold text-[#131212]">{item.icon}</div><span className="text-[14px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]">{item.label}</span></button>)}
        </div>,
        document.body,
      )}
      <div className="flex-1 min-h-0 bg-white flex justify-center overflow-hidden" onKeyDown={(e) => {
        if (!editor) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); setSavedAt(formatSavedAt()); setSaveStatus("saved"); setToast({ message: "已保存", type: "success" }); }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); const pos = getCaretMenuPosition(); setLinkModalPos({ x: pos.left - 150, y: pos.top + 8 }); setLinkModalMode("insert"); setLinkModalText(""); setLinkModalUrl(""); setShowLinkModal(true); }
        if (slashMenu && e.key === "Escape") { e.preventDefault(); setSlashMenu(null); }
        if (slashMenu && e.key === "ArrowDown") {
          e.preventDefault();
          setSlashActive((idx) => {
            const next = (idx + 1 + slashItems.length) % slashItems.length;
            requestAnimationFrame(() => {
              const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${next}"]`);
              el?.scrollIntoView({ block: "nearest" });
            });
            return next;
          });
        }
        if (slashMenu && e.key === "ArrowUp") {
          e.preventDefault();
          setSlashActive((idx) => {
            const next = (idx - 1 + slashItems.length) % slashItems.length;
            requestAnimationFrame(() => {
              const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${next}"]`);
              el?.scrollIntoView({ block: "nearest" });
            });
            return next;
          });
        }
        if (slashMenu && e.key === "Enter") {
          e.preventDefault();
          const item = slashItems[slashActive] ?? slashItems[0];
          if (item.kind === "file") runSlashFileAction(item.action);
          else runSlashAction(item.action);
        }
      }}>
        <div className="flex h-full min-h-0 w-full max-w-[1248px] px-[24px] gap-[60px] overflow-hidden">
          <div className="min-w-0 min-h-0 flex-1 h-full overflow-hidden"><EditorContent editor={editor} className="h-full min-h-0" /></div>
          <div className="w-[180px] shrink-0 min-h-0 py-[24px] overflow-hidden hidden xl:flex xl:flex-col">
            <p className="font-['PingFang_SC:Medium',sans-serif] text-[#8d8e99] text-[13px] mb-[10px]">大纲</p>
            <div ref={tocListRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-[4px]">
              {tocHeadings.length === 0 ? <p className="text-[#b8bbc4] text-[13px]">暂无标题</p> : tocHeadings.map((h) => <button key={`${h.id}-${h.text}`} ref={(element) => {
                if (element) tocButtonRefs.current.set(h.id, element);
                else tocButtonRefs.current.delete(h.id);
              }} type="button" className={`block w-full text-left text-[13px] rounded-[4px] px-[8px] py-[4px] truncate ${tocActiveId === h.id ? "text-[#134CFF] bg-[#f5f8ff]" : "text-[#8d8e99] hover:bg-[#f5f6f8]"}`} style={{ paddingLeft: `${(Number(h.tag.slice(1)) - 1) * 10 + 8}px` }} onClick={() => { scrollToHeading(h.id); }}>{h.text}</button>)}
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between px-[24px] py-[10px] border-t border-[#EBECF0] bg-white flex-shrink-0">
        <div className="flex items-center gap-[8px]"><div className="relative shrink-0 size-[8px]"><svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 8 8"><circle cx="4" cy="4" fill={saveStatus === "saving" ? "#F59E0B" : saveStatus === "saved" ? "#15803D" : "#8D8E99"} r="4" /></svg></div><p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px] whitespace-nowrap">{saveStatus === "saving" ? "保存中..." : savedAt ? `已保存，更新于${savedAt}` : "未保存"}</p></div>
        <div className="flex items-center gap-[25px]"><div className="flex items-center gap-[8px]"><div className="relative shrink-0 size-[14px]"><svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 14 14"><path d={editorSvg.p2ce2bc00} stroke="#8D8E99" strokeLinecap="round" strokeWidth="1.2" /></svg></div><p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">大纲</p></div><p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">{charCount}字符 {wordCount}字</p></div>
      </div>
    </div>
  );
}

function Frame1({ docName, mode, selectedNode, nodeDepth, nodeContent, onTitleChange, onContentChange, fontSize, lineHeight, theme, sidebarWidth }: {
  docName: string; mode: "document" | "outline"; selectedNode: OutlineNode | null; nodeDepth: number;
  nodeContent?: string; onTitleChange?: (name: string) => void; onContentChange?: (html: string, text: string) => void;
  fontSize?: string; lineHeight?: string; theme?: string; sidebarWidth?: number;
}) {
  const isOutlineEmpty = mode === "outline" && !selectedNode;
  const titleName = mode === "outline" && selectedNode ? selectedNode.name : (docName || "文档助手");
  const [titleDraft, setTitleDraft] = useState(titleName);
  useEffect(() => { setTitleDraft(titleName); }, [titleName]);
  const commitTitle = (value = titleDraft) => {
    const next = value.trim();
    if (next && next !== titleName) onTitleChange?.(next);
    else setTitleDraft(titleName);
  };
  const titleOnlyReason = "当前文档未编辑内容";

  return (
    <div className="absolute bg-white overflow-hidden rounded-[12px] z-[1]" style={{ left: (sidebarWidth ?? 276) + 32, right: 8, top: 66, bottom: 8 }}>
      <p
        contentEditable
        suppressContentEditableWarning
        className="[word-break:break-word] absolute font-['PingFang_SC:Medium',sans-serif] leading-[28px] left-[24px] not-italic text-[#131212] text-[20px] top-[16px] whitespace-nowrap cursor-text outline-none px-[2px]"
        onFocus={(e) => {
          setTitleDraft(titleName);
          const range = document.createRange();
          range.selectNodeContents(e.currentTarget);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }}
        onInput={(e) => setTitleDraft(e.currentTarget.textContent || "")}
        onBlur={(e) => commitTitle(e.currentTarget.textContent || "")}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
          if (e.key === "Escape") { e.preventDefault(); e.currentTarget.textContent = titleName; setTitleDraft(titleName); (e.currentTarget as HTMLElement).blur(); }
        }}
      >{titleName}</p>
      <div className="absolute left-0 right-0 top-[60px] h-[0.6px] bg-[#EBECF0]" />
      {mode === "document" ? (
        <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-[16px]">
          <IllustrationSvg />
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#93959f] text-[14px]">{docName ? "该文档暂无内容，请在大纲模式下创建内容" : "暂无文档，请新建文档"}</p>
        </div>
      ) : isOutlineEmpty ? (
        <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-[16px]">
          <OutlineIllustration />
          <div className="text-center">
            <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px] leading-[1.8]">{titleOnlyReason}</p>
          </div>
        </div>
      ) : (
        <ErrorBoundary key={selectedNode?.id}><RichEditorTiptap docName={docName} nodeId={selectedNode?.id ?? ""} initialHtml={nodeContent} onContentChange={onContentChange} fontSize={fontSize} lineHeight={lineHeight} theme={theme} /></ErrorBoundary>
      )}
    </div>
  );
}

function Search() {
  return (
    <div className="absolute left-[28px] size-[16px] top-[86px]" data-name="search-01">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="search-01">
          <path d={svgPaths.p4ffd040} id="Icon" stroke="var(--stroke-0, #8F959E)" strokeLinecap="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Group1({ value, onChange, mode }: { value: string; onChange: (v: string) => void; mode: "document" | "outline" }) {
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = (v: string) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 200);
  };
  return (
    <div className="absolute left-[20px] top-[78px] w-[276px] h-[32px]">
      <div
        className="relative w-full h-full rounded-[8px] bg-white transition-all duration-150"
        style={{
          border: focused ? "0.6px solid #134CFF" : "0.6px solid #ececec",
          boxShadow: "none",
        }}
      >
        <svg className="absolute left-[8px] top-1/2 -translate-y-1/2 size-[16px] pointer-events-none" fill="none" viewBox="0 0 16 16">
          <path d={svgPaths.p4ffd040} stroke="#8F959E" strokeLinecap="round" strokeWidth="1.2" />
        </svg>
        <input
          type="text"
          placeholder={mode === "outline" ? "搜索大纲..." : "搜索文档..."}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 w-full h-full bg-transparent rounded-[8px] pl-[32px] pr-[8px] text-[14px] text-[#131212] outline-none"
          style={{ fontFamily: "PingFang SC, sans-serif", color: "#131212" }}
        />
      </div>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute inset-[10%_0]" data-name="Group">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 26 20.8">
        <g id="Group">
          <path clipRule="evenodd" d={svgPaths.p33b5fd00} fill="var(--fill-0, #A5A6AA)" fillRule="evenodd" id="Vector" />
          <path clipRule="evenodd" d={svgPaths.p7a2baf0} fill="var(--fill-0, #131212)" fillRule="evenodd" id="Vector_2" />
          <path d={svgPaths.p15af7c00} fill="var(--fill-0, white)" id="Vector_3" />
        </g>
      </svg>
    </div>
  );
}

function Icon() {
  return (
    <div className="overflow-clip relative shrink-0 size-[26px]" data-name="icon">
      <Group />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
      <Icon />
      <p className="[word-break:break-word] font-['Alimama_FangYuanTi_VF:SemiBold-Square',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[18px] text-black whitespace-nowrap" style={{ fontVariationSettings: '"BEVL" 1' }}>
        文档助手
      </p>
    </div>
  );
}

function Download() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="download-02">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="download-02">
          <path d={svgPaths.p3809f980} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="bg-black content-stretch flex flex-col h-[34px] items-start px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Download />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">导入</p>
      </div>
    </div>
  );
}

function Upload() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="upload-03">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="upload-03">
          <path d={svgPaths.p1de75680} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-black content-stretch flex flex-col h-[34px] items-start px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Upload />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">导出</p>
      </div>
    </div>
  );
}

function Share() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="share">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="share">
          <path d={svgPaths.p1623d680} id="Icon" stroke="var(--stroke-0, black)" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame12() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[34px] items-start px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Share />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">分享</p>
      </div>
    </div>
  );
}

function Trash() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="trash-03">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="trash-03">
          <path d={svgPaths.p1db5f00} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame14() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[34px] items-start px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Trash />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">删除</p>
      </div>
    </div>
  );
}

function FrameSave() {
  return (
    <div className="bg-black content-stretch flex flex-col h-[34px] items-start px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <div className="relative shrink-0 size-[16px]" data-name="save">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
            <path d={svgPaths.p3809f980} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">保存</p>
      </div>
    </div>
  );
}

function Frame11({ onOpenShare, onOpenExport, onDelete, onImport, onSave }: { onOpenShare: () => void; onOpenExport: () => void; onDelete: () => void; onImport: () => void; onSave: () => void }) {
  return (
    <div className="absolute content-stretch flex h-[66px] items-center justify-between left-0 right-0 pl-[20px] pr-[8px] py-[16px] top-0">
      <Frame5 />
      <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onSave}><FrameSave /></div>
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onImport}><Frame8 /></div>
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onOpenExport}><Frame7 /></div>
        <div
          className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]"
          onClick={onOpenShare}
        >
          <Frame12 />
        </div>
        <div className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]" onClick={onDelete}><Frame14 /></div>
      </div>
    </div>
  );
}

function SidebarShareStatus({ shared, onClick }: { shared: boolean; onClick: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 w-[316px]">
      <div className="h-[0.6px] mx-[20px] bg-[#EBECF0]" />
      <div className="flex items-center">
        <div
          className="flex items-center gap-[8px] px-[28px] py-[10px] cursor-pointer group flex-1"
          onClick={onClick}
        >
          <div className="relative shrink-0 size-[16px]">
            <svg className="block size-full" fill="none" viewBox="0 0 16 16">
              {shared ? (
                <path d={wifiOnSvg.pbf2d700} stroke="#15803D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              ) : (
                <path d={designSvg.p28f1ba00} stroke="#8D8E99" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              )}
            </svg>
          </div>
          <p className={`font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] transition-colors ${shared ? "text-[#15803d]" : "text-[#8d8e99] group-hover:text-[#131212]"}`}>
            {shared ? "分享中" : "未开启分享"}
          </p>
        </div>
      </div>
    </div>
  );
}

function FolderIcon({ color = "#131212" }: { color?: string }) {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="folder">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <path d={svgPaths.p2d6a180} id="Icon" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

function DocContextMenu({ position, onRename, onExport, onDelete }: {
  position: { x: number; y: number };
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const menuItems = [
    {
      label: "重命名",
      icon: <path d={menuSvg.pb1c0600} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onRename,
      danger: false,
    },
    {
      label: "导出HTML",
      icon: <path d={menuSvg.p3809f980} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onExport,
      danger: false,
    },
    {
      label: "删除",
      icon: <path d={menuSvg.p1db5f00} stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />,
      action: onDelete,
      danger: true,
    },
  ];
  return (
    <div className="doc-context-menu fixed z-50 w-[134px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]" style={{ left: position.x, top: position.y }}>
      {menuItems.map(({ label, icon, action, danger }) => (
        <div
          key={label}
          className={`flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer transition-colors ${danger ? "hover:bg-red-50 text-[#131212] hover:text-red-600" : "hover:bg-[#f5f6f8] text-[#131212]"}`}
          onClick={(e) => { e.stopPropagation(); action(); }}
        >
          <div className="relative shrink-0 size-[16px]">
            <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">{icon}</svg>
          </div>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] whitespace-nowrap" style={{ color: "inherit" }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function DocItem({ name, active, onClick, onRename, onDelete, onExport, onEnterOutline }: {
  name: string;
  active?: boolean;
  onClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onEnterOutline?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const highlighted = active || hovered || menuOpen;
  const color = highlighted ? "#131212" : "#93959F";

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.(".doc-context-menu")) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleExport = () => {
    setMenuOpen(false);
    onExport?.();
  };

  return (
    <div
      ref={ref}
      className={`h-[36px] relative rounded-[8px] shrink-0 w-full transition-colors cursor-pointer ${highlighted ? "bg-[#ebecf0]" : ""}`}
      onClick={() => { onClick?.(); onEnterOutline?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[8px] items-center p-[8px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative">
            <FolderIcon color={color} />
            <p className="[word-break:break-word] flex-[1_0_0] font-['PingFang_SC:Regular',sans-serif] leading-[normal] min-w-px not-italic overflow-hidden relative text-[14px] text-ellipsis whitespace-nowrap" style={{ color }}>
              {name}
            </p>
          </div>
          <div
            className={`relative shrink-0 size-[16px] transition-opacity rounded-[4px] hover:bg-[#d5d6da] ${hovered || menuOpen ? "opacity-100" : "opacity-0"}`}
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              setMenuPos({ x: r.right - 134, y: r.bottom + 4 });
              setMenuOpen((v) => !v);
            }}
          >
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
              <path d={svgPaths.pa91b600} fill="#131212" />
              <path d={svgPaths.p12e0c1f2} fill="#131212" />
              <path d={svgPaths.p20e27070} fill="#131212" />
            </svg>
          </div>
        </div>
      </div>
      {menuOpen && (
        <DocContextMenu
          position={menuPos}
          onRename={() => { setMenuOpen(false); onRename?.(); }}
          onExport={handleExport}
          onDelete={() => { setMenuOpen(false); onDelete?.(); }}
        />
      )}
    </div>
  );
}

function Frame16({ docs, selected, onSelect, onRename, onDelete, onExport, onEnterOutline }: {
  docs: string[];
  selected: string;
  onSelect: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
  onExport: (name: string) => void;
  onEnterOutline: () => void;
}) {
  return (
    <>
      <div className="absolute content-stretch flex flex-col gap-[4px] items-start left-[20px] top-[210px] w-[276px]"
        style={{ maxHeight: "calc(100% - 250px)", overflowY: "auto" }}>
        {docs.map((name) => (
          <DocItem
            key={name}
            name={name}
            active={selected === name}
            onClick={() => onSelect(name)}
            onRename={() => onRename(name)}
            onDelete={() => onDelete(name)}
            onExport={() => onExport(name)}
            onEnterOutline={onEnterOutline}
          />
        ))}
      </div>
    </>
  );
}

function removeNodeById(nodes: OutlineNode[], id: string): [OutlineNode[], OutlineNode | null] {
  let found: OutlineNode | null = null;
  const filter = (arr: OutlineNode[]): OutlineNode[] =>
    arr.reduce<OutlineNode[]>((acc, n) => {
      if (n.id === id) { found = n; return acc; }
      return [...acc, { ...n, children: filter(n.children) }];
    }, []);
  return [filter(nodes), found];
}

function insertNodeBefore(nodes: OutlineNode[], node: OutlineNode, targetId: string): OutlineNode[] {
  const insert = (arr: OutlineNode[]): [OutlineNode[], boolean] => {
    const idx = arr.findIndex(n => n.id === targetId);
    if (idx !== -1) { const next = [...arr]; next.splice(idx, 0, node); return [next, true]; }
    let found = false;
    const result = arr.map(n => {
      if (found) return n;
      const [children, f] = insert(n.children);
      if (f) { found = true; return { ...n, children }; }
      return n;
    });
    return [result, found];
  };
  return insert(nodes)[0];
}

function insertNodeAfter(nodes: OutlineNode[], node: OutlineNode, targetId: string): OutlineNode[] {
  const insert = (arr: OutlineNode[]): [OutlineNode[], boolean] => {
    const idx = arr.findIndex(n => n.id === targetId);
    if (idx !== -1) { const next = [...arr]; next.splice(idx + 1, 0, node); return [next, true]; }
    let found = false;
    const result = arr.map(n => {
      if (found) return n;
      const [children, f] = insert(n.children);
      if (f) { found = true; return { ...n, children }; }
      return n;
    });
    return [result, found];
  };
  return insert(nodes)[0];
}

type DragState = { sourceId: string; isRootSource: boolean; overId: string } | null;

type OutlineMenuHandlers = {
  menuState: { id: string; rect: { x: number; y: number } } | null;
  onMore: (id: string, rect: { x: number; y: number }) => void;
  onMenuClose: () => void;
  onAddChild: (id: string) => void;
  onRename: (id: string) => void;
  onTogglePreview: (id: string) => void;
  onExportHtml: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  getIncludeInPreview: (id: string) => boolean;
};

function OutlineTreeNode({ node, depth, selectedId, expandedIds, dragState, onSelect, onToggle, onDragStart, onDragOver, onDrop, onDragEnd, menuHandlers }: {
  node: OutlineNode; depth: number; selectedId: string; expandedIds: Set<string>; dragState: DragState;
  onSelect: (id: string) => void; onToggle: (id: string) => void;
  onDragStart: (id: string, isRoot: boolean) => void; onDragOver: (id: string) => void;
  onDrop: (targetId: string, targetIsRoot: boolean) => void; onDragEnd: () => void;
  menuHandlers: OutlineMenuHandlers;
}) {
  const [hovered, setHovered] = useState(false);
  const isSelected = node.id === selectedId;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isRoot = depth === 0;
  const isDragOver = dragState?.overId === node.id && dragState?.sourceId !== node.id;
  const color = isSelected ? "#131212" : "#8D8E99";
  const showControls = isSelected || hovered;
  const paddingLeft = 8 + depth * 16;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(node.id, isRoot); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(node.id); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(node.id, isRoot); }}
        onDragEnd={onDragEnd}
        className={`h-[36px] relative rounded-[8px] shrink-0 w-full flex items-center cursor-pointer transition-colors select-none
          ${isSelected ? "bg-[#ebecf0]" : hovered ? "bg-[#f5f6f8]" : ""}
          ${isDragOver ? "ring-[1.5px] ring-[#134CFF] ring-inset" : ""}`}
        style={{ paddingLeft, paddingRight: 8 }}
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 6-dot drag handle */}
        <div className={`relative shrink-0 size-[16px] mr-[4px] cursor-grab transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
          <svg className="block size-full" fill="none" viewBox="0 0 16 16">
            <path d={outlineSvg.p35237700} fill={color} />
            <path d={outlineSvg.p11f9c500} fill={color} />
            <path d={outlineSvg.p1bbe0b00} fill={color} />
            <path d={outlineSvg.p1cb9c000} fill={color} />
            <path d={outlineSvg.p26b22b00} fill={color} />
            <path d={outlineSvg.pf7f1a00} fill={color} />
          </svg>
        </div>
        {/* expand/collapse arrow with background */}
        <div
          className={`overflow-clip relative rounded-[4px] shrink-0 size-[20px] mr-[4px] flex items-center justify-center
            ${isSelected && hasChildren ? "bg-[#dadbdf]" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
        >
          {hasChildren && (
            <svg className="block size-[12px]" fill="none" viewBox="0 0 12 12">
              <path d={isExpanded ? outlineSvg.p32aa7080 : outlineSvg.p2c70bb70} fill={isSelected ? "#131212" : "#8D8E99"} />
            </svg>
          )}
        </div>
        {/* file icon */}
        <div className="relative shrink-0 size-[16px] mr-[8px]">
          <svg className="block size-full" fill="none" viewBox="0 0 16 16">
            <path d={outlineSvg.p2f15d400} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
        </div>
        {/* name */}
        <p className="flex-1 min-w-0 font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] truncate" style={{ color }}>
          {node.name}
        </p>
        {/* more button */}
        <div
          className={`relative shrink-0 size-[16px] ml-[4px] transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            menuHandlers.onMore(node.id, { x: r.right - 180, y: r.bottom + 4 });
          }}
        >
          <svg className="block size-full" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.pa91b600} fill={color} />
            <path d={svgPaths.p12e0c1f2} fill={color} />
            <path d={svgPaths.p20e27070} fill={color} />
          </svg>
        </div>
      </div>
      {menuHandlers.menuState?.id === node.id && menuHandlers.menuState?.rect && (
        <OutlineNodeMenu
          nodeId={node.id}
          includeInPreview={menuHandlers.getIncludeInPreview(node.id)}
          position={menuHandlers.menuState.rect}
          onClose={menuHandlers.onMenuClose}
          onAddChild={menuHandlers.onAddChild}
          onRename={menuHandlers.onRename}
          onTogglePreview={menuHandlers.onTogglePreview}
          onExportHtml={menuHandlers.onExportHtml}
          onClone={menuHandlers.onClone}
          onDelete={menuHandlers.onDelete}
        />
      )}
      {hasChildren && isExpanded && node.children.map((child) => (
        <OutlineTreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId}
          expandedIds={expandedIds} dragState={dragState} onSelect={onSelect} onToggle={onToggle}
          onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
          menuHandlers={menuHandlers} />
      ))}
    </>
  );
}

function OutlineNodeMenu({ nodeId, includeInPreview, position, onClose, onAddChild, onRename, onTogglePreview, onExportHtml, onClone, onDelete }: {
  nodeId: string; includeInPreview: boolean; position: { x: number; y: number }; onClose: () => void;
  onAddChild: (id: string) => void; onRename: (id: string) => void; onTogglePreview: (id: string) => void;
  onExportHtml: (id: string) => void; onClone: (id: string) => void; onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    {
      label: "添加子文档", highlighted: true,
      icon: <path d="M8 3.2L8 12.8M12.8 8L3.2 8" stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />,
      action: () => { onAddChild(nodeId); onClose(); },
    },
    {
      label: "重命名", highlighted: false,
      icon: <path d={outlineMenuSvg.pb1c0600} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onRename(nodeId); onClose(); },
    },
    {
      label: includeInPreview ? "预览时隐藏本层" : "预览时显示本层", highlighted: false,
      icon: <path d="M10.8334 10.8333H5.16671C3.6019 10.8333 2.33337 9.5648 2.33337 8C2.33337 6.43519 3.6019 5.16666 5.16671 5.16666H10.8334M10.8334 10.8333C12.3982 10.8333 13.6667 9.5648 13.6667 8C13.6667 6.43519 12.3982 5.16666 10.8334 5.16666M10.8334 10.8333C9.26857 10.8333 8.00004 9.5648 8.00004 8C8.00004 6.43519 9.26857 5.16666 10.8334 5.16666" stroke="#131212" strokeWidth="1.2" />,
      action: () => { onTogglePreview(nodeId); onClose(); },
    },
    {
      label: "导出HTML（含子文档）", highlighted: false,
      icon: <path d={outlineMenuSvg.p3809f980} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onExportHtml(nodeId); onClose(); },
    },
    {
      label: "克隆", highlighted: false,
      icon: <path d="M13.3334 8.74999L13.3334 4.99995C13.3334 3.34309 11.9902 1.99994 10.3333 1.99995L6.58337 2M9.33338 14L4.83338 14C4.00495 14 3.33338 13.3284 3.33338 12.5L3.33337 6C3.33337 5.17157 4.00495 4.5 4.83337 4.5L9.33337 4.5C10.1618 4.5 10.8334 5.17157 10.8334 6L10.8334 12.5C10.8334 13.3284 10.1618 14 9.33338 14Z" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />,
      action: () => { onClone(nodeId); onClose(); },
    },
    {
      label: "删除", highlighted: false, danger: true,
      icon: <path d={outlineMenuSvg.p1db5f00} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onDelete(nodeId); onClose(); },
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map(({ label, highlighted, danger, icon, action }) => (
        <div
          key={label}
          className={`flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer transition-colors
            ${danger ? "hover:bg-red-50" : "hover:bg-[#f5f6f8]"}`}
          onClick={action}
        >
          <div className="relative shrink-0 size-[16px]">
            <svg className="block size-full" fill="none" viewBox="0 0 16 16">{icon}</svg>
          </div>
          <p className={`font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] whitespace-nowrap ${danger ? "text-[#131212] hover:text-red-600" : "text-[#131212]"}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function OutlineTree({ nodes, selectedId, contentMap, onSelect, onUpdateNodes }: {
  nodes: OutlineNode[]; selectedId: string; contentMap?: DocContentMap;
  onSelect: (id: string) => void; onUpdateNodes: (nodes: OutlineNode[]) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root", "1.1", "1.1.1", "1.1.1.1"]));
  const [dragState, setDragState] = useState<DragState>(null);
  const [menuState, setMenuState] = useState<{ id: string; rect: { x: number; y: number } } | null>(null);
  const [renameState, setRenameState] = useState<{ id: string; currentName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const toggle = (id: string) => setExpandedIds((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const handleDragStart = (id: string, isRoot: boolean) => setDragState({ sourceId: id, isRootSource: isRoot, overId: id });
  const handleDragOver = (id: string) => { if (dragState) setDragState({ ...dragState, overId: id }); };
  const handleDrop = (targetId: string, targetIsRoot: boolean) => {
    if (!dragState || dragState.sourceId === targetId) { setDragState(null); return; }
    if (dragState.isRootSource && !targetIsRoot) { setDragState(null); return; }
    const [removed, removedNode] = removeNodeById(nodes, dragState.sourceId);
    if (!removedNode) { setDragState(null); return; }
    onUpdateNodes(insertNodeBefore(removed, removedNode, targetId));
    setDragState(null);
  };
  const handleDragEnd = () => setDragState(null);

  const doDelete = (id: string) => {
    const [updated] = removeNodeById(nodes, id);
    onUpdateNodes(updated);
    if (selectedId === id && updated.length > 0) onSelect(updated[0].id);
  };

  const handleDelete = (id: string) => {
    const node = findNode(nodes, id);
    if (!node) return;
    const isLeaf = node.children.length === 0;
    const childCount = countDescendants(node);
    const type = isLeaf ? "leaf" : "branch";
    setDeleteConfirm({
      message: buildDeleteMessage(type, node.name, childCount),
      onConfirm: () => doDelete(id),
    });
  };

  const handleAddChild = (parentId: string) => {
    const depth = findNodeDepth(nodes, parentId);
    if (depth >= 5) return;
    const newNode: OutlineNode = { id: `${parentId}-child-${Date.now()}`, name: "新建子文档", children: [], includeInPreview: true };
    const addChild = (arr: OutlineNode[]): OutlineNode[] =>
      arr.map(n => n.id === parentId ? { ...n, children: [...n.children, newNode] } : { ...n, children: addChild(n.children) });
    onUpdateNodes(addChild(nodes));
    setExpandedIds(prev => new Set([...prev, parentId]));
    onSelect(newNode.id);
  };

  const handleRename = (id: string, newName: string) => {
    const renameInTree = (arr: OutlineNode[]): OutlineNode[] =>
      arr.map(n => n.id === id ? { ...n, name: newName } : { ...n, children: renameInTree(n.children) });
    onUpdateNodes(renameInTree(nodes));
  };

  const handleTogglePreview = (id: string) => {
    const toggleInTree = (arr: OutlineNode[]): OutlineNode[] =>
      arr.map(n => n.id === id
        ? { ...n, includeInPreview: n.includeInPreview === false }
        : { ...n, children: toggleInTree(n.children) });
    onUpdateNodes(toggleInTree(nodes));
  };

  const handleExportHtml = (id: string) => {
    const node = findNode(nodes, id);
    if (!node) return;
    const fullHtml = buildPreviewHtml(node.name, buildPreviewSections([node], contentMap), [node], node.id, contentMap);
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${node.name}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const cloneNodeDeep = (node: OutlineNode): OutlineNode => {
    const newId = `${node.id}-clone-${Date.now()}`;
    return { ...node, id: newId, name: `${node.name} (副本)`, includeInPreview: node.includeInPreview !== false, children: node.children.map(cloneNodeDeep) };
  };

  const handleClone = (id: string) => {
    const node = findNode(nodes, id);
    if (!node) return;
    const cloned = cloneNodeDeep(node);
    onUpdateNodes(insertNodeAfter(nodes, cloned, id));
    setMenuState(null);
  };

  const menuHandlers: OutlineMenuHandlers = {
    menuState,
    onMore: (id, rect) => setMenuState({ id, rect }),
    onMenuClose: () => setMenuState(null),
    onAddChild: handleAddChild,
    onRename: (id) => {
      const n = findNode(nodes, id);
      setMenuState(null);
      if (n) setRenameState({ id, currentName: n.name });
    },
    onTogglePreview: handleTogglePreview,
    onExportHtml: handleExportHtml,
    onClone: handleClone,
    onDelete: handleDelete,
    getIncludeInPreview: (id) => findNode(nodes, id)?.includeInPreview !== false,
  };

  return (
    <>
      <div
        className="absolute content-stretch flex flex-col gap-[4px] items-start left-[20px] top-[210px] w-[276px]"
        style={{ maxHeight: "calc(100% - 250px)", overflowY: "auto" }}
      >
        {nodes.map((node) => (
          <OutlineTreeNode key={node.id} node={node} depth={0} selectedId={selectedId}
            expandedIds={expandedIds} dragState={dragState} onSelect={onSelect} onToggle={toggle}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
            menuHandlers={menuHandlers} />
        ))}
      </div>
      {renameState && (
        <NewDocModal
          title="重命名"
          initialValue={renameState.currentName}
          onClose={() => setRenameState(null)}
          onConfirm={(name) => { handleRename(renameState.id, name); setRenameState(null); }}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          message={deleteConfirm.message}
          onConfirm={deleteConfirm.onConfirm}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}

function Frame27({ onNewDoc, onNewFile, mode, onSwitchMode }: { onNewDoc: () => void; onNewFile: () => void; mode: "document" | "outline"; onSwitchMode: () => void }) {
  const isOutline = mode === "outline";
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[20px] top-[122px] w-[276px]">
      <div
        className="content-stretch flex gap-[8px] items-center px-[8px] py-[7px] relative shrink-0 cursor-pointer rounded-[6px] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
        onClick={onSwitchMode}
      >
        <div className="relative shrink-0 size-[20px]">
          {isOutline ? (
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
              <path d={outlineSvg.p56ad280} stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
              <path d={svgPaths.p9eb87c0} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            </svg>
          )}
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#131212] text-[16px] whitespace-nowrap">
          {isOutline ? "大纲" : "文档"}
        </p>
      </div>
      <div
        className="content-stretch flex gap-[8px] items-center p-[8px] relative shrink-0 cursor-pointer rounded-[6px] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
        onClick={isOutline ? onNewFile : onNewDoc}
      >
        <div className="relative shrink-0 size-[20px]">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
            <path d="M10 5L10 15M15 10L5 10" id="Icon" stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />
          </svg>
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#131212] text-[14px] whitespace-nowrap">
          {isOutline ? "新建文件" : "新建文档"}
        </p>
      </div>
    </div>
  );
}

function NewDocModal({ onClose, onConfirm, initialValue = "", title = "编辑名称" }: {
  onClose: () => void;
  onConfirm: (name: string) => void;
  initialValue?: string;
  title?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [inputFocused, setInputFocused] = useState(false);
  const canConfirm = value.trim().length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(value.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[12px] w-[600px] p-[24px] flex flex-col gap-[24px] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[18px] font-medium leading-[normal]">{title}</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#93959f] hover:text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-all cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 输入框 */}
        <div
          className="w-full h-[44px] rounded-[8px] flex items-center px-[16px] transition-all duration-150"
          style={{
            border: inputFocused ? "0.6px solid #134CFF" : "0.6px solid #ececec",
            background: "white",
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="输入名称"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[14px] text-[#131212] outline-none placeholder:text-[#c0c4cc]"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-[12px]">
          <button
            className="h-[36px] px-[20px] rounded-[6px] border-[0.6px] border-solid border-[#ececec] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
          >取消</button>
          <button
            className={`h-[36px] px-[20px] rounded-[6px] text-white text-[14px] transition-all duration-150 ${
              canConfirm
                ? "bg-[#131212] cursor-pointer hover:opacity-80 active:opacity-60"
                : "bg-[#c0c4cc] cursor-not-allowed"
            }`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >确定</button>
        </div>
      </div>
    </div>
  );
}

function LinkModal({ position, initialText, initialUrl, mode, triggerRef, onClose, onConfirm }: {
  position: { x: number; y: number };
  initialText?: string;
  initialUrl?: string;
  mode?: "insert" | "edit";
  triggerRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  onConfirm: (value: { text: string; url: string }) => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [focusedField, setFocusedField] = useState<"text" | "url" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const canConfirm = url.trim().length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || triggerRef?.current?.contains(target)) return;
      onClose();
    };
    const timer = window.setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose, triggerRef]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const trimmed = url.trim();
    const normalized = /^(https?:\/\/|mailto:|manual-doc:\/\/|#)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    onConfirm({ text, url: normalized });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  };

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[300] w-[360px] rounded-[10px] border border-[#EBECF0] bg-white p-[10px] shadow-[0px_12px_24px_-8px_rgba(36,36,36,0.18)]"
      style={{ left: Math.max(12, Math.min(position.x, window.innerWidth - 372)), top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-[8px] flex items-center justify-between px-[2px]">
        <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] leading-[20px]">{mode === "edit" ? "编辑链接" : "插入链接"}</p>
        <button
          className="size-[24px] flex items-center justify-center rounded-[6px] text-[#8D8E99] hover:bg-[#F5F6F8] hover:text-[#131212] active:bg-[#EBECF0] transition-colors cursor-pointer"
          onClick={onClose}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col gap-[8px]">
        <div
          className="h-[34px] rounded-[6px] flex items-center px-[10px] transition-all duration-150"
          style={{ border: focusedField === "text" ? "1px solid #ff4d4f" : "1px solid #EBECF0", background: focusedField === "text" ? "#fffafa" : "white" }}
        >
          <input
            type="text"
            placeholder="显示文本"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocusedField("text")}
            onBlur={() => setFocusedField(null)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[13px] text-[#131212] outline-none placeholder:text-[#C0C4CC]"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
          />
        </div>
        <div className="flex items-center gap-[8px]">
          <div
            className="h-[34px] flex-1 rounded-[6px] flex items-center gap-[6px] px-[10px] transition-all duration-150"
            style={{ border: focusedField === "url" ? "1px solid #ff4d4f" : "1px solid #EBECF0", background: focusedField === "url" ? "#fffafa" : "white" }}
          >
            <svg className="size-[14px] shrink-0" fill="none" viewBox="0 0 16 16">
              <path d="M6.5 8.8L9.5 5.8M5.7 5.2L5.1 5.8C3.9 7 3.9 8.9 5.1 10.1C6.3 11.3 8.2 11.3 9.4 10.1L10 9.5M10.3 10.8L10.9 10.2C12.1 9 12.1 7.1 10.9 5.9C9.7 4.7 7.8 4.7 6.6 5.9L6 6.5" stroke="#8D8E99" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            </svg>
            <input
              autoFocus
              type="url"
              placeholder="粘贴或输入链接"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocusedField("url")}
              onBlur={() => setFocusedField(null)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[13px] text-[#131212] outline-none placeholder:text-[#C0C4CC]"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
            />
          </div>
          <button
            className={`h-[34px] px-[14px] rounded-[6px] text-[13px] transition-all duration-150 ${
              canConfirm
                ? "bg-[#131212] text-white cursor-pointer hover:opacity-80 active:opacity-60"
                : "bg-[#EBECF0] text-[#8D8E99] cursor-not-allowed"
            }`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >{mode === "edit" ? "更新" : "保存"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ShareModal({ shared, mode, loading, errorMessage, onToggle, onClose, onDownload, shareUrl: propUrl }: {
  shared: boolean;
  mode: "electron" | "web";
  loading?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onClose: () => void;
  onDownload?: () => void;
  shareUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = propUrl || "http://localhost:6535";

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy share url:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-[24px] h-[56px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[normal]">分享文档</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 正文 */}
        <div className="px-[24px] pb-[24px] flex flex-col gap-[10px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">
            {mode === "electron" ? "分享给同一Wi-Fi / 局域网内的人" : "生成本机预览分享页"}
          </p>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[1.6]">
            {mode === "electron" ? "开启后，复制链接发给同事；对方用浏览器打开网址即可查看文档。" : "当前是网页预览环境，会生成一个只读 HTML 分享页，可复制本机临时链接或下载文件。"}
          </p>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[1.6]">
            {mode === "electron" ? "注意：您的电脑和文档助手需要保持开启，别人才能访问。" : "如果需要同 Wi-Fi 访问链接，请在 Electron 桌面应用中开启分享。"}
          </p>
          {errorMessage && <p className="font-['PingFang_SC:Regular',sans-serif] text-[#E53E3E] text-[13px] leading-[1.6]">{errorMessage}</p>}

          {/* 开关卡片 */}
          <div
            className="rounded-[12px] px-[16px] py-[14px] flex items-center justify-between mt-[4px] transition-all duration-300"
            style={{ background: shared ? "rgba(42,182,115,0.08)" : "white", border: "1px solid", borderColor: shared ? "rgba(42,182,115,0.25)" : "#ebecf0" }}
          >
            <div className="flex flex-col gap-[6px]">
              <p
                className="font-['PingFang_SC:Medium',sans-serif] text-[14px] font-medium leading-[normal] transition-colors duration-200"
                style={{ color: shared ? "#15803d" : "#c2c6cd" }}
              >
                {loading ? "处理中..." : shared ? "开启分享" : "未开启分享"}
              </p>
              <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[normal]">
                {shared ? (mode === "electron" ? "链接已生成，点击复制链接后发给同一Wi-Fi / 局域网内的人" : "分享页已生成，可复制链接或下载 HTML 文件") : "点击右侧开关，开启后会显示访问链接"}
              </p>
            </div>
            <button
              className="relative flex-shrink-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer active:scale-95"
              style={{ width: 44, height: 24, background: shared ? "#2AB673" : "#EBECF0", opacity: loading ? 0.6 : 1 }}
              onClick={onToggle}
              disabled={loading}
            >
              <span
                className="absolute top-[2px] size-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{ left: shared ? "22px" : "2px" }}
              />
            </button>
          </div>

          {/* 访问链接区域（开启后显示） */}
          {shared && (
            <div
              className="rounded-[12px] px-[16px] py-[14px] flex flex-col gap-[10px]"
              style={{ background: "rgba(245,245,244,0.5)", border: "1px solid #ebecf0" }}
            >
              <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">访问链接</p>
              <div className="flex items-center gap-[8px]">
                <div className="flex-1 bg-white border border-[#ebecf0] rounded-[6px] px-[12px] h-[40px] flex items-center">
                  <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] tracking-[1.12px] truncate">{shareUrl}</p>
                </div>
                <button
                  className="h-[40px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity whitespace-nowrap flex-shrink-0"
                  style={{ fontFamily: "PingFang SC, sans-serif" }}
                  onClick={handleCopy}
                >
                  {copied ? "已复制" : "复制链接"}
                </button>
                {mode === "web" && onDownload && (
                  <button
                    className="h-[40px] px-[16px] rounded-[6px] border border-[#ebecf0] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#f5f6f8] active:bg-[#ebecf0] transition-colors whitespace-nowrap flex-shrink-0"
                    style={{ fontFamily: "PingFang SC, sans-serif" }}
                    onClick={onDownload}
                  >
                    下载HTML
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Frame4({ folderName }: { folderName: string }) {
  return (
    <div className="absolute content-stretch flex gap-[8px] items-center left-[20px] px-[8px] py-[9.5px] top-[170px] w-[276px]">
      <div className="relative shrink-0 size-[16px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
          <path d={svgPaths.p3d9dd500} id="Icon" stroke="#93959F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['PingFang_SC:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#93959f] text-[12px] truncate max-w-[220px]">{folderName}</p>
    </div>
  );
}

function ExportModal({ docName, content, contentMap, outlineNodes, selectedNodeId, isElectron, onClose, onToast }: {
  docName: string; content: string; contentMap?: DocContentMap; outlineNodes?: OutlineNode[]; selectedNodeId?: string; isElectron: boolean; onClose: () => void; onToast?: (message: string, type: "success" | "error" | "info") => void;
}) {
  const [scope, setScope] = useState<"current" | "all">("current");
  const [format, setFormat] = useState<"HTML" | "Markdown" | "Word" | "PDF">("HTML");
  const [exportBusy, setExportBusy] = useState(false);

  const collectSubtreeContent = (nodes: OutlineNode[], nodeId: string): { id: string; name: string; html: string; level: number }[] => {
    const node = findNode(nodes, nodeId);
    if (!node) return [];
    const results: { id: string; name: string; html: string; level: number }[] = [];
    const collect = (item: OutlineNode, level: number) => {
      results.push({ id: item.id, name: item.name, html: contentMap?.[item.id] || emptyParagraph, level });
      item.children.forEach((child) => collect(child, Math.min(6, level + 1)));
    };
    collect(node, 1);
    return results;
  };

  const collectTreeContent = (nodes: OutlineNode[]): { id: string; name: string; html: string; level: number }[] => {
    const results: { id: string; name: string; html: string; level: number }[] = [];
    const collect = (items: OutlineNode[], level: number) => {
      items.forEach((item) => {
        results.push({ id: item.id, name: item.name, html: contentMap?.[item.id] || emptyParagraph, level });
        collect(item.children, Math.min(6, level + 1));
      });
    };
    collect(nodes, 1);
    return results;
  };

  const buildExportHtml = (parts: { name: string; html: string; level?: number }[]): string => {
    return parts.map(p => {
      if (p.html.startsWith("<h1>")) return p.html;
      const level = Math.min(6, Math.max(1, p.level || 1));
      return `<h${level}>${escapeHtml(p.name)}</h${level}>${p.html}`;
    }).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n');
  };

  const notify = (message: string, type: "success" | "error" | "info") => onToast?.(message, type);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    let exportContent: string;
    let exportOutlineTree: OutlineNode[] | undefined;
    let exportSections: PreviewSection[];
    let initialNodeId = selectedNodeId;
    let exportTitle = docName;
    if (scope === "current" && outlineNodes && selectedNodeId) {
      const selectedSubtree = findNode(outlineNodes, selectedNodeId);
      const parts = collectSubtreeContent(outlineNodes, selectedNodeId);
      exportContent = parts.length > 0 ? buildExportHtml(parts) : content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportOutlineTree = selectedSubtree ? [selectedSubtree] : undefined;
      exportSections = selectedSubtree ? buildPreviewSections([selectedSubtree], contentMap) : [{ id: "root", name: docName, html: exportContent }];
      exportTitle = selectedSubtree?.name || docName;
    } else if (scope === "all" && outlineNodes) {
      const parts = collectTreeContent(outlineNodes || []);
      exportContent = parts.length > 0 ? buildExportHtml(parts) : content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportOutlineTree = outlineNodes;
      exportSections = buildPreviewSections(outlineNodes, contentMap);
      initialNodeId = selectedNodeId || exportSections[0]?.id;
    } else {
      exportContent = content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportSections = [{ id: "root", name: docName, html: exportContent }];
    }

    try {
      const safeName = sanitizeFileName(exportTitle || docName || "文档");
      const skipTitle = scope === "all" || (scope === "current" && !!exportOutlineTree);
      const payload = { title: exportTitle, content: exportContent, defaultName: safeName, options: { skipTitle } };

      if (format === "HTML") {
        const fullHtml = buildPreviewHtml(exportTitle, exportSections, exportOutlineTree, initialNodeId, contentMap);
        if (isElectron) {
          const result = await (window as any).electronAPI.exportHtml(fullHtml, `${docName}.html`);
          notify(result === false ? "已取消导出" : "导出成功", result === false ? "info" : "success");
        } else {
          downloadBlob(new Blob([fullHtml], { type: "text/html" }), `${docName}.html`);
          notify("导出成功", "success");
        }
      } else if (format === "Markdown") {
        if (isElectron && (window as any).electronAPI.exportMarkdown) {
          const result = await (window as any).electronAPI.exportMarkdown(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const md = turndownService.turndown(exportContent).trim() + "\n";
          downloadBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${safeName}.md`);
          notify("导出成功", "success");
        }
      } else if (format === "Word") {
        if (isElectron) {
          const result = await (window as any).electronAPI.exportDocx(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const htmlToDocx = (await import("html-to-docx")).default;
          const buffer = await htmlToDocx(wordHtmlDocument(exportTitle, exportContent, { skipTitle }), null, { orientation: "portrait", margins: { top: 720, right: 720, bottom: 720, left: 720 } });
          downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${safeName}.docx`);
          notify("导出成功", "success");
        }
      } else if (format === "PDF") {
        if (isElectron) {
          const result = await (window as any).electronAPI.exportPdf(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const w = window.open("", "_blank");
          if (!w) throw new Error("浏览器阻止了打印窗口，请允许弹窗后重试");
          w.document.write(pdfPrintHtmlDocument(exportTitle, exportContent, { skipTitle }));
          w.document.close();
          notify("已打开打印窗口，请选择保存为 PDF", "info");
        }
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      notify(error instanceof Error ? error.message : "导出失败", "error");
      setExportBusy(false);
    }
  };

  const scopeOptions = [
    { key: "current" as const, label: "当前页", desc: "导出当前层级及子集" },
    { key: "all" as const, label: "整个文档", desc: "导出当前文档全部内容" },
  ];
  const formatOptions = [
    { key: "HTML" as const, desc: "适合预览和分享" },
    { key: "Markdown" as const, desc: "适合二次编辑" },
    { key: "Word" as const, desc: "导出为docx" },
    { key: "PDF" as const, desc: "适合正式分发" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[600px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] p-[32px] flex flex-col gap-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[18px] font-medium leading-[normal]">导出文档</p>
          <button className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" onClick={onClose} disabled={exportBusy}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 导出范围 */}
        <div className="flex flex-col gap-[12px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">导出范围</p>
          <div className="grid grid-cols-2 gap-[12px]">
            {scopeOptions.map(({ key, label, desc }) => (
              <button
                key={key}
                className={`text-left p-[16px] rounded-[12px] border transition-all duration-150 cursor-pointer ${scope === key ? "border-[#131212] bg-[#f7f8fa]" : "border-[#e5e7eb] hover:border-[#131212] hover:bg-[#fafafa]"}`}
                onClick={() => setScope(key)}
              >
                <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[15px] font-medium leading-[normal] mb-[6px]">{label}</p>
                <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[normal]">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 导出格式 */}
        <div className="flex flex-col gap-[12px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">导出格式</p>
          <div className="grid grid-cols-4 gap-[10px]">
            {formatOptions.map(({ key, desc }) => (
              <button
                key={key}
                className={`text-left p-[14px] rounded-[12px] border transition-all duration-150 cursor-pointer ${format === key ? "border-[#131212] bg-[#f7f8fa]" : "border-[#e5e7eb] hover:border-[#131212] hover:bg-[#fafafa]"}`}
                onClick={() => setFormat(key)}
              >
                <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[15px] font-medium leading-[normal] mb-[6px]">{key}</p>
                <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] leading-[normal]">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-[12px]">
          <button
            className="h-[40px] px-[24px] rounded-[8px] border border-[#e5e7eb] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
            disabled={exportBusy}
          >取消</button>
          <button
            className={`h-[40px] px-[24px] rounded-[8px] bg-[#131212] text-white text-[14px] transition-opacity ${exportBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-80 active:opacity-60"}`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleExport}
            disabled={exportBusy}
          >{exportBusy ? "导出中..." : "导出"}</button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentAssistant() {
  const [selectedDoc, setSelectedDoc] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [modal, setModal] = useState<{ type: "new" } | { type: "new-file" } | { type: "rename"; target: string } | null>(null);
  const [docDeleteConfirm, setDocDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [shared, setShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderName] = useState("默认文件夹");
  const [mode, setMode] = useState<"document" | "outline">("document");
  const fontSize = "15px";
  const lineHeight = "1.8";
  const theme = "light";
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>([]);
  // 按文档名持久化大纲树，避免切换模式时丢失编辑
  const [outlineTrees, setOutlineTrees] = useState<Record<string, OutlineNode[]>>({});
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [docStore, setDocStore] = useState<DocStore>({});
  const [webStoreHydrated, setWebStoreHydrated] = useState(false);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const webPersistTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const webPersistErrorShownRef = useRef(false);
  const anchorNavigationHandledRef = useRef(false);
  const editorContentRef = useRef({ html: "", text: "" });
  const importInputRef = useRef<HTMLInputElement>(null);
  const [shareUrl, setShareUrl] = useState("http://localhost:6535");
  const webShareUrlRef = useRef<string | null>(null);
  const webShareHtmlRef = useRef("");
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

  const persistDoc = useCallback((docName: string, doc: StoredDoc, delay = 500) => {
    if (!isElectron || !docName) return;
    clearTimeout(saveTimersRef.current[docName]);
    saveTimersRef.current[docName] = setTimeout(() => {
      (window as any).electronAPI.saveDoc(docName, { ...doc, updatedAt: new Date().toISOString() });
    }, delay);
  }, [isElectron]);

  const ensureDoc = useCallback((docName: string): StoredDoc => {
    return docStore[docName] ?? createStoredDoc(docName);
  }, [docStore]);

  const setAndPersistDoc = useCallback((docName: string, updater: (doc: StoredDoc) => StoredDoc, delay = 500) => {
    setDocStore((prev) => {
      const current = prev[docName] ?? createStoredDoc(docName);
      const nextDoc = { ...updater(current), name: docName, updatedAt: new Date().toISOString() };
      persistDoc(docName, nextDoc, delay);
      return { ...prev, [docName]: nextDoc };
    });
  }, [persistDoc]);

  useEffect(() => {
    const handler = () => setModal({ type: "new" });
    document.addEventListener("opencode-new-doc", handler);
    return () => document.removeEventListener("opencode-new-doc", handler);
  }, []);

  useEffect(() => {
    if (isElectron) {
      (window as any).electronAPI.getDocs().then(async (list: any[]) => {
        if (list.length > 0) {
          const loadedEntries = await Promise.all(list.map(async (item: any) => {
            const id = item.id ?? item.name;
            const raw = await (window as any).electronAPI.getDoc(id);
            const doc = normalizeStoredDoc(item.name ?? id, raw);
            return [doc.name, doc] as const;
          }));
          const loadedStore = Object.fromEntries(loadedEntries) as DocStore;
          const names = loadedEntries.map(([name]) => name);
          setDocStore(loadedStore);
          setDocs(names);
          setSelectedDoc(names[0]);
          setOutlineNodes(loadedStore[names[0]]?.children ?? buildOutlineTree(names[0]));
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isElectron) return;
    let cancelled = false;
    const load = async () => {
      let persisted: WebPersistedState | null = null;
      try {
        persisted = await readWebState();
      } catch (error) {
        console.error("Failed to load IndexedDB store:", error);
      }
      if (!persisted) {
        try {
          const raw = localStorage.getItem(WEB_STORAGE_KEY);
          persisted = raw ? JSON.parse(raw) as WebPersistedState : null;
        } catch (error) {
          console.error("Failed to load legacy web store:", error);
        }
      }
      if (cancelled) return;
      if (persisted) {
        const loadedStore = Object.fromEntries(
          Object.entries(persisted.docStore ?? {}).map(([name, doc]) => [name, normalizeStoredDoc(name, doc)])
        ) as DocStore;
        const names = Array.isArray(persisted.docs)
          ? persisted.docs.filter((name: unknown): name is string => typeof name === "string")
          : Object.keys(loadedStore);
        if (names.length > 0) {
          const nextSelected = persisted.selectedDoc && names.includes(persisted.selectedDoc) ? persisted.selectedDoc : names[0];
          const firstDoc = loadedStore[nextSelected] ?? loadedStore[names[0]];
          setDocStore(loadedStore);
          setDocs(names);
          setSelectedDoc(nextSelected);
          setOutlineNodes(firstDoc?.children ?? []);
          setSelectedNodeId(firstDoc?.children?.[0]?.id ?? "");
        }
      }
      setWebStoreHydrated(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [isElectron]);

  useEffect(() => {
    if (isElectron || !webStoreHydrated) return;
    clearTimeout(webPersistTimerRef.current);
    const state: WebPersistedState = { docs, docStore, selectedDoc };
    webPersistTimerRef.current = setTimeout(async () => {
      try {
        await writeWebState(state);
        localStorage.removeItem(WEB_STORAGE_KEY);
        webPersistErrorShownRef.current = false;
      } catch (indexedDbError) {
        console.error("Failed to save IndexedDB store:", indexedDbError);
        try {
          localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state));
          webPersistErrorShownRef.current = false;
        } catch (storageError) {
          console.error("Failed to save fallback web store:", storageError);
          if (!webPersistErrorShownRef.current) {
            webPersistErrorShownRef.current = true;
            setToast({ message: "文档内容过大，浏览器存储失败，请导出文档后减少媒体文件", type: "error" });
          }
        }
      }
    }, 500);
    return () => clearTimeout(webPersistTimerRef.current);
  }, [docs, docStore, selectedDoc, isElectron, webStoreHydrated]);

  const revokeWebShareUrl = useCallback(() => {
    if (webShareUrlRef.current) {
      URL.revokeObjectURL(webShareUrlRef.current);
      webShareUrlRef.current = null;
    }
    webShareHtmlRef.current = "";
  }, []);

  useEffect(() => () => revokeWebShareUrl(), [revokeWebShareUrl]);

  const buildCurrentShareHtml = useCallback(() => {
    if (!selectedDoc) throw new Error("请先新建或选择文档");
    const doc = docStore[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
    const tree = doc.children?.length ? doc.children : getOutlineTree(selectedDoc);
    const sections = buildPreviewSections(tree, doc.content);
    const bodyHtml = sections.length > 0
      ? sections.map((section) => section.html).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n')
      : `<h1>${escapeHtml(doc.name || selectedDoc)}</h1>${emptyParagraph}`;
    return buildPreviewHtml(
      doc.name || selectedDoc,
      sections.length > 0 ? sections : [{ id: "root", name: doc.name || selectedDoc, html: bodyHtml }],
      tree,
      selectedNodeId || sections[0]?.id,
      doc.content,
    );
  }, [selectedDoc, selectedNodeId, docStore, outlineTrees]);

  const createWebShare = useCallback(() => {
    revokeWebShareUrl();
    const html = buildCurrentShareHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    webShareUrlRef.current = url;
    webShareHtmlRef.current = html;
    setShareUrl(url);
  }, [buildCurrentShareHtml, revokeWebShareUrl]);

  const handleToggleShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    setShareError("");
    try {
      if (!isElectron) {
        if (shared) {
          revokeWebShareUrl();
          setShared(false);
          setToast({ message: "分享已关闭", type: "info" });
        } else {
          createWebShare();
          setShared(true);
          setToast({ message: "分享页已生成", type: "success" });
        }
        return;
      }
      if (!shared) {
        if (!selectedDoc) {
          setShareError("请先新建或选择文档后再开启分享");
          setToast({ message: "请先选择文档", type: "error" });
          return;
        }
        const url = await (window as any).electronAPI.startShare(6535, selectedDoc);
        setShareUrl(url);
        setShared(true);
        setToast({ message: "分享已开启", type: "success" });
      } else {
        await (window as any).electronAPI.stopShare();
        setShared(false);
        setToast({ message: "分享已关闭", type: "info" });
      }
    } catch (error) {
      console.error("Failed to toggle share:", error);
      const message = error instanceof Error ? error.message : "分享操作失败";
      setShareError(message.includes("EADDRINUSE") ? "端口 6535 已被占用，请关闭占用程序后重试。" : message);
      setToast({ message: "分享开启失败", type: "error" });
    } finally {
      setShareBusy(false);
    }
  };

  const handleDownloadShareHtml = () => {
    try {
      const html = webShareHtmlRef.current || buildCurrentShareHtml();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc || "文档助手分享"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "分享HTML已下载", type: "success" });
    } catch (error) {
      console.error("Failed to download share HTML:", error);
      setToast({ message: error instanceof Error ? error.message : "下载分享HTML失败", type: "error" });
    }
  };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^/.]+$/, "");
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "docx") {
      try {
        const buffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        const html = result.value;
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const title = titleMatch ? titleMatch[1].trim() : name;
        const tree = buildOutlineTree(title);
        const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
        const doc = createStoredDoc(title, tree, { [leaf.id]: html || emptyParagraph });
        setDocs((prev) => [...new Set([...prev, title])]);
        setSelectedDoc(title);
        setDocStore((prev) => ({ ...prev, [title]: doc }));
        setOutlineTrees((prev) => ({ ...prev, [title]: tree }));
        setOutlineNodes(tree);
        setSelectedNodeId(leaf.id);
        setMode("outline");
        editorContentRef.current = { html, text: new DOMParser().parseFromString(html, "text/html").body.textContent || "" };
        persistDoc(title, doc, 0);
      } catch { setToast({ message: "导入失败", type: "error" }); }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (ext === "mdoc") {
          try {
            const raw = JSON.parse(text);
            const doc = normalizeStoredDoc(name, raw);
            const firstNode = flattenOutlineNodes(doc.children).find((node) => doc.content[node.id]?.replace(/<[^>]*>/g, "").trim()) ?? flattenOutlineNodes(doc.children)[0];
            setDocs((prev) => [...new Set([...prev, doc.name])]);
            setSelectedDoc(doc.name);
            setDocStore((prev) => ({ ...prev, [doc.name]: doc }));
            setOutlineTrees((prev) => ({ ...prev, [doc.name]: doc.children }));
            setOutlineNodes(doc.children);
            setSelectedNodeId(firstNode?.id ?? "");
            persistDoc(doc.name, doc, 0);
          } catch {
            setToast({ message: "mdoc 文件格式错误", type: "error" });
            return;
          }
        } else if (ext === "md") {
          const html = markdownToSimpleHtml(text);
          const lines = text.split("\n");
          const titles: string[] = [];
          lines.forEach(line => {
            const m = line.match(/^(#{1,5})\s+(.+)/);
            if (m) titles.push(m[2].trim());
          });
          const title = titles[0] || name;
          const tree = buildOutlineTree(title);
          const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
          const doc = createStoredDoc(title, tree, { [leaf.id]: html });
          setDocs((prev) => [...new Set([...prev, title])]);
          setSelectedDoc(title);
          setDocStore((prev) => ({ ...prev, [title]: doc }));
          setOutlineTrees((prev) => ({ ...prev, [title]: tree }));
          setOutlineNodes(tree);
          setSelectedNodeId(leaf.id);
          persistDoc(title, doc, 0);
        } else {
          const html = textToHtml(text);
          const tree = buildOutlineTree(name);
          const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
          const doc = createStoredDoc(name, tree, { [leaf.id]: html });
          setDocs((prev) => [...new Set([...prev, name])]);
          setSelectedDoc(name);
          setDocStore((prev) => ({ ...prev, [name]: doc }));
          setOutlineTrees((prev) => ({ ...prev, [name]: tree }));
          setOutlineNodes(tree);
          setSelectedNodeId(leaf.id);
          persistDoc(name, doc, 0);
        }
        setMode("outline");
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  useEffect(() => {
    if (anchorNavigationHandledRef.current || (!isElectron && !webStoreHydrated) || docs.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetDoc = params.get("doc");
    const targetNode = params.get("node");
    if (!targetDoc || !targetNode || !docs.includes(targetDoc)) {
      anchorNavigationHandledRef.current = true;
      return;
    }
    const tree = docStore[targetDoc]?.children ?? [];
    if (!findNode(tree, targetNode)) {
      anchorNavigationHandledRef.current = true;
      setToast({ message: "锚点对应的文档内容不存在", type: "error" });
      return;
    }
    anchorNavigationHandledRef.current = true;
    setSelectedDoc(targetDoc);
    setOutlineNodes(tree);
    setSelectedNodeId(targetNode);
    setMode("outline");
  }, [docs, docStore, isElectron, webStoreHydrated]);

  const getOutlineTree = (docName: string) =>
    docName ? (docStore[docName]?.children ?? outlineTrees[docName] ?? buildEmptyOutlineTree(docName)) : [];

  const getNodeContent = (docName: string, nodeId: string) =>
    docStore[docName]?.content?.[nodeId] ?? emptyParagraph;

  useEffect(() => {
    if (isElectron || !shared) return;
    revokeWebShareUrl();
    setShared(false);
  }, [selectedDoc, isElectron]);

  const updateOutlineTree = (docName: string, nodes: OutlineNode[]) => {
    setOutlineNodes(nodes);
    setOutlineTrees((prev) => ({ ...prev, [docName]: nodes }));
    setAndPersistDoc(docName, (doc) => ({ ...doc, children: nodes }));
  };

  const getDocChildCount = (docName: string) => {
    const tree = getOutlineTree(docName);
    return tree.reduce((acc, n) => acc + countDescendants(n), 0);
  };

  const handleSelectDoc = (name: string) => {
    setSelectedDoc(name);
    const tree = getOutlineTree(name);
    setOutlineNodes(tree);
    setSelectedNodeId(tree[0]?.id ?? "");
    if (mode === "outline") setMode("outline");
  };

  const handleNewDoc = (name: string) => {
    const tree = buildOutlineTree(name);
    const doc = createStoredDoc(name, tree);
    setDocs((prev) => [...prev, name]);
    setSelectedDoc(name);
    setDocStore((prev) => ({ ...prev, [name]: doc }));
    setOutlineTrees((prev) => ({ ...prev, [name]: doc.children }));
    setOutlineNodes(doc.children);
    setSelectedNodeId(tree[0]?.id ?? "");
    setMode("outline");
    persistDoc(name, doc, 0);
  };

  const handleNewRootFile = (name: string) => {
    if (!selectedDoc || mode !== "outline") return;
    const newNode: OutlineNode = { id: `file-${Date.now()}`, name, children: [] };
    const nextNodes = [...outlineNodes, newNode];
    updateOutlineTree(selectedDoc, nextNodes);
    setSelectedNodeId(newNode.id);
  };

  const handleRename = (oldName: string, newName: string) => {
    setDocs((prev) => prev.map((d) => (d === oldName ? newName : d)));
    if (selectedDoc === oldName) setSelectedDoc(newName);
    const renamedDoc = { ...(docStore[oldName] ?? createStoredDoc(oldName)), name: newName, updatedAt: new Date().toISOString() };
    setOutlineTrees((prev) => {
      const tree = prev[oldName] ?? renamedDoc.children;
      const { [oldName]: _oldTree, ...rest } = prev;
      return { ...rest, [newName]: tree };
    });
    setDocStore((prev) => {
      const { [oldName]: _oldDoc, ...rest } = prev;
      return { ...rest, [newName]: renamedDoc };
    });
    if (isElectron) {
      (window as any).electronAPI.deleteDoc(oldName);
      persistDoc(newName, renamedDoc, 0);
    }
  };

  const doDeleteDoc = (name: string) => {
    setDocs((prev) => {
      const next = prev.filter((d) => d !== name);
      if (selectedDoc === name && next.length > 0) setSelectedDoc(next[0]);
      return next;
    });
    setOutlineTrees((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    setDocStore((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    if (mode === "outline" && selectedDoc === name) setMode("document");
    if (isElectron) (window as any).electronAPI.deleteDoc(name);
  };

  const handleDelete = (name: string) => {
    const childCount = getDocChildCount(name);
    setDocDeleteConfirm({
      message: buildDeleteMessage("doc", name, childCount),
      onConfirm: () => doDeleteDoc(name),
    });
  };

  const handleDocListExport = async (name: string) => {
    const doc = docStore[name] ?? createStoredDoc(name, getOutlineTree(name));
    const parts = flattenOutlineNodes(doc.children).map((node) => ({
      name: node.name,
      html: doc.content?.[node.id] || emptyParagraph,
    }));
    const bodyHtml = parts.length > 0
      ? parts.map((part) => `<h1>${escapeHtml(part.name)}</h1>${part.html}`).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n')
      : `<h1>${escapeHtml(doc.name || name)}</h1>${emptyParagraph}`;
    const sections = buildPreviewSections(doc.children, doc.content);
    const fullHtml = buildPreviewHtml(doc.name || name, sections.length > 0 ? sections : [{ id: "root", name: doc.name || name, html: bodyHtml }], doc.children, sections[0]?.id, doc.content);
    if (isElectron) {
      await (window as any).electronAPI.exportHtml(fullHtml, `${doc.name || name}.html`);
      return;
    }
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name || name}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToFolder = async () => {
    if (!selectedDoc) {
      setToast({ message: "请先新建或选择文档", type: "info" });
      return;
    }
    const doc = docStore[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
    const payload = { ...doc, children: getOutlineTree(selectedDoc), updatedAt: new Date().toISOString() };
    if (isElectron && (window as any).electronAPI.saveDocToFolder) {
      const result = await (window as any).electronAPI.saveDocToFolder(selectedDoc, payload);
      if (!result?.canceled) setToast({ message: "已保存到选择的位置", type: "success" });
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDoc}.mdoc`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: "已下载文档文件", type: "success" });
  };

  const handleTopBarDelete = () => {
    if (!selectedDoc) return;
    const childCount = getDocChildCount(selectedDoc);
    setDocDeleteConfirm({
      message: buildDeleteMessage("doc", selectedDoc, childCount),
      onConfirm: () => doDeleteDoc(selectedDoc),
    });
  };

  const handleEnterOutline = () => {
    if (!selectedDoc) return;
    const tree = getOutlineTree(selectedDoc);
    setOutlineNodes(tree);
    setSelectedNodeId(tree[0]?.id ?? "");
    setMode("outline");
  };

  const handleSwitchMode = () => {
    if (mode === "document") {
      handleEnterOutline();
    } else {
      setMode("document");
    }
  };

  const selectedNode = mode === "outline" ? findNode(outlineNodes, selectedNodeId) : null;
  const selectedNodeDepth = mode === "outline" ? findNodeDepth(outlineNodes, selectedNodeId) : 0;

  const handleTitleChange = (name: string) => {
    if (mode === "outline" && selectedNode) {
      const renameInTree = (arr: OutlineNode[]): OutlineNode[] =>
        arr.map((node) => node.id === selectedNode.id ? { ...node, name } : { ...node, children: renameInTree(node.children) });
      updateOutlineTree(selectedDoc, renameInTree(outlineNodes));
      return;
    }
    if (selectedDoc && name !== selectedDoc) handleRename(selectedDoc, name);
  };

  const handleNodeContentChange = (html: string, text: string) => {
    if (!selectedNode) return;
    editorContentRef.current = { html, text };
    setAndPersistDoc(selectedDoc, (doc) => ({
      ...doc,
      children: getOutlineTree(selectedDoc),
      content: { ...doc.content, [selectedNode.id]: html },
    }));
  };

  return (
    <div className="bg-[#f7f8fa] relative size-full" data-name="首页-文档模式">
      <Frame1 docName={selectedDoc} mode={mode} selectedNode={selectedNode} nodeDepth={selectedNodeDepth} nodeContent={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : emptyParagraph} onTitleChange={handleTitleChange} theme={theme} fontSize={fontSize} lineHeight={lineHeight} sidebarWidth={276}
        onContentChange={handleNodeContentChange} />
      <Frame11 onOpenShare={() => setShowShareModal(true)} onOpenExport={() => setShowExportModal(true)} onDelete={handleTopBarDelete} onImport={() => importInputRef.current?.click()} onSave={handleSaveToFolder} />
      <input ref={importInputRef} type="file" accept=".mdoc,.md,.txt,.docx" className="hidden" onChange={handleImport} />
      <Group1 value={searchQuery} onChange={setSearchQuery} mode={mode} />
      {mode === "document" ? (
        <Frame16
          docs={searchQuery.trim() ? docs.filter(d => d.includes(searchQuery.trim())) : docs}
          selected={selectedDoc}
          onSelect={handleSelectDoc}
          onRename={(name) => setModal({ type: "rename", target: name })}
          onDelete={handleDelete}
          onExport={handleDocListExport}
          onEnterOutline={handleEnterOutline}
        />
      ) : (
        <OutlineTree nodes={outlineNodes} selectedId={selectedNodeId} contentMap={docStore[selectedDoc]?.content ?? {}} onSelect={setSelectedNodeId} onUpdateNodes={(nodes) => updateOutlineTree(selectedDoc, nodes)} />
      )}
      <Frame27 onNewDoc={() => setModal({ type: "new" })} onNewFile={() => setModal({ type: "new-file" })} mode={mode} onSwitchMode={handleSwitchMode} />
      <Frame4 folderName={mode === "outline" ? (selectedDoc || folderName) : folderName} />
      <SidebarShareStatus shared={shared} onClick={() => setShowShareModal(true)} />
      {docDeleteConfirm && (
        <DeleteConfirmModal
          message={docDeleteConfirm.message}
          onConfirm={docDeleteConfirm.onConfirm}
          onClose={() => setDocDeleteConfirm(null)}
        />
      )}
      {showExportModal && (
        <ExportModal docName={selectedDoc} content={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : editorContentRef.current.html} contentMap={docStore[selectedDoc]?.content ?? {}} outlineNodes={outlineNodes} selectedNodeId={selectedNodeId} isElectron={!!isElectron} onClose={() => setShowExportModal(false)} onToast={(message, type) => setToast({ message, type })} />
      )}
      {showShareModal && (
        <ShareModal
          shared={shared}
          mode={isElectron ? "electron" : "web"}
          loading={shareBusy}
          errorMessage={shareError}
          shareUrl={shareUrl}
          onToggle={handleToggleShare}
          onDownload={isElectron ? undefined : handleDownloadShareHtml}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {modal?.type === "new" && (
        <NewDocModal
          title="新建文档"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewDoc(name); setModal(null); }}
        />
      )}
      {modal?.type === "new-file" && (
        <NewDocModal
          title="新建文件"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewRootFile(name); setModal(null); }}
        />
      )}
      {modal?.type === "rename" && (
        <NewDocModal
          title="重命名"
          initialValue={modal.target}
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleRename(modal.target, name); setModal(null); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
