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
    { key: "current" as const, label: "当前页", desc: "导出当前层级及子集" },
    { key: "all" as const, label: "整个文档", desc: "导出当前文档全部内容" },
  ];
  const formatOptions = [
    { key: "HTML" as const, desc: "预览分享（尽力）" },
    { key: "Markdown" as const, desc: "二次编辑（可能有损）" },
    { key: "Word" as const, desc: "docx（可能有损）" },
    { key: "PDF" as const, desc: "正式分发" },
  ];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[600px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] p-[32px] flex flex-col gap-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[18px] font-medium leading-[normal]">导出文档</p>
          <button className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" onClick={onClose} disabled={exportBusy}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 导出范围 */}
        <div className="flex flex-col gap-[12px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">导出范围</p>
          <div className="grid grid-cols-2 gap-[12px]">
            {scopeOptions.map(({ key, label, desc }) => (
              <button
                key={key}
                className={`text-left p-[16px] rounded-[12px] border transition-all duration-150 cursor-pointer ${scope === key ? "border-[#131212] bg-[#f7f8fa]" : "border-[#e5e7eb] hover:border-[#131212] hover:bg-[#fafafa]"}`}
                onClick={() => setScope(key)}
              >
                <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[15px] font-medium leading-[normal] mb-[6px]">{label}</p>
                <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[normal]">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 导出格式 */}
        <div className="flex flex-col gap-[12px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">导出格式</p>
          <div className="grid grid-cols-4 gap-[10px]">
            {formatOptions.map(({ key, desc }) => (
              <button
                key={key}
                className={`text-left p-[14px] rounded-[12px] border transition-all duration-150 cursor-pointer ${format === key ? "border-[#131212] bg-[#f7f8fa]" : "border-[#e5e7eb] hover:border-[#131212] hover:bg-[#fafafa]"}`}
                onClick={() => setFormat(key)}
              >
                <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[15px] font-medium leading-[normal] mb-[6px]">{key}</p>
                <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] leading-[normal]">{desc}</p>
              </button>
            ))}
          </div>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] leading-[1.5]">
            导出为交换格式（L3），复杂排版/空格/样式可能有损。长期精编请用原生 <span className="text-[#606266]">.mdoc</span> 保存。
          </p>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-[12px]">
          <button
            className="h-[40px] px-[24px] rounded-[8px] border border-[#e5e7eb] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
            disabled={exportBusy}
          >取消</button>
          <button
            className={`h-[40px] px-[24px] rounded-[8px] bg-[#131212] text-white text-[14px] transition-opacity ${exportBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-80 active:opacity-60"}`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleExport}
            disabled={exportBusy}
          >{exportBusy ? "导出中..." : "导出"}</button>
        </div>
      </div>
    </div>
  );
}

