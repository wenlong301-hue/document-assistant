import React, { useEffect, useState } from "react";
import type { CollabSessionState } from "@/app/collab/types";

export function CollabModal({
  collab,
  loading,
  canHost,
  onStart,
  onJoin,
  onStop,
  onClose,
}: {
  collab: CollabSessionState;
  loading?: boolean;
  canHost: boolean;
  onStart: () => void;
  onJoin: (link: string) => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [joinFocused, setJoinFocused] = useState(false);
  const active = collab.active;
  const statusLabel = loading
    ? "处理中..."
    : active
      ? collab.status === "connecting"
        ? "正在连接…"
        : collab.status === "error"
          ? "连接失败"
          : "协同进行中"
      : "未开启协同";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(collab.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy collab url:", error);
    }
  };

  const handleJoin = () => {
    const next = joinLink.trim();
    if (!next) return;
    onJoin(next);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#E0E0E0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">协同编辑</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#DDDEE3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="px-[24px] pt-[24px] pb-[32px] flex flex-col">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[20px]">同一 Wi-Fi 下一起改这份文档</p>
          <p className="m-0 mt-[8px] font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[13px] leading-[18px]">
            发起后复制链接发给同事；对方在文档助手中粘贴即可进入。只读分享仍用顶栏「分享」。
          </p>
          <p className="m-0 mt-[4px] font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[13px] leading-[18px]">
            注意：发起方电脑和文档助手需要保持开启，别人才能连上。
          </p>
          {collab.error && (
            <p className="m-0 mt-[4px] font-['PingFang_SC:Regular',sans-serif] text-[#E53E3E] text-[13px] leading-[18px]">{collab.error}</p>
          )}

          <div
            className="rounded-[12px] px-[16px] py-[12px] flex items-center justify-between mt-[12px] transition-all duration-300"
            style={{ background: active ? "rgba(42,182,115,0.08)" : "white", border: "1px solid", borderColor: active ? "rgba(42,182,115,0.25)" : "#EBECF0" }}
          >
            <div className="flex flex-col gap-[4px] min-w-0">
              <p
                className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[14px] font-medium leading-[20px] transition-colors duration-200"
                style={{ color: active ? "#15803D" : "#C0C4CC" }}
              >
                {statusLabel}
              </p>
              <p className="m-0 font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[13px] leading-[18px]">
                {active
                  ? (collab.role === "guest" ? "已加入同事发起的协同" : "链接已生成，复制后发给同一 Wi-Fi 内的人")
                  : (canHost ? "点击右侧开关发起协同，或在下方粘贴链接加入" : "请先选择文件后再发起协同")}
              </p>
            </div>
            <button
              type="button"
              className="relative flex-shrink-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer active:scale-95 border-0"
              style={{ width: 44, height: 24, background: active ? "#2AB673" : "#EBECF0", opacity: loading || (!active && !canHost) ? 0.6 : 1 }}
              onClick={() => {
                if (active) onStop();
                else if (canHost) onStart();
              }}
              disabled={loading || (!active && !canHost)}
            >
              <span
                className="absolute top-[2px] size-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{ left: active ? "22px" : "2px" }}
              />
            </button>
          </div>

          {active && collab.role === "host" && (
            <div className="rounded-[12px] px-[16px] pt-[12px] pb-[16px] flex flex-col gap-[8px] mt-[12px]" style={{ background: "rgba(245,245,244,0.5)" }}>
              <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] leading-[20px]">协同链接</p>
              <div className="flex items-center gap-[12px]">
                <div className="flex-1 min-w-0 bg-white border border-[#EBECF0] rounded-[6px] px-[16px] h-[40px] flex items-center">
                  <p className="m-0 font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] tracking-[0.08em] truncate">{collab.url}</p>
                </div>
                <button
                  type="button"
                  className="h-[40px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] font-['PingFang_SC:Regular',sans-serif] cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity whitespace-nowrap flex-shrink-0 border-0"
                  onClick={() => { void handleCopy(); }}
                >
                  {copied ? "已复制" : "复制链接"}
                </button>
              </div>
            </div>
          )}

          {active && (
            <div className="rounded-[12px] px-[16px] pt-[12px] pb-[16px] flex flex-col gap-[8px] mt-[12px]" style={{ background: "rgba(245,245,244,0.5)" }}>
              <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] leading-[20px]">在线</p>
              <div className="flex items-center gap-[8px] flex-wrap">
                <span
                  className="inline-flex items-center gap-[6px] h-[28px] px-[10px] rounded-[8px] bg-white border border-[#EBECF0] text-[12px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]"
                >
                  <span className="size-[8px] rounded-full" style={{ background: collab.localColor }} />
                  {collab.localName}（我）
                </span>
                {collab.peers.map((peer) => (
                  <span
                    key={peer.clientId}
                    className="inline-flex items-center gap-[6px] h-[28px] px-[10px] rounded-[8px] bg-white border border-[#EBECF0] text-[12px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]"
                  >
                    <span className="size-[8px] rounded-full" style={{ background: peer.color }} />
                    {peer.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!active && (
            <div className="rounded-[12px] px-[16px] pt-[12px] pb-[16px] flex flex-col gap-[8px] mt-[12px]" style={{ background: "rgba(245,245,244,0.5)" }}>
              <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] leading-[20px]">加入协同</p>
              <div className="flex items-center gap-[12px]">
                <div
                  className="flex-1 min-w-0 h-[40px] rounded-[6px] flex items-center px-[16px] box-border bg-white"
                  style={{ border: joinFocused ? "1px solid #131212" : "1px solid #EBECF0" }}
                >
                  <input
                    type="text"
                    value={joinLink}
                    placeholder="粘贴同事发来的协同链接"
                    onChange={(e) => setJoinLink(e.target.value)}
                    onFocus={() => setJoinFocused(true)}
                    onBlur={() => setJoinFocused(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
                    className="w-full bg-transparent text-[14px] text-[#131212] leading-[20px] outline-none border-0 p-0 placeholder:text-[#C0C4CC]"
                    style={{ fontFamily: "PingFang SC, sans-serif" }}
                  />
                </div>
                <button
                  type="button"
                  className={`h-[40px] px-[16px] rounded-[6px] border-0 text-white text-[14px] font-['PingFang_SC:Regular',sans-serif] whitespace-nowrap flex-shrink-0 ${
                    joinLink.trim() ? "bg-[#131212] cursor-pointer hover:opacity-90 active:opacity-80" : "bg-[#C0C4CC] cursor-not-allowed"
                  }`}
                  disabled={!joinLink.trim() || loading}
                  onClick={handleJoin}
                >
                  加入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
