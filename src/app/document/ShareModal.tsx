import React, { useState } from "react";

export function ShareModal({ shared, mode, loading, errorMessage, onToggle, onClose, onDownload, shareUrl: propUrl }: {
  shared: boolean;
  mode: "electron" | "web";
  loading?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onClose: () => void;
  onDownload?: () => void;
  shareUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = propUrl || "http://localhost:6535";

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy share url:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-[24px] h-[56px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[normal]">分享文档</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 正文 */}
        <div className="px-[24px] pb-[24px] flex flex-col gap-[10px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">
            {mode === "electron" ? "分享给同一Wi-Fi / 局域网内的人" : "生成本机预览分享页"}
          </p>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[1.6]">
            {mode === "electron" ? "开启后，复制链接发给同事；对方用浏览器打开网址即可查看文档。" : "当前是网页预览环境，会生成一个只读 HTML 分享页，可复制本机临时链接或下载文件。"}
          </p>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[1.6]">
            {mode === "electron" ? "注意：您的电脑和文档助手需要保持开启，别人才能访问。" : "如果需要同 Wi-Fi 访问链接，请在 Electron 桌面应用中开启分享。"}
          </p>
          {errorMessage && <p className="font-['PingFang_SC:Regular',sans-serif] text-[#E53E3E] text-[13px] leading-[1.6]">{errorMessage}</p>}

          {/* 开关卡片 */}
          <div
            className="rounded-[12px] px-[16px] py-[14px] flex items-center justify-between mt-[4px] transition-all duration-300"
            style={{ background: shared ? "rgba(42,182,115,0.08)" : "white", border: "1px solid", borderColor: shared ? "rgba(42,182,115,0.25)" : "#ebecf0" }}
          >
            <div className="flex flex-col gap-[6px]">
              <p
                className="font-['PingFang_SC:Medium',sans-serif] text-[14px] font-medium leading-[normal] transition-colors duration-200"
                style={{ color: shared ? "#15803d" : "#c2c6cd" }}
              >
                {loading ? "处理中..." : shared ? "开启分享" : "未开启分享"}
              </p>
              <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[normal]">
                {shared ? (mode === "electron" ? "链接已生成，点击复制链接后发给同一Wi-Fi / 局域网内的人" : "分享页已生成，可复制链接或下载 HTML 文件") : "点击右侧开关，开启后会显示访问链接"}
              </p>
            </div>
            <button
              className="relative flex-shrink-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer active:scale-95"
              style={{ width: 44, height: 24, background: shared ? "#2AB673" : "#EBECF0", opacity: loading ? 0.6 : 1 }}
              onClick={onToggle}
              disabled={loading}
            >
              <span
                className="absolute top-[2px] size-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{ left: shared ? "22px" : "2px" }}
              />
            </button>
          </div>

          {/* 访问链接区域（开启后显示） */}
          {shared && (
            <div
              className="rounded-[12px] px-[16px] py-[14px] flex flex-col gap-[10px]"
              style={{ background: "rgba(245,245,244,0.5)", border: "1px solid #ebecf0" }}
            >
              <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">访问链接</p>
              <div className="flex items-center gap-[8px]">
                <div className="flex-1 bg-white border border-[#ebecf0] rounded-[6px] px-[12px] h-[40px] flex items-center">
                  <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] tracking-[1.12px] truncate">{shareUrl}</p>
                </div>
                <button
                  className="h-[40px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity whitespace-nowrap flex-shrink-0"
                  style={{ fontFamily: "PingFang SC, sans-serif" }}
                  onClick={handleCopy}
                >
                  {copied ? "已复制" : "复制链接"}
                </button>
                {mode === "web" && onDownload && (
                  <button
                    className="h-[40px] px-[16px] rounded-[6px] border border-[#ebecf0] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#f5f6f8] active:bg-[#ebecf0] transition-colors whitespace-nowrap flex-shrink-0"
                    style={{ fontFamily: "PingFang SC, sans-serif" }}
                    onClick={onDownload}
                  >
                    下载HTML
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
