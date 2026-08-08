import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function Dropdown({ items, onSelect, onClose, position }: { items: string[]; onSelect: (v: string) => void; onClose: () => void; position: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const timer = window.setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);
  return createPortal(
    <div
      ref={ref}
      className="fixed z-[280] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] p-[4px] flex flex-col gap-[4px] min-w-[120px]"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button key={item} type="button" className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] text-[14px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap text-left"
          style={{ fontFamily: "PingFang SC, sans-serif" }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(item);
            onClose();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}>{item}</button>
      ))}
    </div>,
    document.body,
  );
}
