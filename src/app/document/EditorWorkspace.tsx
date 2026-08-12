import React, { useEffect, useState } from "react";
import type { OutlineNode } from "../document/types";
import { ErrorBoundary } from "../editor/ui/ErrorBoundary";
import { RichEditorTiptap } from "../editor/RichEditorTiptap";
import { IllustrationSvg, OutlineIllustration } from "./Illustrations";

export function EditorWorkspace({ docName, mode, selectedNode, nodeDepth, nodeContent, onTitleChange, onContentChange, fontSize, lineHeight, theme, sidebarWidth }: {
  docName: string; mode: "document" | "outline"; selectedNode: OutlineNode | null; nodeDepth: number;
  nodeContent?: string; onTitleChange?: (name: string) => void; onContentChange?: (html: string, text: string) => void;
  fontSize?: string; lineHeight?: string; theme?: string; sidebarWidth?: number;
}) {
  const isOutlineEmpty = mode === "outline" && !selectedNode;
  const titleName = mode === "outline" && selectedNode ? selectedNode.name : (docName || "文档助手");
  const [titleDraft, setTitleDraft] = useState(titleName);
  useEffect(() => { setTitleDraft(titleName); }, [titleName]);
  const commitTitle = (value = titleDraft) => {
    const next = value.trim();
    if (next && next !== titleName) onTitleChange?.(next);
    else setTitleDraft(titleName);
  };
  const titleOnlyReason = "当前选中的是文件夹，请选择文件夹内的文档进行编辑";

  return (
    <div className="absolute bg-white overflow-hidden rounded-[12px] z-[1]" style={{ left: (sidebarWidth ?? 276) + 32, right: 8, top: 66, bottom: 8 }}>
      <p
        contentEditable
        suppressContentEditableWarning
        className="[word-break:break-word] absolute font-['PingFang_SC:Medium',sans-serif] leading-[28px] left-[24px] not-italic text-[#131212] text-[20px] top-[16px] whitespace-nowrap cursor-text outline-none px-[2px]"
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
      <div className="absolute left-0 right-0 top-[60px] h-[0.6px] bg-[#EBECF0]" />
      {mode === "document" ? (
        <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-[16px]">
          <IllustrationSvg />
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#93959f] text-[14px]">{docName ? "您还没有创建文档，点击左侧的 新建文件 去添加第一个文档吧" : "您还没有创建文档，点击左侧的 新建文件 去添加第一个文档吧"}</p>
        </div>
      ) : isOutlineEmpty ? (
        <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-[16px]">
          <OutlineIllustration />
          <div className="text-center">
            <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px] leading-[1.8]">{titleOnlyReason}</p>
          </div>
        </div>
      ) : (
        <ErrorBoundary key={selectedNode?.id}><RichEditorTiptap docName={docName} nodeId={selectedNode?.id ?? ""} initialHtml={nodeContent} onContentChange={onContentChange} fontSize={fontSize} lineHeight={lineHeight} theme={theme} /></ErrorBoundary>
      )}
    </div>
  );
}
