import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import type { OutlineNode } from "../document/types";
import { ErrorBoundary } from "../editor/ui/ErrorBoundary";
import { renderMermaidInElement } from "../editor/utils/mermaid";
import { IllustrationSvg, OutlineIllustration } from "./illustrations";
import { docContentCss } from "./documentContentCss";

const RichEditorTiptap = lazy(() =>
  import("../editor/RichEditorTiptap").then((m) => ({ default: m.RichEditorTiptap }))
);

export function EditorWorkspace({ docName, mode, selectedNode, nodeDepth, nodeContent, previewHtml, onTitleChange, onContentChange, autoSaveEnabled, lastSavedAt, onAutoSaveChange, fontSize, lineHeight, theme, sidebarWidth }: {
  docName: string; mode: "document" | "outline"; selectedNode: OutlineNode | null; nodeDepth: number;
  nodeContent?: string; previewHtml?: string; onTitleChange?: (name: string) => void; onContentChange?: (html: string, text: string) => void;
  autoSaveEnabled?: boolean; lastSavedAt?: string | null; onAutoSaveChange?: (enabled: boolean) => void;
  fontSize?: string; lineHeight?: string; theme?: string; sidebarWidth?: number;
}) {
  const isOutlineEmpty = mode === "outline" && !selectedNode;
  const titleName = mode === "outline" && selectedNode ? selectedNode.name : (docName || "文档助手");
  const [titleDraft, setTitleDraft] = useState(titleName);
  const previewBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setTitleDraft(titleName); }, [titleName]);
  useEffect(() => {
    if (mode !== "document" || !previewHtml) return;
    const el = previewBodyRef.current;
    if (!el) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void renderMermaidInElement(el);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, previewHtml]);
  const commitTitle = (value = titleDraft) => {
    const next = value.trim();
    if (next && next !== titleName) onTitleChange?.(next);
    else setTitleDraft(titleName);
  };
  const titleOnlyReason = "切换到大纲模式下编辑文件内容";

  const titleAreaHeight = 60;
  return (
    <div className="absolute bg-white overflow-hidden rounded-[12px] z-[1]" style={{ left: (sidebarWidth ?? 276) + 32, right: 8, top: 66, bottom: 8 }}>
      <div className="absolute left-0 right-0 top-0 z-[2] box-border flex items-center min-w-0 h-[60px] px-[24px] border-b border-[#EBECF0] bg-white">
        <p
          contentEditable
          suppressContentEditableWarning
          className="[word-break:break-word] font-['PingFang_SC:Medium',sans-serif] leading-[28px] not-italic text-[#131212] text-[20px] whitespace-nowrap cursor-text outline-none px-[2px] min-w-0 truncate"
          onFocus={(e) => {
            setTitleDraft(titleName);
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }}
          onInput={(e) => setTitleDraft(e.currentTarget.textContent || "")}
          onBlur={(e) => commitTitle(e.currentTarget.textContent || "")}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
            if (e.key === "Escape") { e.preventDefault(); e.currentTarget.textContent = titleName; setTitleDraft(titleName); (e.currentTarget as HTMLElement).blur(); }
          }}
        >{titleName}</p>
      </div>
      {mode === "document" ? previewHtml ? (
        <div className="absolute left-[68px] right-[68px] bottom-0 overflow-auto prose-preview" style={{ top: titleAreaHeight, fontSize: fontSize || "15px", lineHeight: lineHeight || "1.8", color: "#131212", paddingTop: 24, paddingBottom: 24 }}>
          <style>{docContentCss(".prose-preview")}</style>
          <div ref={previewBodyRef} dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[16px]" style={{ top: titleAreaHeight }}>
          <IllustrationSvg />
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#93959f] text-[14px]">{titleOnlyReason}</p>
        </div>
      ) : isOutlineEmpty ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[16px]" style={{ top: titleAreaHeight }}>
          <OutlineIllustration />
          <div className="text-center">
            <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px] leading-[1.8]">{titleOnlyReason}</p>
          </div>
        </div>
      ) : (
        <div className="absolute left-0 right-0 bottom-0" style={{ top: titleAreaHeight }}>
          <ErrorBoundary key={selectedNode?.id}>
            <Suspense fallback={<div className="flex items-center justify-center h-full text-[#8D8E99] text-[14px]">加载编辑器…</div>}>
              <RichEditorTiptap docName={docName} nodeId={selectedNode?.id ?? ""} initialHtml={nodeContent} onContentChange={onContentChange} autoSaveEnabled={autoSaveEnabled} lastSavedAt={lastSavedAt} onAutoSaveChange={onAutoSaveChange} fontSize={fontSize} lineHeight={lineHeight} theme={theme} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
