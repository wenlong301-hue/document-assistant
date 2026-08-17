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
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">分享文档</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 正文 — Figma 45:20：上24 下32；标题→说明8；说明间距4；说明→卡片12 */}
        <div className="px-[24px] pt-[24px] pb-[32px] flex flex-col">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[20px]">
            {mode === "electron" ? "分享给同一Wi-Fi / 局域网内的人" : "生成本机预览分享页"}
          </p>
          <p className="m-0 mt-[8px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[18px]">
            {mode === "electron" ? "开启后，复制链接发给同事；对方用浏览器打开网址即可查看文档。" : "当前是网页预览环境，会生成一个只读 HTML 分享页，可复制本机临时链接或下载文件。"}
          </p>
          <p className="m-0 mt-[4px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[18px]">
            {mode === "electron" ? "注意：您的电脑和文档助手需要保持开启，别人才能访问。" : "如果需要同 Wi-Fi 访问链接，请在 Electron 桌面应用中开启分享。"}
          </p>
          {errorMessage && <p className="m-0 mt-[4px] font-['PingFang_SC:Regular',sans-serif] text-[#E53E3E] text-[13px] leading-[18px]">{errorMessage}</p>}

          {/* 开关卡片 — 内边距 12/16，文案间距 4 */}
          <div
            className="rounded-[12px] px-[16px] py-[12px] flex items-center justify-between mt-[12px] transition-all duration-300"
            style={{ background: shared ? "rgba(42,182,115,0.08)" : "white", border: "1px solid", borderColor: shared ? "rgba(42,182,115,0.25)" : "#ebecf0" }}
          >
            <div className="flex flex-col gap-[4px]">
              <p
                className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[14px] font-medium leading-[20px] transition-colors duration-200"
                style={{ color: shared ? "#15803d" : "#c2c6cd" }}
              >
                {loading ? "处理中..." : shared ? "开启分享" : "未开启分享"}
              </p>
              <p className="m-0 font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[18px]">
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

          {/* 访问链接 — Figma 43:277：灰底无描边 12r；标题 16/12；输入 340×40 r6；按钮 r6；行间距 12 */}
          {shared && (
            <div
              className="rounded-[12px] px-[16px] pt-[12px] pb-[16px] flex flex-col gap-[8px] mt-[12px]"
              style={{ background: "rgba(245,245,244,0.5)" }}
            >
              <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] leading-[20px]">访问链接</p>
              <div className="flex items-center gap-[12px]">
                <div className="flex-1 min-w-0 bg-white border border-[#EBECF0] rounded-[6px] px-[16px] h-[40px] flex items-center">
                  <p className="m-0 font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] tracking-[0.08em] truncate">{shareUrl}</p>
                </div>
                <button
                  className="h-[40px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] font-['PingFang_SC:Regular',sans-serif] cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity whitespace-nowrap flex-shrink-0 border-0"
                  onClick={handleCopy}
                >
                  {copied ? "已复制" : "复制链接"}
                </button>
                {mode === "web" && onDownload && (
                  <button
                    className="h-[40px] px-[16px] rounded-[6px] border border-[#EBECF0] bg-white text-[#131212] text-[14px] font-['PingFang_SC:Regular',sans-serif] cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors whitespace-nowrap flex-shrink-0"
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
