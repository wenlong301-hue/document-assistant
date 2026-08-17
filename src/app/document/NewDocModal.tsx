import React, { useState } from "react";

export function NewDocModal({ onClose, onConfirm, initialValue = "", title = "编辑名称" }: {
  onClose: () => void;
  onConfirm: (name: string) => void;
  initialValue?: string;
  title?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [inputFocused, setInputFocused] = useState(false);
  const canConfirm = value.trim().length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(value.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#E0E0E0] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 — 与导出弹窗一致 */}
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">{title}</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 内容区 — 上24 下18 左右24 */}
        <div className="px-[24px] pt-[24px] pb-[18px] flex flex-col">
          <div
            className="w-full h-[40px] rounded-[6px] flex items-center px-[16px] box-border transition-colors duration-150"
            style={{
              border: inputFocused ? "1px solid #131212" : "1px solid #EBECF0",
              background: "white",
            }}
          >
            <input
              autoFocus
              type="text"
              placeholder="输入名称"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[14px] text-[#131212] leading-[20px] outline-none border-0 p-0 placeholder:text-[#C0C4CC]"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
            />
          </div>
        </div>

        {/* 底部按钮栏 — 与导出弹窗一致 */}
        <div className="shrink-0 flex items-center justify-end gap-[12px] pr-[24px] pt-[6px] pb-[16px]">
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
          >取消</button>
          <button
            type="button"
            className={`h-[32px] px-[16px] rounded-[6px] border-0 text-white text-[14px] font-normal leading-none transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border ${
              canConfirm
                ? "bg-[#131212] cursor-pointer hover:opacity-90 active:opacity-80"
                : "bg-[#c0c4cc] cursor-not-allowed"
            }`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >确定</button>
        </div>
      </div>
    </div>
  );
}
