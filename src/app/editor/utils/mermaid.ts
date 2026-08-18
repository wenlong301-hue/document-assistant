let initialized = false;
let mermaidModule: typeof import("mermaid") | null = null;

const MERMAID_LANG_RE = /(?:^|\s)language-mermaid(?:\s|$)/i;

async function loadMermaid() {
  if (!mermaidModule) {
    mermaidModule = await import("mermaid");
  }
  const mermaid = mermaidModule.default;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
      fontFamily: "PingFang SC, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    });
    initialized = true;
  }
  return mermaid;
}

function isMermaidBlock(pre: Element, code: Element): boolean {
  const cls = `${pre.getAttribute("class") || ""} ${code.getAttribute("class") || ""}`;
  if (MERMAID_LANG_RE.test(cls) || /language-mermaid/i.test(cls)) return true;
  if (code.getAttribute("data-language") === "mermaid" || pre.getAttribute("data-language") === "mermaid") return true;
  return false;
}

function collectMermaidBlocks(root: ParentNode): Array<{ pre: HTMLElement; code: HTMLElement; source: string }> {
  const found: Array<{ pre: HTMLElement; code: HTMLElement; source: string }> = [];
  root.querySelectorAll("pre").forEach((pre) => {
    if ((pre as HTMLElement).dataset.mermaidRendered === "1") return;
    const code = (pre.querySelector("code") || pre) as HTMLElement;
    if (!isMermaidBlock(pre, code)) return;
    const source = (code.textContent || "").replace(/\u00a0/g, " ").trimEnd();
    if (!source.trim()) return;
    found.push({ pre: pre as HTMLElement, code, source });
  });
  return found;
}

async function renderOne(source: string, id: string): Promise<string> {
  const mermaid = await loadMermaid();
  const { svg } = await mermaid.render(id, source);
  return svg;
}

/** 供编辑器 NodeView 直接渲染单段 Mermaid 源码 */
export async function renderMermaidSourceToSvg(source: string): Promise<string> {
  const id = `mermaid-src-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return renderOne(source, id);
}

/** 在已挂载的 DOM 根节点内把 mermaid 代码块渲染成图 */
export async function renderMermaidInElement(root: HTMLElement | null | undefined) {
  if (!root || typeof document === "undefined") return;
  if (!root.querySelector("pre")) return;
  const blocks = collectMermaidBlocks(root);
  if (!blocks.length) return;
  await Promise.all(blocks.map(async ({ pre, source }, index) => {
    try {
      const id = `mermaid-el-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
      const svg = await renderOne(source, id);
      const wrap = document.createElement("div");
      wrap.className = "mermaid-diagram";
      wrap.dataset.mermaidSource = source;
      wrap.innerHTML = svg;
      const svgEl = wrap.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("height");
        svgEl.style.maxWidth = "100%";
        svgEl.style.height = "auto";
        svgEl.style.display = "block";
        svgEl.style.margin = "0 auto";
      }
      pre.replaceWith(wrap);
    } catch (error) {
      pre.dataset.mermaidRendered = "1";
      pre.classList.add("mermaid-error");
      const msg = document.createElement("div");
      msg.className = "mermaid-error-msg";
      msg.textContent = `Mermaid 渲染失败：${error instanceof Error ? error.message : "语法错误"}`;
      pre.parentElement?.insertBefore(msg, pre);
    }
  }));
}

/** 把 HTML 字符串中的 mermaid 代码块预渲染为 SVG（用于分享/导出） */
export async function renderMermaidInHtml(html: string): Promise<string> {
  if (!html || !/language-mermaid/i.test(html)) return html;
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div id="__mmd_root__">${html}</div>`, "text/html");
  const root = doc.getElementById("__mmd_root__");
  if (!root) return html;
  const blocks = collectMermaidBlocks(root);
  if (!blocks.length) return html;
  for (let index = 0; index < blocks.length; index++) {
    const { pre, source } = blocks[index];
    try {
      const id = `mermaid-html-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
      const svg = await renderOne(source, id);
      const wrap = doc.createElement("div");
      wrap.className = "mermaid-diagram";
      wrap.setAttribute("data-mermaid-source", source);
      wrap.innerHTML = svg;
      const svgEl = wrap.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("height");
        svgEl.setAttribute("style", "max-width:100%;height:auto;display:block;margin:0 auto");
      }
      pre.replaceWith(wrap);
    } catch {
      // 保留源码块
    }
  }
  return root.innerHTML;
}

export const hasMermaidBlocks = (html?: string) => /language-mermaid/i.test(String(html || ""));
