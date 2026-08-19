import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import editorSvg from "../../../imports/首页大纲模式根节点未编写内容-1/svg-208e2u96ym";

export function LinkModal({ position, initialText, initialUrl, mode, triggerRef, onClose, onConfirm }: {
  position: { x: number; y: number };
  initialText?: string;
  initialUrl?: string;
  mode?: "insert" | "edit";
  triggerRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
  onConfirm: (value: { text: string; url: string }) => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [focusedField, setFocusedField] = useState<"text" | "url" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const canConfirm = url.trim().length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || triggerRef?.current?.contains(target)) return;
      onClose();
    };
    const timer = window.setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose, triggerRef]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const trimmed = url.trim();
    const normalized = /^(https?:\/\/|mailto:|manual-doc:\/\/|#)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    onConfirm({ text, url: normalized });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  };

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[300] w-[360px] rounded-[12px] border border-[#ebecf0] bg-white p-[12px] shadow-[0px_12px_24px_-4px_rgba(36,36,36,0.12)]"
      style={{ left: Math.max(12, Math.min(position.x, window.innerWidth - 372)), top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-[8px] flex items-center justify-between">
        <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">{mode === "edit" ? "编辑链接" : "插入链接"}</p>
        <button
          type="button"
          className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer outline-none appearance-none"
          onClick={onClose}
          aria-label="关闭"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col gap-[8px]">
        <div
          className="h-[34px] rounded-[6px] flex items-center px-[10px] transition-all duration-150"
          style={{ border: focusedField === "text" ? "1px solid #131212" : "1px solid #EBECF0", background: "white" }}
        >
          <input
            type="text"
            placeholder="显示文本"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocusedField("text")}
            onBlur={() => setFocusedField(null)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[13px] text-[#131212] outline-none placeholder:text-[#C0C4CC]"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
          />
        </div>
        <div className="flex items-center gap-[8px]">
          <div
            className="h-[34px] flex-1 rounded-[6px] flex items-center gap-[6px] px-[10px] transition-all duration-150"
            style={{ border: focusedField === "url" ? "1px solid #131212" : "1px solid #EBECF0", background: "white" }}
          >
            <svg className="size-[16px] shrink-0" fill="none" viewBox="0 0 20 20" aria-hidden>
              <path d={editorSvg.pda5c3c0} stroke="#8D8E99" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            </svg>
            <input
              autoFocus
              type="url"
              placeholder="粘贴或输入链接"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocusedField("url")}
              onBlur={() => setFocusedField(null)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[13px] text-[#131212] outline-none placeholder:text-[#C0C4CC]"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
            />
          </div>
          <button
            className={`h-[34px] px-[14px] rounded-[8px] text-[13px] transition-all duration-150 ${
              canConfirm
                ? "bg-[#131212] text-white cursor-pointer hover:opacity-90 active:opacity-80"
                : "bg-[#EBECF0] text-[#8D8E99] cursor-not-allowed"
            }`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >{mode === "edit" ? "更新" : "保存"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
