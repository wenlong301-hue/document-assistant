import { renderMermaidSourceToSvg } from "./mermaid";

export type DiagramKind = "mermaid" | "sequence" | "flow";

export const toDiagramKind = (lang?: string | null): DiagramKind | null => {
  const id = String(lang || "").toLowerCase();
  if (id === "mermaid" || id === "sequence" || id === "flow") return id;
  return null;
};

function styleSvg(root: ParentNode) {
  root.querySelectorAll("svg").forEach((svg) => {
    const el = svg as SVGElement;
    el.removeAttribute("height");
    el.style.maxWidth = "100%";
    el.style.height = "auto";
    el.style.display = "block";
    el.style.margin = "0 auto";
    el.style.pointerEvents = "none";
  });
}

async function loadSequenceDiagram(): Promise<{ parse: (src: string) => { drawSVG: (el: HTMLElement, opts?: object) => void } }> {
  const win = window as any;
  if (!win.Raphael) {
    const raphaelMod = await import("raphael");
    win.Raphael = raphaelMod.default || raphaelMod;
  }
  if (!win._) {
    const underscoreMod = await import("underscore");
    win._ = underscoreMod.default || underscoreMod;
  }
  if (!win.Diagram) {
    await import("js-sequence-diagrams/dist/sequence-diagram-raphael.js");
  }
  if (!win.Diagram?.parse) throw new Error("Sequence Diagram 加载失败");
  return win.Diagram;
}

async function renderSequenceToHtml(source: string): Promise<string> {
  const Diagram = await loadSequenceDiagram();
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden";
  document.body.appendChild(host);
  try {
    const diagram = Diagram.parse(source);
    diagram.drawSVG(host, { theme: "simple" });
    styleSvg(host);
    return host.innerHTML;
  } finally {
    host.remove();
  }
}

async function renderFlowToHtml(source: string): Promise<string> {
  const flowchartMod = await import("flowchart.js");
  const flowchart = (flowchartMod as any).default || flowchartMod;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden";
  document.body.appendChild(host);
  try {
    const chart = flowchart.parse(source);
    chart.drawSVG(host, {
      "line-width": 2,
      "line-length": 40,
      "text-margin": 8,
      "font-size": 13,
      "font-family": "PingFang SC, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font-color": "#131212",
      "line-color": "#8D8E99",
      "element-color": "#EBECF0",
      fill: "#F7F8FA",
      "yes-text": "yes",
      "no-text": "no",
      "arrow-end": "block",
      scale: 1,
    });
    styleSvg(host);
    return host.innerHTML;
  } finally {
    host.remove();
  }
}

/** 将图表源码渲染为 HTML（含 SVG） */
export async function renderDiagramSourceToHtml(kind: DiagramKind, source: string): Promise<string> {
  const trimmed = String(source || "").replace(/\u00a0/g, " ").trimEnd();
  if (!trimmed.trim()) return "";
  if (kind === "mermaid") {
    const svg = await renderMermaidSourceToSvg(trimmed);
    const wrap = document.createElement("div");
    wrap.innerHTML = svg;
    styleSvg(wrap);
    return wrap.innerHTML;
  }
  if (kind === "sequence") return renderSequenceToHtml(trimmed);
  return renderFlowToHtml(trimmed);
}

function matchDiagramPre(pre: Element, code: Element, kind: DiagramKind): boolean {
  const cls = `${pre.getAttribute("class") || ""} ${code.getAttribute("class") || ""}`;
  const data =
    code.getAttribute("data-language") ||
    pre.getAttribute("data-language") ||
    "";
  if (data.toLowerCase() === kind) return true;
  return new RegExp(`(?:^|\\s)language-${kind}(?:\\s|$)`, "i").test(cls);
}

function collectDiagramBlocks(root: ParentNode, kind: DiagramKind) {
  const found: Array<{ pre: HTMLElement; source: string }> = [];
  root.querySelectorAll("pre").forEach((pre) => {
    const el = pre as HTMLElement;
    if (el.dataset.diagramRendered === "1") return;
    const code = (pre.querySelector("code") || pre) as HTMLElement;
    if (!matchDiagramPre(pre, code, kind)) return;
    const source = (code.textContent || "").replace(/\u00a0/g, " ").trimEnd();
    if (!source.trim()) return;
    found.push({ pre: el, source });
  });
  return found;
}

async function renderBlocksInRoot(root: HTMLElement, kind: DiagramKind) {
  const blocks = collectDiagramBlocks(root, kind);
  if (!blocks.length) return;
  await Promise.all(blocks.map(async ({ pre, source }, index) => {
    try {
      const html = await renderDiagramSourceToHtml(kind, source);
      const wrap = document.createElement("div");
      wrap.className = "doc-diagram";
      wrap.dataset.diagramKind = kind;
      wrap.dataset.diagramSource = source;
      wrap.innerHTML = html;
      styleSvg(wrap);
      pre.replaceWith(wrap);
    } catch (error) {
      pre.dataset.diagramRendered = "1";
      pre.classList.add("doc-diagram-error");
      const msg = document.createElement("div");
      msg.className = "doc-diagram-error-msg";
      const label = kind === "flow" ? "Flowchart" : kind === "sequence" ? "Sequence" : "Mermaid";
      msg.textContent = `${label} 渲染失败：${error instanceof Error ? error.message : "语法错误"}`;
      pre.parentElement?.insertBefore(msg, pre);
    }
  }));
}

/** 在已挂载 DOM 内渲染 sequence / flow（mermaid 仍走原路径时可一并调用） */
export async function renderDiagramsInElement(root: HTMLElement | null | undefined) {
  if (!root || typeof document === "undefined") return;
  await renderBlocksInRoot(root, "sequence");
  await renderBlocksInRoot(root, "flow");
}

export async function renderDiagramsInHtml(html: string): Promise<string> {
  if (!html || !/language-(sequence|flow)/i.test(html)) return html;
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div id="__diag_root__">${html}</div>`, "text/html");
  const root = doc.getElementById("__diag_root__");
  if (!root) return html;
  for (const kind of ["sequence", "flow"] as DiagramKind[]) {
    const blocks = collectDiagramBlocks(root, kind);
    for (const { pre, source } of blocks) {
      try {
        const svgHtml = await renderDiagramSourceToHtml(kind, source);
        const wrap = doc.createElement("div");
        wrap.className = "doc-diagram";
        wrap.setAttribute("data-diagram-kind", kind);
        wrap.setAttribute("data-diagram-source", source);
        wrap.innerHTML = svgHtml;
        styleSvg(wrap);
        pre.replaceWith(wrap);
      } catch {
        /* keep source */
      }
    }
  }
  return root.innerHTML;
}

export const hasDiagramBlocks = (html?: string) =>
  /language-(sequence|flow)/i.test(String(html || ""));
