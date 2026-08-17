import React, { useEffect, useState } from "react";
import type { OutlineNode } from "../document/types";
import { ErrorBoundary } from "../editor/ui/ErrorBoundary";
import { RichEditorTiptap } from "../editor/RichEditorTiptap";
import { IllustrationSvg, OutlineIllustration } from "./illustrations";

export function EditorWorkspace({ docName, mode, selectedNode, nodeDepth, nodeContent, previewHtml, onTitleChange, onContentChange, fontSize, lineHeight, theme, sidebarWidth }: {
  docName: string; mode: "document" | "outline"; selectedNode: OutlineNode | null; nodeDepth: number;
  nodeContent?: string; previewHtml?: string; onTitleChange?: (name: string) => void; onContentChange?: (html: string, text: string) => void;
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
          <style>{`
            .prose-preview h1{font-size:28px;line-height:1.45;margin:18px 0 12px;font-weight:700}
            .prose-preview h2{font-size:24px;line-height:1.45;margin:16px 0 10px;font-weight:700}
            .prose-preview h3{font-size:20px;line-height:1.5;margin:14px 0 8px;font-weight:650}
            .prose-preview h4,.prose-preview h5,.prose-preview h6{font-size:17px;line-height:1.55;margin:12px 0 8px;font-weight:650}
            .prose-preview p{margin:0 0 10px}
            .prose-preview ul,.prose-preview ol{padding-left:24px;margin:12px 0}
            .prose-preview li{margin:4px 0}
            .prose-preview img,.prose-preview video{max-width:100%;height:auto}
            .prose-preview .tableWrapper{display:block;margin:14px 0;max-width:100%;overflow-x:auto;overflow-y:hidden;padding:2px 0 8px}
            .prose-preview .tableWrapper table,.prose-preview table.doc-table,.prose-preview table{border:1px solid #EEF0F5;border-collapse:collapse;border-spacing:0;display:table;margin:0;max-width:none;overflow:visible;table-layout:fixed;width:100%}
            .prose-preview table td,.prose-preview table th{border:1px solid #EEF0F5;box-sizing:border-box;min-width:96px;padding:7px 9px;position:relative;vertical-align:top}
            .prose-preview table th{background:#f7f8fa;color:#131212;font-weight:600;text-align:left}
            .prose-preview table tr:nth-child(odd) td{background:rgba(238,240,245,0.502)}
            .prose-preview table td>*,.prose-preview table th>*{margin-bottom:0!important}
            .prose-preview table td p,.prose-preview table th p{line-height:1.6;margin:0;min-height:20px}
            .prose-preview blockquote{border-left:3px solid #134CFF;background:#f7f8fa;margin:10px 0;padding:10px 16px;color:#606266;border-radius:0 12px 12px 0}
            .prose-preview pre{background:#f5f6f8;border:1px solid #ebecf0;border-radius:8px;padding:12px 14px;margin:12px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.65;white-space:pre-wrap}
            .prose-preview hr{border:none;border-top:1px solid #ebecf0;margin:24px 0}
            .prose-preview a{color:#134CFF;text-decoration:underline;text-underline-offset:2px}
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
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
          <ErrorBoundary key={selectedNode?.id}><RichEditorTiptap docName={docName} nodeId={selectedNode?.id ?? ""} initialHtml={nodeContent} onContentChange={onContentChange} fontSize={fontSize} lineHeight={lineHeight} theme={theme} /></ErrorBoundary>
        </div>
      )}
    </div>
  );
}
