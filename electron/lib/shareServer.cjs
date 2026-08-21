'use strict';

const http = require('http');
const { buildSharePage, buildDocViewPage } = require('./sharePages.cjs');

function createShareServer({ getAllDocs, getDocContent }) {
  let shareServer = null;
  let activeShareDocId = null;
  let activeShareHtml = null;
  let activeShareVersion = 0;

  function setActiveShareHtml(html) {
    if (html == null) return;
    const next = String(html);
    if (next === activeShareHtml) return;
    activeShareHtml = next;
    activeShareVersion += 1;
  }

  function injectShareLiveReload(html, version) {
    const ver = Number(version) || 0;
    const snippet = `<script data-share-live-reload>
(function(){
  var current=${ver};
  function activeNode(){
    var el=document.querySelector('.tree-item.active');
    return el?el.getAttribute('data-node-id')||'':'';
  }
  function findTreeItem(id){
    if(!id)return null;
    var items=document.querySelectorAll('.tree-item');
    for(var i=0;i<items.length;i++){
      if(items[i].getAttribute('data-node-id')===id)return items[i];
    }
    return null;
  }
  function restoreView(){
    try{
      var n=sessionStorage.getItem('da-share-node');
      var s=sessionStorage.getItem('da-share-scroll');
      if(!n&&s==null)return;
      sessionStorage.removeItem('da-share-node');
      sessionStorage.removeItem('da-share-scroll');
      setTimeout(function(){
        try{
          var item=findTreeItem(n);
          if(item)item.click();
          if(s!=null)window.scrollTo(0,Number(s)||0);
        }catch(e){}
      },60);
    }catch(e){}
  }
  restoreView();
  setInterval(function(){
    fetch('/share-version',{cache:'no-store'})
      .then(function(r){return r.json()})
      .then(function(d){
        if(!d||d.version==null||Number(d.version)===current)return;
        try{
          sessionStorage.setItem('da-share-node',activeNode());
          sessionStorage.setItem('da-share-scroll',String(window.scrollY||0));
        }catch(e){}
        location.reload();
      })
      .catch(function(){});
  },1500);
})();
</script>`;
    const source = String(html || '');
    // 已注入过时替换整段脚本，确保 version 与当前 activeShareVersion 一致
    if (source.includes('data-share-live-reload')) {
      return source.replace(/<script data-share-live-reload>[\s\S]*?<\/script>/, snippet);
    }
    if (source.includes('</body>')) return source.replace('</body>', `${snippet}</body>`);
    return `${source}${snippet}`;
  }

  function respondWithDoc(res, docId) {
    // 正在分享的文档优先用内存 HTML（含未落盘编辑），避免 /view 读到磁盘旧 .mdoc
    if (activeShareHtml && activeShareDocId && String(docId) === String(activeShareDocId)) {
      return respondWithActiveShare(res);
    }
    const doc = getDocContent(docId);
    if (doc) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.end(buildDocViewPage(doc));
      return true;
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>文档未找到</h1>');
    return false;
  }

  function respondWithActiveShare(res) {
    if (!activeShareHtml) return false;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.end(injectShareLiveReload(activeShareHtml, activeShareVersion));
    return true;
  }

  function respondWithShareVersion(res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.end(JSON.stringify({ version: activeShareVersion, docId: activeShareDocId || null }));
    return true;
  }

  async function startShareServer(port = 6535, docId = null, html = null) {
    if (docId) activeShareDocId = docId;
    if (html != null) setActiveShareHtml(html);
    if (shareServer?.listening) {
      const bound = shareServer.address()?.port || port;
      return { server: shareServer, port: bound };
    }
    const preferred = Number(port) || 6535;
    const tryPorts = [preferred];
    for (let p = preferred + 1; p < preferred + 20; p++) tryPorts.push(p);
    tryPorts.push(0);

    const createOnce = (listenPort) => new Promise((resolve, reject) => {
      shareServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        const boundPort = shareServer?.address()?.port || listenPort || preferred;
        const url = new URL(req.url, `http://localhost:${boundPort}`);
        const viewMatch = url.pathname.match(/^\/view\/(.+)$/);
        if (url.pathname === '/share-version') {
          respondWithShareVersion(res);
          return;
        }
        if (viewMatch) {
          respondWithDoc(res, decodeURIComponent(viewMatch[1]));
          return;
        }
        if (url.pathname === '/' || url.pathname === '') {
          if (respondWithActiveShare(res)) return;
          if (activeShareDocId) {
            respondWithDoc(res, activeShareDocId);
            return;
          }
          const docs = getAllDocs();
          if (docs.length === 1) {
            respondWithDoc(res, docs[0].id);
            return;
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(buildSharePage(docs));
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>页面未找到</h1>');
      });
      const cleanup = () => {
        shareServer?.off('listening', onListening);
        shareServer?.off('error', onError);
      };
      const onListening = () => {
        cleanup();
        const bound = shareServer.address()?.port || listenPort;
        resolve({ server: shareServer, port: bound });
      };
      const onError = (error) => {
        cleanup();
        try { shareServer?.close(); } catch {}
        shareServer = null;
        reject(error);
      };
      shareServer.once('listening', onListening);
      shareServer.once('error', onError);
      shareServer.listen(listenPort, '0.0.0.0');
    });

    let lastError = null;
    for (const p of tryPorts) {
      try {
        return await createOnce(p);
      } catch (error) {
        lastError = error;
        if (error && error.code === 'EADDRINUSE') continue;
        throw error;
      }
    }
    throw lastError || new Error('EADDRINUSE');
  }

  function stopShareServer() {
    if (shareServer) { try { shareServer.close(); } catch {} shareServer = null; }
    activeShareDocId = null;
    activeShareHtml = null;
    activeShareVersion = 0;
  }

  return {
    setActiveShareHtml,
    injectShareLiveReload,
    startShareServer,
    stopShareServer,
    getActiveShareDocId: () => activeShareDocId,
    setActiveShareDocId: (id) => { activeShareDocId = id; },
    getActiveShareVersion: () => activeShareVersion,
  };
}

module.exports = { createShareServer };
