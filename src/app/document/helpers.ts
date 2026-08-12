import type { DocContentMap, OutlineNode, PreviewSection, StoredDoc, WebPersistedState } from "./types";
import {
  emptyParagraph,
  escapeHtml,
  escapeScriptJson,
  markdownToSimpleHtml,
  sanitizeHtml,
  sanitizeFileName,
  textToHtml,
} from "../editor/utils/html";
import outlineSvg from "../../imports/首页大纲模式根节点/svg-4qt61e0wiv";

export const WEB_STORAGE_KEY = "doc-assistant-store-v1";
export const WEB_STORAGE_DB = "doc-assistant-db";
export const WEB_STORAGE_STORE = "state";
export const WEB_STORAGE_STATE_ID = "current";

export { textToHtml, markdownToSimpleHtml, sanitizeFileName };

export const openWebStoreDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(WEB_STORAGE_DB, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(WEB_STORAGE_STORE);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
});

export const readWebState = async (): Promise<WebPersistedState | null> => {
  const db = await openWebStoreDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(WEB_STORAGE_STORE, "readonly").objectStore(WEB_STORAGE_STORE).get(WEB_STORAGE_STATE_ID);
    request.onsuccess = () => resolve((request.result as WebPersistedState | undefined) ?? null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close()) as Promise<WebPersistedState | null>;
};

export const writeWebState = async (state: WebPersistedState) => {
  const db = await openWebStoreDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(WEB_STORAGE_STORE, "readwrite").objectStore(WEB_STORAGE_STORE).put(state, WEB_STORAGE_STATE_ID);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
};

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

export const buildPreviewSections = (nodes: OutlineNode[], contentMap?: DocContentMap): PreviewSection[] =>
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

export const buildPreviewHtml = (title: string, sections: PreviewSection[], outlineTree?: OutlineNode[], initialNodeId?: string, contentMap?: DocContentMap) => {
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
  const hasTree = !!(outlineTree && outlineTree.length > 0);
  const docTreeHtml = hasTree
    ? `<div class="doc-tree"><div class="tree-header">${escapeHtml(title)}</div>${buildTreeHtml(outlineTree!)}</div>`
    : '';
  const initialTitle = sectionMap[firstNodeId]?.name || sections[0]?.name || title;

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(title)}</title><script type="application/json" data-doc-assistant-state>${escapeScriptJson({ name: title, children: outlineTree || [], content: contentMap || {} })}</script><style>
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#131212;line-height:1.6;min-height:100vh;overflow-x:hidden;overflow-y:auto}
body::-webkit-scrollbar{width:6px}body::-webkit-scrollbar-thumb{background:#d0d1d6;border-radius:3px}body::-webkit-scrollbar-track{background:transparent}
.mobile-bar{display:none;position:sticky;top:0;z-index:40;height:48px;padding:0 12px;align-items:center;gap:10px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid #ebecf0}
.mobile-menu-btn,.mobile-toc-btn{width:36px;height:36px;border:none;border-radius:8px;background:transparent;color:#303133;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}
.mobile-menu-btn:active,.mobile-toc-btn:active{background:#f0f1f5}
.mobile-title{flex:1;min-width:0;font-size:15px;font-weight:600;color:#131212;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mobile-menu-icon,.mobile-toc-icon{width:20px;height:20px;display:block}
.drawer-mask{display:none;position:fixed;inset:0;z-index:50;background:rgba(19,18,18,.36)}
.drawer-mask.open{display:block}
.drawer{position:fixed;top:0;bottom:0;z-index:60;width:min(86vw,320px);max-width:320px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.12);transform:translateX(-105%);transition:transform .22s ease;overflow:hidden;display:flex;flex-direction:column}
.drawer.right{left:auto;right:0;transform:translateX(105%)}
.drawer.open{transform:translateX(0)}
.drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 14px 12px;border-bottom:1px solid #ebecf0;flex-shrink:0}
.drawer-title{font-size:15px;font-weight:600;color:#131212;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drawer-close{width:32px;height:32px;border:none;border-radius:8px;background:transparent;color:#8d8e99;font-size:20px;line-height:1;cursor:pointer}
.drawer-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:8px 8px 24px}
.shell{display:grid;grid-template-columns:${hasTree ? '260px ' : ''}minmax(0,1fr) 210px;column-gap:40px;min-height:100vh;max-width:1440px;margin:0 auto;padding:0 32px}
.sidebar-left{overflow-y:auto;padding:32px 32px 20px 0;position:sticky;top:0;height:100vh;scrollbar-width:thin;scrollbar-color:transparent transparent}
.sidebar-left::-webkit-scrollbar{width:5px}.sidebar-left::-webkit-scrollbar-track{background:transparent}.sidebar-left::-webkit-scrollbar-thumb{background:transparent;border-radius:999px;transition:background .15s ease}
.sidebar-left:hover::-webkit-scrollbar-thumb,.sidebar-left.sb-scrolling::-webkit-scrollbar-thumb{background:rgba(112,114,119,.45)}
.sidebar-left:hover,.sidebar-left.sb-scrolling{scrollbar-color:rgba(112,114,119,.45) transparent}
.doc-tree{}.tree-header{font-size:15px;font-weight:600;color:#131212;padding:0 12px 14px;margin-bottom:10px}.tree-item{display:flex;align-items:center;gap:6px;padding:8px 12px;cursor:pointer;font-size:14px;color:#303133;transition:background .15s;border-radius:8px;-webkit-tap-highlight-color:transparent}.tree-item:hover{background:#f5f6f8}.tree-item.active{background:#eef0f5;color:#131212;font-weight:500}.tree-toggle{width:20px;height:20px;border:none;border-radius:4px;background:transparent;color:#8d8e99;padding:0;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}.tree-toggle-icon{width:12px;height:12px;display:block}.tree-toggle:disabled{cursor:default;opacity:0}.tree-item.active .tree-toggle:not(:disabled){background:#dadbdf;color:#131212}.tree-children{display:none}.tree-node.expanded>.tree-children{display:block}.tree-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.content{overflow:visible;padding:48px 0 96px;height:auto;max-width:820px;width:100%;margin:0 auto;min-width:0;word-wrap:break-word;overflow-wrap:anywhere}
.content img,.content video{max-width:100%;height:auto}
.content h1{font-size:30px;line-height:1.35;font-weight:600;margin:0 0 28px;color:#131212;letter-spacing:-.01em}
.content h2{font-size:22px;line-height:1.4;font-weight:600;margin:48px 0 18px;color:#131212}
.content h3{font-size:18px;line-height:1.5;font-weight:600;margin:36px 0 14px;color:#131212}
.content h4,.content h5,.content h6{font-size:16px;line-height:1.55;font-weight:600;margin:28px 0 12px;color:#131212}
.content p{font-size:15px;line-height:1.85;margin:14px 0;color:#303133}
.content a{color:#134CFF;text-decoration:underline;text-underline-offset:2px}
.content ul,.content ol{padding-left:24px;margin:12px 0}
.content li{font-size:15px;line-height:1.8;margin:4px 0}
.content ul[data-type="taskList"],.content ul.doc-task-list{list-style:none;padding-left:0;margin:12px 0}
.content li[data-type="taskItem"],.content li.doc-task-item{list-style:none;display:flex;gap:8px;align-items:flex-start;margin:4px 0;padding-left:0}
.content li[data-type="taskItem"]>label,.content li.doc-task-item>label{margin-top:2px;flex-shrink:0}
.content li[data-type="taskItem"]>div,.content li.doc-task-item>div{flex:1;min-width:0}
.content li[data-type="taskItem"]>div>p,.content li.doc-task-item>div>p{margin:0}
.content [data-task-item="true"]{display:flex;align-items:flex-start;gap:8px;margin:4px 0;list-style:none}
.content table{border-collapse:collapse;width:100%;margin:16px 0;display:block;overflow-x:auto}
.content td,.content th{border:1px solid #eef0f5;padding:10px 14px;text-align:left;font-size:14px}
.content tr:nth-child(odd) td,.content tr:nth-child(odd) th{background:rgba(238,240,245,.502)}
.content img{max-width:100%;border-radius:8px;border:1px solid #ebecf0}
.content blockquote{border-left:3px solid #134CFF;background:#f7f8fa;margin:10px 0;padding:10px 16px;color:#606266;border-radius:0 12px 12px 0}.content blockquote p{margin:0 0 4px;line-height:1.65}.content blockquote p:last-child{margin-bottom:0}
.content pre{background:#f5f6f8;border:1px solid #ebecf0;border-radius:12px;padding:20px 24px;overflow-x:auto;font-size:13px;line-height:1.7;position:relative;margin:16px 0}
.content pre code{font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.7}
.content hr{border:none;border-top:1px solid #ebecf0;margin:24px 0}
.copy-btn{position:absolute;top:8px;right:8px;z-index:2;height:26px;padding:0 10px;border:none;border-radius:6px;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);color:#707277;font-size:12px;cursor:pointer;display:none;align-items:center;font-family:inherit;transition:color .15s}.content pre:hover .copy-btn{display:flex}.copy-btn:hover{color:#131212;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.sidebar-right{overflow-y:auto;padding:48px 0 0;position:sticky;top:28px;align-self:start;max-height:calc(100vh - 56px);scrollbar-width:none}
.sidebar-right::-webkit-scrollbar{display:none}
.toc-header{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#131212;padding:0 12px 12px}.toc-hamburger{font-size:14px;color:#8d8e99}
.toc-item{display:block;line-height:1.8;text-decoration:none;padding:4px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s}.toc-item:hover{color:#131212!important}.toc-item.active{color:#134CFF!important;font-weight:600!important}
body.nav-open,body.toc-open{overflow:hidden}
@media(max-width:860px){
  .mobile-bar{display:flex}
  .shell{display:block;max-width:none;padding:0;min-height:auto}
  .sidebar-left,.sidebar-right{display:none}
  .content{padding:20px 16px 96px}
  .content h1{font-size:24px;margin:0 0 16px}
  .content h2{font-size:20px;margin:28px 0 12px}
  .content h3{font-size:17px;margin:22px 0 10px}
  .content p,.content li{font-size:15px;line-height:1.75}
  .drawer .tree-header{display:none}
  .drawer .doc-tree{padding:0}
  .drawer .tree-item{padding-top:10px;padding-bottom:10px;font-size:14px}
  .copy-btn{display:flex}
}
</style></head><body>
<header class="mobile-bar" id="mobile-bar">
  ${hasTree ? `<button type="button" class="mobile-menu-btn" id="mobile-menu-btn" aria-label="打开目录"><svg class="mobile-menu-icon" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>` : '<span style="width:36px"></span>'}
  <div class="mobile-title" id="mobile-title">${escapeHtml(initialTitle)}</div>
  <button type="button" class="mobile-toc-btn" id="mobile-toc-btn" aria-label="本页大纲"><svg class="mobile-toc-icon" viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
</header>
${hasTree ? `<div class="drawer-mask" id="nav-mask"></div><aside class="drawer" id="nav-drawer" aria-hidden="true"><div class="drawer-head"><div class="drawer-title">${escapeHtml(title)}</div><button type="button" class="drawer-close" id="nav-close" aria-label="关闭">×</button></div><div class="drawer-body" id="nav-drawer-body"></div></aside>` : ''}
<div class="drawer-mask" id="toc-mask"></div>
<aside class="drawer right" id="toc-drawer" aria-hidden="true"><div class="drawer-head"><div class="drawer-title">在本页</div><button type="button" class="drawer-close" id="toc-close" aria-label="关闭">×</button></div><div class="drawer-body" id="toc-drawer-body"><div id="toc-list-mobile"></div></div></aside>
<div class="shell">${hasTree ? `<aside class="sidebar-left" id="sidebar-left">${docTreeHtml}</aside>` : ''}<main class="content" id="doc-content">${fallbackHtml}</main><aside class="sidebar-right"><div class="toc-header"><span class="toc-hamburger">≡</span>在本页</div><div id="toc-list"></div></aside></div>
<script>
window.__DOC_SECTIONS__=${escapeScriptJson(sectionMap)};
window.__DOC_INITIAL__=${escapeScriptJson(firstNodeId)};
(function(){
try{
var sections=window.__DOC_SECTIONS__||{};
var content=document.getElementById('doc-content')||document.querySelector('.content');
var tocList=document.getElementById('toc-list');
var tocListMobile=document.getElementById('toc-list-mobile');
var mobileTitle=document.getElementById('mobile-title');
var navDrawer=document.getElementById('nav-drawer');
var navMask=document.getElementById('nav-mask');
var tocDrawer=document.getElementById('toc-drawer');
var tocMask=document.getElementById('toc-mask');
var sidebarLeft=document.getElementById('sidebar-left');
var navBody=document.getElementById('nav-drawer-body');
function cssEscape(value){try{if(window.CSS&&typeof CSS.escape==='function')return CSS.escape(value)}catch(e){}return String(value||'').replace(/([ !"#$%&'()*+,./:;<=>?@\\[\\]^\`{|}~])/g,'\\\\$1')}
function escapeText(s){return String(s||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]})}
function slug(s){return (s||'heading').replace(/[^a-zA-Z\\u4e00-\\u9fff0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'heading'}
function setBodyLock(){document.body.classList.toggle('nav-open',!!(navDrawer&&navDrawer.classList.contains('open')));document.body.classList.toggle('toc-open',!!(tocDrawer&&tocDrawer.classList.contains('open')))}
function closeNav(){if(navDrawer){navDrawer.classList.remove('open');navDrawer.setAttribute('aria-hidden','true')}if(navMask)navMask.classList.remove('open');setBodyLock()}
function openNav(){if(!navDrawer)return;closeToc();navDrawer.classList.add('open');navDrawer.setAttribute('aria-hidden','false');if(navMask)navMask.classList.add('open');setBodyLock()}
function closeToc(){if(tocDrawer){tocDrawer.classList.remove('open');tocDrawer.setAttribute('aria-hidden','true')}if(tocMask)tocMask.classList.remove('open');setBodyLock()}
function openToc(){if(!tocDrawer)return;closeNav();tocDrawer.classList.add('open');tocDrawer.setAttribute('aria-hidden','false');if(tocMask)tocMask.classList.add('open');setBodyLock()}
function syncMobileNavTree(){if(!navBody||!sidebarLeft)return;if(navBody.childElementCount)return;var tree=sidebarLeft.querySelector('.doc-tree');if(tree)navBody.appendChild(tree.cloneNode(true))}
function updateActiveToc(){if(!content)return;var headings=Array.prototype.slice.call(content.querySelectorAll('h1,h2,h3,h4,h5,h6'));if(!headings.length)return;var active=headings[0];var top=window.scrollY+72;headings.forEach(function(h){if(h.getBoundingClientRect().top+window.scrollY<=top)active=h});[tocList,tocListMobile].forEach(function(list){if(!list)return;list.querySelectorAll('.toc-item').forEach(function(a){a.classList.toggle('active',!!(active&&a.getAttribute('href')==='#'+active.id))})})}
function buildToc(){if(!content)return;var ids={};var items=[];content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h){var text=(h.textContent||'').trim();if(!text)return;var key=slug(text);var count=ids[key]||0;ids[key]=count+1;var id=count>0?key+'-'+count:key;h.id=id;items.push({level:Number(h.tagName.slice(1)),text:text,id:id})});var html=items.map(function(i){var indent=(i.level-1)*12;var size=i.level===1?'14px':'13px';var weight=i.level===1?'600':'400';var color=i.level===1?'#131212':'#8d8e99';return '<a href="#'+i.id+'" class="toc-item" style="padding-left:'+(indent+12)+'px;font-size:'+size+';font-weight:'+weight+';color:'+color+'">'+escapeText(i.text)+'</a>'}).join('');if(tocList)tocList.innerHTML=html;if(tocListMobile)tocListMobile.innerHTML=html;updateActiveToc()}
function bindCopy(){if(!content)return;content.querySelectorAll('pre').forEach(function(p){if(p.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.type='button';b.textContent='复制';b.addEventListener('click',function(){var c=(p.querySelector('code')||{}).textContent||p.textContent||'';var done=function(){b.textContent='已复制';setTimeout(function(){b.textContent='复制'},2000)};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(c).then(done).catch(function(){b.textContent='复制失败'})}else{done()}});p.appendChild(b)})}
function updateTreeIcon(node){var btn=node&&node.querySelector('.tree-toggle:not(:disabled)');var path=btn&&btn.querySelector('.tree-toggle-path');if(path)path.setAttribute('d',node.classList.contains('expanded')?btn.getAttribute('data-expanded-path'):btn.getAttribute('data-collapsed-path'))}
function directChildNodes(node){if(!node)return[];var wrap=null;for(var i=0;i<node.children.length;i++){if(node.children[i].classList&&node.children[i].classList.contains('tree-children')){wrap=node.children[i];break}}if(!wrap)return[];var out=[];for(var j=0;j<wrap.children.length;j++){if(wrap.children[j].classList&&wrap.children[j].classList.contains('tree-node'))out.push(wrap.children[j])}return out}
function resolveId(id){if(id&&sections[id])return id;function firstIn(node){if(!node)return null;var nid=node.getAttribute('data-node-id');if(node.getAttribute('data-previewable')==='1'&&nid&&sections[nid])return nid;var kids=directChildNodes(node);for(var i=0;i<kids.length;i++){var f=firstIn(kids[i]);if(f)return f}return null}if(id){var start=document.querySelector('.tree-node[data-node-id="'+cssEscape(id)+'"]');var from=firstIn(start);if(from)return from}for(var k in sections){if(Object.prototype.hasOwnProperty.call(sections,k))return k}return id}
function selectNode(id,options){options=options||{};var real=resolveId(id);var s=sections[real];if(!s){if(content&&!content.innerHTML.trim())content.innerHTML='<h1>'+escapeText('文档')+'</h1><p>暂无内容</p>';return}if(content)content.innerHTML=s.html||('<h1>'+escapeText(s.name)+'</h1><p>暂无内容</p>');document.querySelectorAll('.tree-item').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-node-id')===real)});document.querySelectorAll('.tree-node[data-node-id="'+cssEscape(real)+'"]').forEach(function(node){var cur=node;while(cur){cur.classList.add('expanded');updateTreeIcon(cur);cur=cur.parentElement?cur.parentElement.closest('.tree-node'):null}});if(mobileTitle)mobileTitle.textContent=s.name||'';buildToc();bindCopy();if(!options.keepNav)closeNav();closeToc();if(!options.skipScroll)window.scrollTo(0,0)}
function onTreeClick(e){var target=e.target;if(!target)return;var toggle=target.closest?target.closest('.tree-toggle'):null;if(toggle){var node=toggle.closest('.tree-node');if(node&&!toggle.disabled){node.classList.toggle('expanded');updateTreeIcon(node);var sid=node.getAttribute('data-node-id');document.querySelectorAll('.tree-node[data-node-id="'+cssEscape(sid)+'"]').forEach(function(n){if(n===node)return;if(node.classList.contains('expanded'))n.classList.add('expanded');else n.classList.remove('expanded');updateTreeIcon(n)})}e.preventDefault();e.stopPropagation();return}var item=target.closest?target.closest('.tree-item'):null;if(item)selectNode(item.getAttribute('data-node-id'))}
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;if(t.closest('.tree-item')||t.closest('.tree-toggle'))onTreeClick(e)});
var menuBtn=document.getElementById('mobile-menu-btn');
var tocBtn=document.getElementById('mobile-toc-btn');
var navClose=document.getElementById('nav-close');
var tocClose=document.getElementById('toc-close');
if(menuBtn)menuBtn.addEventListener('click',function(){syncMobileNavTree();openNav()});
if(tocBtn)tocBtn.addEventListener('click',openToc);
if(navClose)navClose.addEventListener('click',closeNav);
if(tocClose)tocClose.addEventListener('click',closeToc);
if(navMask)navMask.addEventListener('click',closeNav);
if(tocMask)tocMask.addEventListener('click',closeToc);
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('#toc-list-mobile .toc-item'):null;if(a){closeToc()}});
window.addEventListener('scroll',updateActiveToc,{passive:true});
window.addEventListener('resize',function(){if(window.innerWidth>860){closeNav();closeToc()}});
syncMobileNavTree();
function bindAutoHideScrollbar(el){if(!el)return;var t=null;el.addEventListener('scroll',function(){el.classList.add('sb-scrolling');if(t)clearTimeout(t);t=setTimeout(function(){el.classList.remove('sb-scrolling')},700)},{passive:true})}
bindAutoHideScrollbar(sidebarLeft);
selectNode(window.__DOC_INITIAL__,{skipScroll:true,keepNav:true});
}catch(err){try{var c=document.getElementById('doc-content');if(c&&!c.innerHTML.trim())c.innerHTML='<h1>预览加载异常</h1><p>请尝试重新导出或分享。</p>'}catch(e){}}
})();
</script></body></html>`;
};

export const cleanExportHtml = (html: string) => String(html || "")
  .replace(/<p>(\s*<br\s*\/?>\s*)+<\/p>/gi, "")
  .replace(/<p>(&nbsp;|\s)*<\/p>/gi, "")
  .replace(/<p><\/p>/gi, "");

export const headingsToWordParagraphs = (html: string) => {
  const sizes: Record<string, number> = { "1": 22, "2": 18, "3": 15, "4": 14, "5": 14, "6": 14 };
  return String(html || "")
    .replace(/<h([1-6])(\s[^>]*)?>/gi, (_full, level) => `<p style="font-size:${sizes[level] || 14}px;font-weight:700;margin-top:6px!important;margin-bottom:3px!important;line-height:1.3">`)
    .replace(/<\/h[1-6]>/gi, "</p>");
};

export const wordHtmlDocument = (title: string, content: string, options: { skipTitle?: boolean } = {}) => {
  const body = options.skipTitle ? cleanExportHtml(content) : `<h1>${escapeHtml(title || "未命名文档")}</h1>${cleanExportHtml(content)}`;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1F2329}.word-page{width:100%}p{margin:0 0 4px}ul,ol{margin:2px 0 4px;padding-left:22px}li{margin:0}img{max-width:560px;width:auto;height:auto;display:block;margin:4px auto}table{border-collapse:collapse;width:100%;margin:4px 0}th,td{border:1px solid #DDE1E6;padding:4px 8px;text-align:left;vertical-align:top;font-size:13px}th{background:#F5F7FA;font-weight:700}blockquote{border-left:3px solid #005EFF;padding:3px 10px;margin:4px 0;background:#F0F5FF;color:#4E5969}pre{background:#F5F7FA;padding:5px 10px;margin:4px 0;white-space:pre-wrap}code{background:#F2F3F5;padding:1px 3px}hr{border:none;border-top:1px solid #DDE1E6;margin:6px 0}</style></head><body><div class="word-page">${headingsToWordParagraphs(body)}</div></body></html>`;
};

export const pdfPrintHtmlDocument = (title: string, content: string, options: { skipTitle?: boolean } = {}) => {
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
blockquote{border-left:3px solid #134CFF;padding:8px 14px;margin:10px 0;background:#f7f8fa;color:#606266;border-radius:0 8px 8px 0}blockquote p{margin:0 0 4px;line-height:1.65}blockquote p:last-child{margin-bottom:0}
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
