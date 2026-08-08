import type { DocContentMap, OutlineNode, PreviewSection, StoredDoc, WebPersistedState } from "./types";
import {
  emptyParagraph,
  escapeHtml,
  escapeScriptJson,
  markdownToSimpleHtml,
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
