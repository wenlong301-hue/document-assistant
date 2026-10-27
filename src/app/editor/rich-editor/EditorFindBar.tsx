import React, { useEffect, useRef, useState } from "react";

export function EditorFindBar({
  query,
  replacement,
  current,
  total,
  replaceOpen,
  onQueryChange,
  onReplacementChange,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onToggleReplace,
  onClose,
}: {
  query: string;
  replacement: string;
  current: number;
  total: number;
  replaceOpen: boolean;
  onQueryChange: (v: string) => void;
  onReplacementChange: (v: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onToggleReplace: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const btn = "h-[28px] px-[10px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[13px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border";
  const primary = "h-[28px] px-[10px] rounded-[6px] border-0 bg-[#131212] text-white text-[13px] font-normal leading-none cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border";
  const field = "h-[28px] px-[8px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[13px] text-[#131212] outline-none placeholder:text-[#C0C4CC] focus:border-[#131212] box-border";

  return (
    <div className="shrink-0 flex flex-col gap-[8px] px-[16px] py-[8px] border-b border-[#EBECF0] bg-white">
      <div className="flex items-center gap-[8px]">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="查找"
          autoComplete="off"
          className={`${field} w-[220px]`}
          style={{ fontFamily: "PingFang SC, sans-serif" }}
          onChange={(e) => onQueryChange(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => {
            setComposing(false);
            onQueryChange((e.target as HTMLInputElement).value);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || composing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) onPrev();
              else onNext();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <span className="text-[12px] text-[#8D8E99] min-w-[48px]" style={{ fontFamily: "PingFang SC, sans-serif" }}>
          {total > 0 ? `${current}/${total}` : "无结果"}
        </span>
        <button type="button" className={btn} onClick={onPrev} aria-label="上一条">上一条</button>
        <button type="button" className={btn} onClick={onNext} aria-label="下一条">下一条</button>
        <button type="button" className={btn} onClick={onToggleReplace}>{replaceOpen ? "收起替换" : "替换"}</button>
        <button type="button" className={btn} onClick={onClose} aria-label="关闭查找">关闭</button>
      </div>
      {replaceOpen && (
        <div className="flex items-center gap-[8px]">
          <input
            type="text"
            value={replacement}
            placeholder="替换为"
            autoComplete="off"
            className={`${field} w-[220px]`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onChange={(e) => onReplacementChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onReplace();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <button type="button" className={btn} onClick={onReplace}>替换</button>
          <button type="button" className={primary} onClick={onReplaceAll}>全部替换</button>
        </div>
      )}
    </div>
  );
}
