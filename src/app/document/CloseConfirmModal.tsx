import React, { useState } from "react";

export function CloseConfirmModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (action: "tray" | "quit", remember: boolean) => void;
}) {
  const [remember, setRemember] = useState(false);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] w-[480px] max-w-[92vw] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden">
        <div className="flex items-center justify-between px-[24px] h-[56px] border-b border-[#EBECF0]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium">关闭应用</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
        <div className="px-[24px] py-[20px]">
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#303133] text-[14px] leading-[1.7] mb-[14px]">请选择关闭窗口后的行为：</p>
          <div className="flex flex-col gap-[8px] text-[14px] text-[#606266] leading-[1.7] mb-[18px]">
            <p><span className="font-medium text-[#131212]">最小化到托盘：</span>后台继续运行，可以从托盘恢复</p>
            <p><span className="font-medium text-[#131212]">退出应用：</span>结束所有任务并完全退出</p>
          </div>
          <label className="inline-flex items-center gap-[8px] text-[14px] text-[#606266] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-[16px] accent-[#131212]"
            />
            记住我的选择，下次不再询问
          </label>
        </div>
        <div className="flex justify-end gap-[10px] px-[24px] pb-[20px]">
          <button className="h-[36px] px-[16px] rounded-[8px] border border-[#EBECF0] bg-white text-[14px] text-[#131212] hover:bg-[#F7F8FA] transition-colors" onClick={onClose}>取消</button>
          <button className="h-[36px] px-[16px] rounded-[8px] bg-[#131212] text-white text-[14px] hover:opacity-90 transition-opacity" onClick={() => onConfirm("tray", remember)}>最小化到托盘</button>
          <button className="h-[36px] px-[16px] rounded-[8px] bg-[#E53E3E] text-white text-[14px] hover:opacity-90 transition-opacity" onClick={() => onConfirm("quit", remember)}>退出应用</button>
        </div>
      </div>
    </div>
  );
}
