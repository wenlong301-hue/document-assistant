import React from "react";
import editorSvg from "../../../imports/首页大纲模式根节点未编写内容-1/svg-208e2u96ym";

export function EditorStatusBar({
  autoSaveEnabled,
  lastSavedAt,
  onAutoSaveChange,
  charCount,
}: {
  autoSaveEnabled: boolean;
  lastSavedAt?: string | null;
  onAutoSaveChange?: (enabled: boolean) => void;
  charCount: number;
}) {
  return (
    <div className="flex items-center justify-between h-[44px] px-[24px] border-t border-[#EBECF0] bg-white flex-shrink-0 box-border">
      <div className="flex items-center gap-[8px]">
        <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[14px] leading-none whitespace-nowrap">自动保存</p>
        <button
          type="button"
          role="switch"
          aria-checked={autoSaveEnabled}
          aria-label="自动保存"
          className="relative shrink-0 w-[40px] h-[20px] rounded-full transition-colors duration-300 cursor-pointer border-0 p-0"
          style={{ background: autoSaveEnabled ? "#131212" : "#EBECF0" }}
          onClick={() => onAutoSaveChange?.(!autoSaveEnabled)}
        >
          <span
            className="absolute top-[2px] size-[16px] rounded-full transition-all duration-300"
            style={{ left: autoSaveEnabled ? "22px" : "2px", background: autoSaveEnabled ? "#FFFFFF" : "#131212" }}
          />
        </button>
        <p className="font-['PingFang_SC:Light',sans-serif] font-light text-[#8D8E99] text-[14px] leading-none whitespace-nowrap">
          {autoSaveEnabled
            ? (lastSavedAt ? `于 ${lastSavedAt} 更新保存` : "开启后每隔 30 秒自动保存")
            : "需手动保存"}
        </p>
      </div>
      <div className="flex items-center gap-[25px]">
        <div className="flex items-center gap-[8px]">
          <div className="relative shrink-0 size-[14px]">
            <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 14 14">
              <path d={editorSvg.p2ce2bc00} stroke="#8D8E99" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </div>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[14px]">大纲</p>
        </div>
        <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[14px]">{charCount}字符</p>
      </div>
    </div>
  );
}
