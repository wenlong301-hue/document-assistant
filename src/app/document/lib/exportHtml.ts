import { escapeHtml } from "../../editor/utils/html";
export const cleanExportHtml = (html: string) => String(html || "")
  .replace(/<p>(\s*<br\s*\/?>\s*)+<\/p>/gi, "<p>&nbsp;</p>")
  .replace(/<p>(\s|&nbsp;)*<\/p>/gi, "<p>&nbsp;</p>");

export const headingsToWordParagraphs = (html: string) => {
  const sizes: Record<string, number> = { "1": 22, "2": 18, "3": 15, "4": 14, "5": 14, "6": 14 };
  return String(html || "")
    .replace(/<h([1-6])(\s[^>]*)?>/gi, (_full, level, attrs = "") => {
      const attrText = String(attrs || "");
      const styleMatch = attrText.match(/\sstyle=("[^"]*"|'[^']*')/i);
      const existingStyle = styleMatch ? styleMatch[1].slice(1, -1) : "";
      const otherAttrs = attrText.replace(/\sstyle=("[^"]*"|'[^']*')/i, "");
      const style = `${existingStyle}${existingStyle && !existingStyle.trim().endsWith(";") ? ";" : ""}font-size:${sizes[level] || 14}px;font-weight:700;margin-top:6px!important;margin-bottom:3px!important;line-height:1.3`;
      return `<p${otherAttrs} style="${style}">`;
    })
    .replace(/<\/h[1-6]>/gi, "</p>");
};

export const wordHtmlDocument = (title: string, content: string, options: { skipTitle?: boolean } = {}) => {
  const body = options.skipTitle ? cleanExportHtml(content) : `<h1>${escapeHtml(title || "未命名文档")}</h1>${cleanExportHtml(content)}`;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#131212}.word-page{width:100%}p{margin:0 0 4px}ul,ol{margin:2px 0 4px;padding-left:22px}li{margin:0}img{max-width:560px;width:auto;height:auto;display:block;margin:4px auto}table{border-collapse:collapse;width:100%;margin:4px 0}th,td{border:1px solid #EEF0F5;padding:4px 8px;text-align:left;vertical-align:top;font-size:13px}th{background:#f7f8fa;font-weight:700}blockquote{border-left:3px solid #EBECF0;padding:3px 10px;margin:4px 0;background:transparent;color:#606266}pre{background:#F5F7FA;padding:5px 10px;margin:4px 0;white-space:pre-wrap}code{background:#F2F3F5;padding:1px 3px}hr{border:none;border-top:1px solid #DDE1E6;margin:6px 0}</style></head><body><div class="word-page">${headingsToWordParagraphs(body)}</div></body></html>`;
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
blockquote{border-left:3px solid #EBECF0;padding:2px 12px;margin:6px 0;background:transparent;color:#606266;border-radius:0}blockquote p{margin:0;line-height:1.8}blockquote p:last-child{margin-bottom:0}
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
