import DOMPurify from "dompurify";
import { marked } from "marked";

/** 必须是真正空段落：勿写 <p><br></p>，否则 TipTap 会解析成 hardBreak，Placeholder 不显示 */
export const emptyParagraph = "<p></p>";
export const MAX_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_EMBED_BYTES = 4 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const sanitizeHtml = (html: string) => DOMPurify.sanitize(html || emptyParagraph, {
  USE_PROFILES: { html: true },
  ADD_TAGS: ["iframe", "video", "source", "svg", "path", "g", "defs", "marker", "use", "foreignObject", "text", "tspan", "rect", "circle", "ellipse", "line", "polyline", "polygon", "clipPath", "linearGradient", "radialGradient", "stop"],
  ADD_ATTR: ["style", "class", "id", "target", "rel", "download", "checked", "data-type", "data-checked", "data-indent", "data-row-height", "data-attachment", "data-file-name", "data-file-size", "data-file-type", "data-mermaid-source", "data-language", "controls", "src", "href", "width", "height", "colspan", "rowspan", "poster", "preload", "playsinline", "viewBox", "xmlns", "fill", "stroke", "stroke-width", "d", "points", "transform", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "dx", "dy", "marker-end", "marker-start", "markerWidth", "markerHeight", "orient", "refX", "refY", "preserveAspectRatio"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:(?:image|video|audio|application)\/|data:text\/plain|manual-doc:|#)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
}) || emptyParagraph;

/** 无可见文本/媒体时视为空，统一成单空段落以便 Placeholder 显示 */
export const isVisuallyEmptyHtml = (html?: string) => {
  const s = String(html || "").trim();
  if (!s) return true;
  if (/<(img|video|iframe|table|hr|input|svg|canvas|audio|source|embed|object)\b/i.test(s)) return false;
  if (/data-(?:type|attachment|file-name)=/i.test(s)) return false;
  const text = s
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, "")
    .trim();
  return !text;
};

export const normalizeEditorHtml = (html?: string) => {
  const cleaned = sanitizeHtml(html || emptyParagraph);
  return isVisuallyEmptyHtml(cleaned) ? emptyParagraph : cleaned;
};

export const fileToDataUrl = (file: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("文件读取失败"));
  reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
  reader.onabort = () => reject(new Error("文件读取已取消"));
  reader.readAsDataURL(file);
});

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片压缩失败")), type, quality);
});

export const compressImageForEmbed = async (file: File) => {
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

export const formatFileSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const mergeHtmlAttrs = (...attrsList: Record<string, any>[]) => attrsList.reduce((merged, attrs) => {
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value == null) return;
    if (key === "class" && merged.class) merged.class = `${merged.class} ${value}`;
    else if (key === "style" && merged.style) merged.style = `${merged.style};${value}`;
    else merged[key] = value;
  });
  return merged;
}, {} as Record<string, any>);

export const getPlainTextFromHtml = (html: string, options: { preserveWhitespace?: boolean } = {}) => {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  if (options.preserveWhitespace) {
    // txt 导入结构是 <pre><code>…</code></pre>：原样取文本，保留空格/空行/行尾空白
    const preBlocks = Array.from(doc.body.querySelectorAll("pre"));
    if (preBlocks.length > 0) {
      return preBlocks.map((node) => {
        const code = node.querySelector("code");
        return (code?.textContent ?? node.textContent ?? "").replace(/\u00a0/g, " ");
      }).join("\n\n");
    }
  }
  doc.body.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  doc.body.querySelectorAll("p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre,tr").forEach((node) => {
    node.appendChild(doc.createTextNode("\n"));
  });
  const text = (doc.body.textContent || "").replace(/\u00a0/g, " ");
  return options.preserveWhitespace
    ? text.replace(/\n$/, "")
    : text.replace(/[ \t]+\n/g, "\n").trim();
};

export const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

export const escapeScriptJson = (value: unknown) => JSON.stringify(value)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

export const textToHtml = (text: string) => text
  .split(/\n/)
  .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
  .join("") || emptyParagraph;

export const textToPlainTextHtml = (text: string) => `<pre><code>${escapeHtml(String(text || "").replace(/^\uFEFF/, ""))}</code></pre>`;

export const markdownToSimpleHtml = (text: string) => sanitizeHtml(marked.parse(text, { async: false }) as string || emptyParagraph);

export const sanitizeFileName = (name: string) => (name || "文档").replace(/[\\/:*?"<>|]/g, "_").trim() || "文档";
