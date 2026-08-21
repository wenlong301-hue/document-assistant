import type { DocContentMap, OutlineNode, PreviewSection } from "../types";
import {
  emptyParagraph,
  escapeHtml,
  escapeScriptJson,
} from "../../editor/utils/html";
import { hasDiagramBlocks, renderDiagramsInHtml } from "../../editor/utils/diagrams";
import { hasMermaidBlocks, renderMermaidInHtml } from "../../editor/utils/mermaid";
import { docContentCss, docContentCssMobile } from "../documentContentCss";
import {
  flattenOutlineNodes,
  isNodePreviewable,
  outlineCollapsedIconPath,
  outlineExpandedIconPath,
  resolvePreviewNodeId,
} from "./docModel";
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

/** 将各 section 内图表代码块预渲染为 SVG，供分享/导出离线展示 */
export const hydratePreviewSections = async (sections: PreviewSection[]): Promise<PreviewSection[]> => {
  if (!sections.length) return sections;
  const need = sections.some((section) => hasMermaidBlocks(section.html) || hasDiagramBlocks(section.html));
  if (!need) return sections;
  return Promise.all(sections.map(async (section) => {
    let html = section.html;
    if (hasMermaidBlocks(html)) html = await renderMermaidInHtml(html);
    if (hasDiagramBlocks(html)) html = await renderDiagramsInHtml(html);
    return { ...section, html };
  }));
};

export const buildPreviewHtmlAsync = async (
  title: string,
  sections: PreviewSection[],
  outlineTree?: OutlineNode[],
  initialNodeId?: string,
  contentMap?: DocContentMap,
) => buildPreviewHtml(title, await hydratePreviewSections(sections), outlineTree, initialNodeId, contentMap);

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
.content{overflow:visible;padding:48px 0 96px;height:auto;max-width:820px;width:100%;margin:0 auto;min-width:0;word-wrap:break-word;overflow-wrap:anywhere;font-size:15px;line-height:1.8;color:#131212}
${docContentCss(".content")}
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
  ${docContentCssMobile(".content")}
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
function buildToc(){if(!content)return;var ids={};var items=[];content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h){var text=(h.textContent||'').trim();if(!text)return;var base=h.getAttribute('id')||slug(text);var count=ids[base]||0;ids[base]=count+1;var id=count>0?base+'-'+count:base;h.id=id;items.push({level:Number(h.tagName.slice(1)),text:text,id:id})});var html=items.map(function(i){var indent=(i.level-1)*12;var size=i.level===1?'14px':'13px';var weight=i.level===1?'600':'400';var color=i.level===1?'#131212':'#8d8e99';return '<a href="#'+i.id+'" class="toc-item" style="padding-left:'+(indent+12)+'px;font-size:'+size+';font-weight:'+weight+';color:'+color+'">'+escapeText(i.text)+'</a>'}).join('');if(tocList)tocList.innerHTML=html;if(tocListMobile)tocListMobile.innerHTML=html;updateActiveToc()}
function copyText(text){var value=String(text==null?'':text);if(navigator.clipboard&&navigator.clipboard.writeText&&window.isSecureContext){return navigator.clipboard.writeText(value).then(function(){return true}).catch(function(){return copyTextFallback(value)})}return Promise.resolve(copyTextFallback(value))}
function copyTextFallback(text){try{var ta=document.createElement('textarea');ta.value=String(text==null?'':text);ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0';document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);var ok=document.execCommand('copy');document.body.removeChild(ta);return !!ok}catch(e){return false}}
function bindCopy(){if(!content)return;content.querySelectorAll('pre').forEach(function(p){if(p.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.type='button';b.textContent='复制';b.addEventListener('click',function(){var codeEl=p.querySelector('code');var c=codeEl?codeEl.textContent:(function(){var clone=p.cloneNode(true);var btn=clone.querySelector('.copy-btn');if(btn)btn.remove();return clone.textContent||''})();copyText(c).then(function(ok){b.textContent=ok?'已复制':'复制失败';setTimeout(function(){b.textContent='复制'},2000)})});p.appendChild(b)})}
function updateTreeIcon(node){var btn=node&&node.querySelector('.tree-toggle:not(:disabled)');var path=btn&&btn.querySelector('.tree-toggle-path');if(path)path.setAttribute('d',node.classList.contains('expanded')?btn.getAttribute('data-expanded-path'):btn.getAttribute('data-collapsed-path'))}
function directChildNodes(node){if(!node)return[];var wrap=null;for(var i=0;i<node.children.length;i++){if(node.children[i].classList&&node.children[i].classList.contains('tree-children')){wrap=node.children[i];break}}if(!wrap)return[];var out=[];for(var j=0;j<wrap.children.length;j++){if(wrap.children[j].classList&&wrap.children[j].classList.contains('tree-node'))out.push(wrap.children[j])}return out}
function resolveId(id){if(id&&sections[id])return id;function firstIn(node){if(!node)return null;var nid=node.getAttribute('data-node-id');if(node.getAttribute('data-previewable')==='1'&&nid&&sections[nid])return nid;var kids=directChildNodes(node);for(var i=0;i<kids.length;i++){var f=firstIn(kids[i]);if(f)return f}return null}if(id){var start=document.querySelector('.tree-node[data-node-id="'+cssEscape(id)+'"]');var from=firstIn(start);if(from)return from}for(var k in sections){if(Object.prototype.hasOwnProperty.call(sections,k))return k}return id}
function scrollToAnchor(anchor){if(!anchor)return false;var target=document.getElementById(anchor);if(!target)return false;var top=target.getBoundingClientRect().top+window.scrollY-20;window.scrollTo({top:Math.max(0,top),behavior:'smooth'});return true}
function selectNode(id,options){options=options||{};var real=resolveId(id);var s=sections[real];if(!s){if(content&&!content.innerHTML.trim())content.innerHTML='<h1>'+escapeText('文档')+'</h1><p>暂无内容</p>';return}if(content)content.innerHTML=s.html||('<h1>'+escapeText(s.name)+'</h1><p>暂无内容</p>');document.querySelectorAll('.tree-item').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-node-id')===real)});document.querySelectorAll('.tree-node[data-node-id="'+cssEscape(real)+'"]').forEach(function(node){var cur=node;while(cur){cur.classList.add('expanded');updateTreeIcon(cur);cur=cur.parentElement?cur.parentElement.closest('.tree-node'):null}});if(mobileTitle)mobileTitle.textContent=s.name||'';buildToc();bindCopy();if(!options.keepNav)closeNav();closeToc();if(options.anchor){setTimeout(function(){if(!scrollToAnchor(options.anchor)&&!options.skipScroll)window.scrollTo(0,0)},0)}else if(!options.skipScroll)window.scrollTo(0,0)}
function onTreeClick(e){var target=e.target;if(!target)return;var toggle=target.closest?target.closest('.tree-toggle'):null;if(toggle){var node=toggle.closest('.tree-node');if(node&&!toggle.disabled){node.classList.toggle('expanded');updateTreeIcon(node);var sid=node.getAttribute('data-node-id');document.querySelectorAll('.tree-node[data-node-id="'+cssEscape(sid)+'"]').forEach(function(n){if(n===node)return;if(node.classList.contains('expanded'))n.classList.add('expanded');else n.classList.remove('expanded');updateTreeIcon(n)})}e.preventDefault();e.stopPropagation();return}var item=target.closest?target.closest('.tree-item'):null;if(item)selectNode(item.getAttribute('data-node-id'))}
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;if(t.closest('.tree-item')||t.closest('.tree-toggle'))onTreeClick(e)});
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a||!content||!content.contains(a))return;var href=a.getAttribute('href')||'';var url=null;try{url=new URL(href,window.location.href)}catch(err){return}var node=url.searchParams.get('node');var anchor=url.hash?decodeURIComponent(url.hash.slice(1)):'';if(node&&sections[resolveId(node)]){e.preventDefault();selectNode(node,{anchor:anchor});return}if(!node&&href.charAt(0)==='#'&&anchor){e.preventDefault();scrollToAnchor(anchor)}});
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
