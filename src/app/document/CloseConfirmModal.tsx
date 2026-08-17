import React, { useState } from "react";

export function CloseConfirmModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (action: "tray" | "quit", remember: boolean) => void;
}) {
  const [remember, setRemember] = useState(false);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] max-w-[92vw] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 — 与 ShareModal 一致 */}
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">关闭应用</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 正文 — 与 ShareModal 一致：上24 下32 */}
        <div className="px-[24px] pt-[24px] pb-[32px] flex flex-col">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[20px]">
            请选择关闭窗口后的行为
          </p>
          <p className="m-0 mt-[8px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[18px]">
            <span className="text-[#131212]">最小化到托盘：</span>后台继续运行，可以从托盘恢复
          </p>
          <p className="m-0 mt-[4px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[18px]">
            <span className="text-[#131212]">退出应用：</span>结束所有任务并完全退出
          </p>

          <label className="mt-[16px] inline-flex items-center gap-[8px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-[16px] accent-[#131212] cursor-pointer"
            />
            <span className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[18px]">
              记住我的选择，下次不再询问
            </span>
          </label>

          {/* 底部按钮 — 与 ExportModal 一致：高 32、圆角 6、间距 12 */}
          <div className="flex items-center justify-end gap-[12px] mt-[24px]">
            <button
              type="button"
              className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px] font-normal leading-none cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              onClick={() => onConfirm("tray", remember)}
            >
              最小化到托盘
            </button>
            <button
              type="button"
              className="h-[32px] px-[16px] rounded-[6px] border-0 bg-[#E53E3E] text-white text-[14px] font-normal leading-none cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              onClick={() => onConfirm("quit", remember)}
            >
              退出应用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
