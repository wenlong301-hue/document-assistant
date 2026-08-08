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
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[12px] w-[600px] p-[24px] flex flex-col gap-[24px] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[18px] font-medium leading-[normal]">{title}</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#93959f] hover:text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-all cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 输入框 */}
        <div
          className="w-full h-[44px] rounded-[8px] flex items-center px-[16px] transition-all duration-150"
          style={{
            border: inputFocused ? "0.6px solid #134CFF" : "0.6px solid #ececec",
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
            className="w-full bg-transparent text-[14px] text-[#131212] outline-none placeholder:text-[#c0c4cc]"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-[12px]">
          <button
            className="h-[36px] px-[20px] rounded-[6px] border-[0.6px] border-solid border-[#ececec] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
          >取消</button>
          <button
            className={`h-[36px] px-[20px] rounded-[6px] text-white text-[14px] transition-all duration-150 ${
              canConfirm
                ? "bg-[#131212] cursor-pointer hover:opacity-80 active:opacity-60"
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
