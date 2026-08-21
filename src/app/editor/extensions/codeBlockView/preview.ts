// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { renderDiagramSourceToHtml } from "../../utils/diagrams";
import { codeBlockPreviewCache } from "../codeBlockSessions";
import type { CodeBlockViewCtx } from "./types";

export function createPreview(ctx: CodeBlockViewCtx) {
  ctx.normalizePreviewSource = (source: string) =>
    String(source || "").replace(/\u00a0/g, " ").trimEnd();
  ctx.previewCacheKey = () => {
    const range = ctx.nodeRange();
    return range ? range.pos : null;
  };
  ctx.writePreviewCache = (source: string, html: string) => {
    const pos = ctx.previewCacheKey();
    if (pos === null) return;
    let map = codeBlockPreviewCache.get(ctx.editor);
    if (!map) {
      map = new Map();
      codeBlockPreviewCache.set(ctx.editor, map);
    }
    map.set(pos, { source, html });
  };
  ctx.readPreviewCache = (source: string) => {
    const pos = ctx.previewCacheKey();
    if (pos === null) return null;
    const hit = codeBlockPreviewCache.get(ctx.editor)?.get(pos);
    if (!hit || hit.source !== source || !hit.html) return null;
    return hit;
  };
  ctx.applyPreviewHtml = (html: string) => {
    ctx.preview.className = "doc-diagram-preview";
    ctx.preview.innerHTML = html;
    ctx.preview.querySelectorAll("svg").forEach((svgEl) => {
      svgEl.removeAttribute("height");
      (svgEl as SVGElement).style.maxWidth = "100%";
      (svgEl as SVGElement).style.height = "auto";
      (svgEl as SVGElement).style.display = "block";
      (svgEl as SVGElement).style.margin = "0 auto";
      (svgEl as SVGElement).style.pointerEvents = "none";
    });
  };
  ctx.previewIsFresh = (source?: string) => {
    const trimmed = ctx.normalizePreviewSource(source ?? ctx.readSource());
    return Boolean(trimmed) && trimmed === ctx.lastSource && Boolean(ctx.preview.querySelector("svg"));
  };
  ctx.restorePreviewFromCache = () => {
    const trimmed = ctx.normalizePreviewSource(ctx.readSource());
    if (!trimmed.trim()) return false;
    if (ctx.previewIsFresh(trimmed)) return true;
    const hit = ctx.readPreviewCache(trimmed);
    if (!hit) return false;
    ctx.lastSource = trimmed;
    ctx.applyPreviewHtml(hit.html);
    return true;
  };
  ctx.renderPreview = (source: string) => {
    const kind = ctx.diagramKind();
    if (!kind) return;
    const trimmed = ctx.normalizePreviewSource(source);
    if (!trimmed.trim()) {
      ctx.preview.className = "doc-diagram-preview";
      ctx.preview.textContent = ctx.editing ? "输入图表源码以预览" : "点击编辑图表";
      ctx.lastSource = "";
      return;
    }
    if (ctx.previewIsFresh(trimmed)) return;
    const cached = ctx.readPreviewCache(trimmed);
    if (cached) {
      ctx.lastSource = trimmed;
      ctx.applyPreviewHtml(cached.html);
      return;
    }
    const token = ++ctx.renderToken;
    ctx.preview.className = "doc-diagram-preview";
    if (!ctx.preview.querySelector("svg")) ctx.preview.textContent = "图表渲染中…";
    const label = kind === "flow" ? "Flowchart" : kind === "sequence" ? "Sequence" : "Mermaid";
    void renderDiagramSourceToHtml(kind, trimmed).then((html) => {
      if (token !== ctx.renderToken || !ctx.isDiagram()) return;
      ctx.lastSource = trimmed;
      ctx.applyPreviewHtml(html);
      ctx.writePreviewCache(trimmed, html);
    }).catch((error) => {
      if (token !== ctx.renderToken || !ctx.isDiagram()) return;
      ctx.lastSource = "";
      ctx.preview.className = "doc-diagram-preview doc-diagram-error";
      ctx.preview.textContent = `${label} 渲染失败：${error instanceof Error ? error.message : "语法错误"}`;
    });
  };
  ctx.scheduleRender = () => {
    // 源码未变且已有 SVG：跳过，避免点展开条时底部图表闪烁重载
    if (ctx.previewIsFresh() || ctx.restorePreviewFromCache()) return;
    window.clearTimeout(ctx.debounceTimer);
    ctx.debounceTimer = window.setTimeout(() => {
      ctx.renderPreview(ctx.readSource());
    }, 160);
  };
}
