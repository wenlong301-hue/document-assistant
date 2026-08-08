import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLOR_PRESETS, normalizeHexColor } from "../constants";

export function ColorPicker({
  onSelect,
  onClose,
  position,
  currentColor,
  mode = "fore",
}: {
  onSelect: (color: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
  currentColor: string;
  mode?: "fore" | "back";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = normalizeHexColor(currentColor, mode === "back" ? "#fef0f0" : "#000000");
  const [customColor, setCustomColor] = useState(initial);
  const [previewColor, setPreviewColor] = useState(initial);
  useEffect(() => {
    const next = normalizeHexColor(currentColor, mode === "back" ? "#fef0f0" : "#000000");
    setCustomColor(next);
    setPreviewColor(next);
  }, [currentColor, mode]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = window.setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);
  const applyColor = (color: string) => {
    const next = normalizeHexColor(color, previewColor);
    setCustomColor(next);
    setPreviewColor(next);
    onSelect(next);
  };
  return createPortal(
    <div
      ref={ref}
      className="fixed z-[280] bg-white rounded-[12px] shadow-[0px_12px_24px_-4px_rgba(36,36,36,0.12)] border border-[#ebecf0] p-[12px] w-[260px]"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-[8px]">
        <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px]">{mode === "back" ? "背景颜色" : "文字颜色"}</p>
        <button type="button" className="size-[20px] flex items-center justify-center rounded-[4px] hover:bg-[#f5f6f8] cursor-pointer text-[#8d8e99]" onClick={onClose}>&times;</button>
      </div>
      <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] mb-[6px]">预设颜色</p>
      <div className="h-[28px] rounded-[6px] border border-[#d0d0d0] mb-[10px]" style={{ background: previewColor }} />
      <div className="grid grid-cols-10 gap-[3px] mb-[10px]">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={`size-[20px] rounded-[3px] cursor-pointer transition-transform border p-0 ${c === previewColor ? "border-[#131212] scale-110" : "border-[rgba(0,0,0,0.1)] hover:scale-110 hover:border-[#131212]"}`}
            style={{ background: c }}
            onMouseEnter={() => setPreviewColor(c)}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyColor(c);
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-[8px] border-t border-[#ebecf0] pt-[8px]">
        <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] shrink-0">自定义</p>
        <label className="relative size-[28px] shrink-0 rounded-[4px] flex items-center justify-center cursor-pointer hover:bg-[#f5f6f8] transition-colors">
          <svg className="block size-[16px]" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M8.00027 4V4.02215M4.02225 8.00017H4.0001M10.8287 5.1717L10.8131 5.18736M5.18755 10.8129L5.17188 10.8285M5.18755 5.18711L5.17188 5.17144M8.0001 14.4C4.46548 14.4 1.6001 11.5346 1.6001 8C1.6001 4.46538 4.46548 1.6 8.0001 1.6C11.5347 1.6 14.4001 4.46538 14.4001 8C14.4001 9.07604 13.4058 9.792 12.3298 9.792H11.9121C11.6964 9.792 11.4837 9.84221 11.2907 9.93867C10.6044 10.2818 10.3263 11.1164 10.6694 11.8026C10.7659 11.9956 10.8161 12.2083 10.8161 12.424V12.5501C10.8161 13.2838 10.4044 13.9786 9.69676 14.1727C9.15641 14.3209 8.58749 14.4 8.0001 14.4Z" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="color"
            value={normalizeHexColor(customColor, previewColor)}
            onChange={(e) => applyColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer border-none p-0"
            title="选择颜色"
          />
        </label>
        <input
          type="text"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 h-[28px] rounded-[4px] border border-[#ebecf0] px-[8px] text-[12px] text-[#131212] outline-none focus:border-[#134CFF]"
          style={{ fontFamily: "monospace" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && /^#[0-9a-fA-F]{3,6}$/.test((e.target as HTMLInputElement).value)) {
              applyColor((e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
