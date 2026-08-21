'use strict';

const { escapeHtml, escapeScriptJson } = require('./htmlEscape.cjs');

function buildSharePage(docs) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文档助手 - 分享</title><style>
:root{--primary:#134CFF;--gray-50:#F3F5FA;--gray-100:#EEF0F5;--gray-200:#DFE0E6;--gray-400:#9FA0A6;--gray-500:#707277}*{box-sizing:border-box}body{margin:0;font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8fa;color:#131212;line-height:1.6}.header{background:#fff;border-bottom:1px solid #ebecf0;height:56px;display:flex;align-items:center}.header-inner{max-width:920px;width:100%;margin:0 auto;padding:0 24px;display:flex;align-items:center;gap:12px}.brand{font-size:15px;font-weight:600;color:#131212}.status{font-size:12px;color:#8d8e99;padding-left:12px;border-left:1px solid #ebecf0}.wrap{max-width:920px;margin:0 auto;padding:40px 24px}.page-title{font-size:22px;font-weight:600;margin:0 0 24px;color:#131212}.doc-list{display:flex;flex-direction:column;gap:8px}.doc{display:flex;align-items:center;justify-content:space-between;border:1px solid #ebecf0;border-radius:10px;padding:18px 20px;background:#fff;cursor:pointer;transition:border-color .2s,box-shadow .2s;text-decoration:none}.doc:hover{border-color:#dfe1e8;box-shadow:0 2px 8px rgba(0,0,0,.04)}.doc-info{min-width:0}.doc-name{font-size:15px;font-weight:500;color:#131212;margin:0 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.doc-meta{font-size:13px;color:#8d8e99;margin:0}.doc-arrow{color:#c0c4cc;font-size:20px;flex-shrink:0;margin-left:12px}.footer{color:#8d8e99;font-size:13px;margin-top:28px;padding:16px 0 0;border-top:1px solid #ebecf0}@media(max-width:640px){.wrap{padding:24px 16px}.doc{padding:14px 16px}}
</style></head><body><header class="header"><div class="header-inner"><span class="brand">文档助手</span><span class="status">分享</span></div></header><main class="wrap"><h1 class="page-title">分享列表</h1><div class="doc-list">${docs.map(d => `<a href="/view/${encodeURIComponent(d.id)}" class="doc"><div class="doc-info"><p class="doc-name">${escapeHtml(d.name)}</p><p class="doc-meta">更新于 ${d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '未知'}</p></div><span class="doc-arrow">&#8250;</span></a>`).join('')}</div><p class="footer">当前共 ${docs.length} 个文档</p></main></body></html>`;
}

const OUTLINE_EXPANDED_ICON_PATH = 'M8.47261 5.89815C8.72718 5.68601 8.76157 5.30768 8.54943 5.05311C8.3373 4.79854 7.95896 4.76415 7.70439 4.97629L8.0885 5.43722L8.47261 5.89815ZM6.09975 7.09451L5.71564 7.55545C5.93815 7.74087 6.26135 7.74087 6.48386 7.55545L6.09975 7.09451ZM4.49511 4.97629C4.24054 4.76415 3.8622 4.79854 3.65006 5.05311C3.43793 5.30767 3.47232 5.68601 3.72689 5.89815L4.111 5.43722L4.49511 4.97629ZM8.0885 5.43722L7.70439 4.97629L5.71564 6.63358L6.09975 7.09451L6.48386 7.55545L8.47261 5.89815L8.0885 5.43722ZM6.09975 7.09451L6.48386 6.63358L4.49511 4.97629L4.111 5.43722L3.72689 5.89815L5.71564 7.55545L6.09975 7.09451ZM10.5 6H9.9C9.9 8.15391 8.15391 9.9 6 9.9V10.5V11.1C8.81665 11.1 11.1 8.81665 11.1 6H10.5ZM6 10.5V9.9C3.84609 9.9 2.1 8.15391 2.1 6H1.5H0.9C0.9 8.81665 3.18335 11.1 6 11.1V10.5ZM1.5 6H2.1C2.1 3.84609 3.84609 2.1 6 2.1V1.5V0.9C3.18335 0.9 0.9 3.18335 0.9 6H1.5ZM6 1.5V2.1C8.15391 2.1 9.9 3.84609 9.9 6H10.5H11.1C11.1 3.18335 8.81665 0.9 6 0.9V1.5Z';
const OUTLINE_COLLAPSED_ICON_PATH = 'M5.89815 3.52739C5.68601 3.27282 5.30768 3.23843 5.05311 3.45057C4.79854 3.6627 4.76415 4.04104 4.97629 4.29561L5.43722 3.9115L5.89815 3.52739ZM7.09451 5.90025L7.55545 6.28436C7.74087 6.06185 7.74087 5.73865 7.55545 5.51614L7.09451 5.90025ZM4.97629 7.50489C4.76415 7.75946 4.79854 8.1378 5.05311 8.34994C5.30767 8.56207 5.68601 8.52768 5.89815 8.27311L5.43722 7.889L4.97629 7.50489ZM5.43722 3.9115L4.97629 4.29561L6.63358 6.28436L7.09451 5.90025L7.55545 5.51614L5.89815 3.52739L5.43722 3.9115ZM7.09451 5.90025L6.63358 5.51614L4.97629 7.50489L5.43722 7.889L5.89815 8.27311L7.55545 6.28436L7.09451 5.90025ZM6 1.5V2.1C8.15391 2.1 9.9 3.84609 9.9 6H10.5H11.1C11.1 3.18335 8.81665 0.9 6 0.9V1.5ZM10.5 6H9.9C9.9 8.15391 8.15391 9.9 6 9.9V10.5V11.1C8.81665 11.1 11.1 8.81665 11.1 6H10.5ZM6 10.5V9.9C3.84609 9.9 2.1 8.15391 2.1 6H1.5H0.9C0.9 8.81665 3.18335 11.1 6 11.1V10.5ZM1.5 6H2.1C2.1 3.84609 3.84609 2.1 6 2.1V1.5V0.9C3.18335 0.9 0.9 3.18335 0.9 6H1.5Z';

function flattenNodes(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap(node => [node, ...flattenNodes(node.children)]);
}

function isHtmlContentEmpty(html) {
  return !String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function isNodePreviewable(node, contentMap) {
  return node && node.includeInPreview !== false && !isHtmlContentEmpty(contentMap?.[node.id]);
}

function getFirstPreviewableNode(nodes, contentMap) {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (isNodePreviewable(node, contentMap)) return node;
    const found = getFirstPreviewableNode(node.children || [], contentMap);
    if (found) return found;
  }
  return null;
}

function findOutlineNode(nodes, id) {
  if (!Array.isArray(nodes)) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findOutlineNode(n.children || [], id);
    if (found) return found;
  }
  return null;
}

function resolvePreviewNodeId(nodes, nodeId, contentMap) {
  if (!nodeId) return getFirstPreviewableNode(nodes, contentMap)?.id || nodes?.[0]?.id || 'root';
  const node = findOutlineNode(nodes, nodeId);
  if (!node) return getFirstPreviewableNode(nodes, contentMap)?.id || nodeId;
  if (isNodePreviewable(node, contentMap)) return node.id;
  const inSubtree = getFirstPreviewableNode(node.children || [], contentMap);
  if (inSubtree) return inSubtree.id;
  return getFirstPreviewableNode(nodes, contentMap)?.id || node.id;
}

function buildStoredDocHtml(doc) {
  if (doc.html) return doc.html;
  if (typeof doc.content === 'string') return doc.content;
  if (Array.isArray(doc.children) && doc.content && typeof doc.content === 'object') {
    const parts = flattenNodes(doc.children)
      .filter(node => isNodePreviewable(node, doc.content))
      .map(node => {
        const body = doc.content[node.id] || '<p><br></p>';
        return `<h1>${escapeHtml(node.name || '未命名文件')}</h1>${body}`;
      });
    return parts.join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n');
  }
  return `<h1>${escapeHtml(doc.name || doc.title || '未命名文档')}</h1>`;
}

function buildDocSections(doc) {
  if (!Array.isArray(doc.children) || !doc.content || typeof doc.content !== 'object') {
    return [{ id: 'root', name: doc.name || doc.title || '未命名文档', html: buildStoredDocHtml(doc) }];
  }
  return flattenNodes(doc.children)
    .filter(node => isNodePreviewable(node, doc.content))
    .map(node => {
      const html = doc.content[node.id] || '<p><br></p>';
      return {
        id: node.id,
        name: node.name || '未命名文件',
        html: String(html).trim().startsWith('<h1') ? html : `<h1>${escapeHtml(node.name || '未命名文件')}</h1>${html}`,
      };
    });
}

function buildDocViewPage(doc) {
  const title = doc.name || doc.title || '文档助手';
  const sections = buildDocSections(doc);
  const sectionMap = sections.reduce((acc, section) => {
    acc[section.id] = section;
    return acc;
  }, {});
  const initialNodeId = resolvePreviewNodeId(doc.children || [], sections[0]?.id, doc.content);
  const fallbackHtml = sectionMap[initialNodeId]?.html || sections[0]?.html || `<h1>${escapeHtml(title)}</h1><p>暂无内容</p>`;

  const buildTreeHtml = (nodes, depth = 0) => {
    if (!Array.isArray(nodes)) return '';
    return nodes.map(n => {
      const indent = depth * 16;
      const hasChildren = n.children && n.children.length > 0;
      const childrenHtml = hasChildren ? `<div class="tree-children">${buildTreeHtml(n.children, depth + 1)}</div>` : '';
      const toggleIcon = hasChildren ? `<svg class="tree-toggle-icon" fill="none" viewBox="0 0 12 12"><path class="tree-toggle-path" d="${OUTLINE_COLLAPSED_ICON_PATH}" fill="currentColor"></path></svg>` : '';
      const previewable = isNodePreviewable(n, doc.content) ? '1' : '0';
      return `<div class="tree-node" data-node-id="${escapeHtml(n.id)}" data-previewable="${previewable}"><div class="tree-item" data-node-id="${escapeHtml(n.id)}" data-previewable="${previewable}" style="padding-left:${indent + 12}px"><button class="tree-toggle" type="button" aria-label="展开或收起" data-expanded-path="${OUTLINE_EXPANDED_ICON_PATH}" data-collapsed-path="${OUTLINE_COLLAPSED_ICON_PATH}" ${hasChildren ? '' : 'disabled'}>${toggleIcon}</button><span class="tree-name">${escapeHtml(n.name || '未命名')}</span></div>${childrenHtml}</div>`;
    }).join('');
  };
  const hasTree = !!(doc.children && doc.children.length > 0);
  const docTreeHtml = hasTree
    ? `<div class="doc-tree"><div class="tree-header">${escapeHtml(title)}</div>${buildTreeHtml(doc.children)}</div>`
    : '';
  const initialTitle = sectionMap[initialNodeId]?.name || sections[0]?.name || title;

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(title)} - 文档助手</title><style>
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
.content ul,.content ol{padding-left:24px;margin:12px 0}.content li{font-size:15px;line-height:1.8;margin:4px 0}
.content ul[data-type="taskList"],.content ul.doc-task-list{list-style:none;padding-left:0;margin:12px 0}
.content li[data-type="taskItem"],.content li.doc-task-item{list-style:none;display:flex;gap:8px;align-items:flex-start;margin:4px 0;padding-left:0}
.content li[data-type="taskItem"]>label,.content li.doc-task-item>label{margin-top:2px;flex-shrink:0}
.content li[data-type="taskItem"]>div,.content li.doc-task-item>div{flex:1;min-width:0}
.content li[data-type="taskItem"]>div>p,.content li.doc-task-item>div>p{margin:0}
.content [data-task-item="true"]{display:flex;align-items:flex-start;gap:8px;margin:4px 0;list-style:none}
.content table{border-collapse:collapse;width:100%;margin:16px 0;display:block;overflow-x:auto}.content td,.content th{border:1px solid #eef0f5;padding:10px 14px;text-align:left;font-size:14px}.content tr:nth-child(odd) td,.content tr:nth-child(odd) th{background:rgba(238,240,245,.502)}
.content img{max-width:100%;border-radius:8px;border:1px solid #ebecf0}.content blockquote{border-left:3px solid #EBECF0;background:transparent;margin:10px 0;padding:10px 16px;color:#606266;border-radius:0}.content blockquote p{margin:0 0 4px;line-height:1.65}.content blockquote p:last-child{margin-bottom:0}
.content pre{background:#f5f6f8;border:1px solid #ebecf0;border-radius:12px;padding:20px 24px;overflow-x:auto;font-size:13px;line-height:1.7;position:relative;margin:16px 0}.content pre code{font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.7}.content hr{border:none;border-top:1px solid #ebecf0;margin:24px 0}
.copy-btn{position:absolute;top:8px;right:8px;z-index:2;height:26px;padding:0 10px;border:none;border-radius:6px;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);color:#707277;font-size:12px;cursor:pointer;display:none;align-items:center;font-family:inherit;transition:color .15s}.content pre:hover .copy-btn{display:flex}.copy-btn:hover{color:#131212;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.sidebar-right{overflow-y:auto;padding:48px 0 0;position:sticky;top:28px;align-self:start;max-height:calc(100vh - 56px);scrollbar-width:none}.sidebar-right::-webkit-scrollbar{display:none}
.toc-header{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#131212;padding:0 12px 12px}.toc-hamburger{font-size:14px;color:#8d8e99}.toc-item{display:block;line-height:1.8;text-decoration:none;padding:4px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s}.toc-item:hover{color:#131212!important}.toc-item.active{color:#134CFF!important;font-weight:600!important}
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
window.__DOC_INITIAL__=${escapeScriptJson(initialNodeId)};
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
function copyText(text){var value=String(text==null?'':text);if(navigator.clipboard&&navigator.clipboard.writeText&&window.isSecureContext){return navigator.clipboard.writeText(value).then(function(){return true}).catch(function(){return copyTextFallback(value)})}return Promise.resolve(copyTextFallback(value))}
function copyTextFallback(text){try{var ta=document.createElement('textarea');ta.value=String(text==null?'':text);ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0';document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);var ok=document.execCommand('copy');document.body.removeChild(ta);return !!ok}catch(e){return false}}
function bindCopy(){if(!content)return;content.querySelectorAll('pre').forEach(function(p){if(p.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.type='button';b.textContent='复制';b.addEventListener('click',function(){var codeEl=p.querySelector('code');var c=codeEl?codeEl.textContent:(function(){var clone=p.cloneNode(true);var btn=clone.querySelector('.copy-btn');if(btn)btn.remove();return clone.textContent||''})();copyText(c).then(function(ok){b.textContent=ok?'已复制':'复制失败';setTimeout(function(){b.textContent='复制'},2000)})});p.appendChild(b)})}
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
}

module.exports = {
  OUTLINE_EXPANDED_ICON_PATH,
  OUTLINE_COLLAPSED_ICON_PATH,
  flattenNodes,
  isHtmlContentEmpty,
  isNodePreviewable,
  getFirstPreviewableNode,
  findOutlineNode,
  resolvePreviewNodeId,
  buildStoredDocHtml,
  buildDocSections,
  buildSharePage,
  buildDocViewPage,
};
