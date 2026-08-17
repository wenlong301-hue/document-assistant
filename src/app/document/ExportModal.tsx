import React, { useState } from "react";
import type { DocContentMap, OutlineNode } from "./types";
import {
  buildPreviewHtml,
  buildPreviewSections,
  findNode,
  pdfPrintHtmlDocument,
  sanitizeFileName,
  wordHtmlDocument,
} from "./helpers";
import { emptyParagraph, escapeHtml } from "@/app/editor/utils/html";
import { getDisplayFileName } from "@/app/shared/utils/text";
import { turndownService } from "./exportTurndown";

// PreviewSection type used in original - infer locally
type PreviewSection = { id: string; name: string; html: string };

export function ExportModal({ docName, content, contentMap, outlineNodes, selectedNodeId, isElectron, onClose, onToast }: {
  docName: string; content: string; contentMap?: DocContentMap; outlineNodes?: OutlineNode[]; selectedNodeId?: string; isElectron: boolean; onClose: () => void; onToast?: (message: string, type: "success" | "error" | "info") => void;
}) {
  const [scope, setScope] = useState<"current" | "all">("current");
  const [format, setFormat] = useState<"HTML" | "Markdown" | "Word" | "PDF">("HTML");
  const [exportBusy, setExportBusy] = useState(false);

  const collectSubtreeContent = (nodes: OutlineNode[], nodeId: string): { id: string; name: string; html: string; level: number }[] => {
    const node = findNode(nodes, nodeId);
    if (!node) return [];
    const results: { id: string; name: string; html: string; level: number }[] = [];
    const collect = (item: OutlineNode, level: number) => {
      results.push({ id: item.id, name: item.name, html: contentMap?.[item.id] || emptyParagraph, level });
      item.children.forEach((child) => collect(child, Math.min(6, level + 1)));
    };
    collect(node, 1);
    return results;
  };

  const collectTreeContent = (nodes: OutlineNode[]): { id: string; name: string; html: string; level: number }[] => {
    const results: { id: string; name: string; html: string; level: number }[] = [];
    const collect = (items: OutlineNode[], level: number) => {
      items.forEach((item) => {
        results.push({ id: item.id, name: item.name, html: contentMap?.[item.id] || emptyParagraph, level });
        collect(item.children, Math.min(6, level + 1));
      });
    };
    collect(nodes, 1);
    return results;
  };

  const buildExportHtml = (parts: { name: string; html: string; level?: number }[]): string => {
    return parts.map(p => {
      if (p.html.startsWith("<h1>")) return p.html;
      const level = Math.min(6, Math.max(1, p.level || 1));
      return `<h${level}>${escapeHtml(p.name)}</h${level}>${p.html}`;
    }).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n');
  };

  const notify = (message: string, type: "success" | "error" | "info") => onToast?.(message, type);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    let exportContent: string;
    let exportOutlineTree: OutlineNode[] | undefined;
    let exportSections: PreviewSection[];
    let initialNodeId = selectedNodeId;
    let exportTitle = docName;
    if (scope === "current" && outlineNodes && selectedNodeId) {
      const selectedSubtree = findNode(outlineNodes, selectedNodeId);
      const parts = collectSubtreeContent(outlineNodes, selectedNodeId);
      exportContent = parts.length > 0 ? buildExportHtml(parts) : content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportOutlineTree = selectedSubtree ? [selectedSubtree] : undefined;
      exportSections = selectedSubtree ? buildPreviewSections([selectedSubtree], contentMap) : [{ id: "root", name: docName, html: exportContent }];
      exportTitle = selectedSubtree?.name || docName;
    } else if (scope === "all" && outlineNodes) {
      const parts = collectTreeContent(outlineNodes || []);
      exportContent = parts.length > 0 ? buildExportHtml(parts) : content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportOutlineTree = outlineNodes;
      exportSections = buildPreviewSections(outlineNodes, contentMap);
      initialNodeId = selectedNodeId || exportSections[0]?.id;
    } else {
      exportContent = content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportSections = [{ id: "root", name: docName, html: exportContent }];
    }

    try {
      const displayExportTitle = scope === "current" ? exportTitle : getDisplayFileName(exportTitle || docName || "文档");
      const safeName = sanitizeFileName(displayExportTitle || "文档");
      const skipTitle = scope === "all" || (scope === "current" && !!exportOutlineTree);
      const payload = { title: displayExportTitle, content: exportContent, defaultName: safeName, options: { skipTitle } };

      if (format === "HTML") {
        const fullHtml = buildPreviewHtml(displayExportTitle, exportSections, exportOutlineTree, initialNodeId, contentMap);
        if (isElectron) {
          const result = await (window as any).electronAPI.exportHtml(fullHtml, `${safeName}.html`);
          notify(result === false ? "已取消导出" : "导出成功", result === false ? "info" : "success");
        } else {
          downloadBlob(new Blob([fullHtml], { type: "text/html" }), `${safeName}.html`);
          notify("导出成功", "success");
        }
      } else if (format === "Markdown") {
        if (isElectron && (window as any).electronAPI.exportMarkdown) {
          const result = await (window as any).electronAPI.exportMarkdown(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const md = turndownService.turndown(exportContent).trim() + "\n";
          downloadBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${safeName}.md`);
          notify("导出成功", "success");
        }
      } else if (format === "Word") {
        if (isElectron) {
          const result = await (window as any).electronAPI.exportDocx(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const htmlToDocx = (await import("html-to-docx")).default;
          const buffer = await htmlToDocx(wordHtmlDocument(exportTitle, exportContent, { skipTitle }), null, { orientation: "portrait", margins: { top: 720, right: 720, bottom: 720, left: 720 } });
          downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${safeName}.docx`);
          notify("导出成功", "success");
        }
      } else if (format === "PDF") {
        if (isElectron) {
          const result = await (window as any).electronAPI.exportPdf(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const w = window.open("", "_blank");
          if (!w) throw new Error("浏览器阻止了打印窗口，请允许弹窗后重试");
          w.document.write(pdfPrintHtmlDocument(exportTitle, exportContent, { skipTitle }));
          w.document.close();
          notify("已打开打印窗口，请选择保存为 PDF", "info");
        }
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      notify(error instanceof Error ? error.message : "导出失败", "error");
      setExportBusy(false);
    }
  };

  const scopeOptions = [
    { key: "current" as const, label: "当前页", desc: "仅导出当前内容" },
    { key: "all" as const, label: "整个文档", desc: "导出当前文档及子集文件" },
  ];
  const formatOptions = [
    { key: "HTML" as const, desc: "适合预览和分享" },
    { key: "Markdown" as const, desc: "适合二次编辑" },
    { key: "Word" as const, desc: "导出为docx" },
    { key: "PDF" as const, desc: "适合正式分发" },
  ];

  const cardBase =
    "relative box-border text-left bg-white rounded-[12px] border border-solid transition-colors duration-150 cursor-pointer outline-none appearance-none p-0";
  const cardSelected = "border-[#131212]";
  const cardIdle = "border-[#EBECF0] hover:border-[#131212]";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#E0E0E0] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 — 与分享弹窗 ShareModal 一致 */}
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">导出文档</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={exportBusy}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 内容区 — 下边距 18px */}
        <div className="px-[24px] pt-[24px] pb-[18px] flex flex-col gap-[24px]">
          <div className="flex flex-col gap-[8px]">
            <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[20px]">导出范围</p>
            <div className="flex gap-[12px]">
              {scopeOptions.map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  className={`${cardBase} w-[230px] h-[77px] ${scope === key ? cardSelected : cardIdle}`}
                  onClick={() => setScope(key)}
                >
                  <p className="absolute left-[16px] top-[16px] font-['PingFang_SC:Medium',sans-serif] text-[#000000] text-[14px] font-medium leading-[20px] m-0">{label}</p>
                  <p className="absolute left-[16px] top-[44px] font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[12px] font-normal leading-[17px] m-0">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[20px]">导出格式</p>
            <div className="flex gap-[12px]">
              {formatOptions.map(({ key, desc }) => (
                <button
                  key={key}
                  type="button"
                  className={`${cardBase} w-[109px] h-[77px] ${format === key ? cardSelected : cardIdle}`}
                  onClick={() => setFormat(key)}
                >
                  <p className="absolute left-[16px] top-[16px] font-['PingFang_SC:Medium',sans-serif] text-[#000000] text-[14px] font-medium leading-[20px] m-0">{key}</p>
                  <p className="absolute left-[16px] top-[44px] font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[12px] font-normal leading-[17px] m-0 whitespace-nowrap">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮栏 — 图一：上6 下16 右24 间距12 */}
        <div className="shrink-0 flex items-center justify-end gap-[12px] pr-[24px] pt-[6px] pb-[16px]">
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center box-border"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
            disabled={exportBusy}
          >取消</button>
          <button
            type="button"
            className={`h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px] font-normal leading-none transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border ${exportBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-90 active:opacity-80"}`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleExport}
            disabled={exportBusy}
          >{exportBusy ? "导出中..." : "导出"}</button>
        </div>
      </div>
    </div>
  );
}

