import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ContextMenuPanel } from "../../components/shared/ContextMenu";

export function Dropdown({ items, onSelect, onClose, position }: { items: string[]; onSelect: (v: string) => void; onClose: () => void; position: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const timer = window.setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  return createPortal(
    <ContextMenuPanel
      menuRef={ref}
      width={120}
      className="z-[280]"
      style={{ left: position.x, top: position.y, width: "auto", minWidth: 120 }}
    >
      {items.map((item) => {
        const bg =
          activeKey === item ? "#EBECF0" : hoverKey === item ? "#F7F8FA" : "transparent";
        return (
          <button
            key={item}
            type="button"
            className="flex items-center gap-[8px] h-[32px] px-[12px] box-border rounded-[4px] text-[14px] font-normal text-[#131212] cursor-pointer transition-colors whitespace-nowrap text-left border-0 outline-none font-['PingFang_SC:Regular',sans-serif]"
            style={{
              fontFamily: "PingFang SC, sans-serif",
              fontWeight: 400,
              backgroundColor: bg,
              appearance: "none",
              WebkitAppearance: "none",
            }}
            onMouseEnter={() => setHoverKey(item)}
            onMouseLeave={() => {
              setHoverKey(null);
              setActiveKey(null);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveKey(item);
              onSelect(item);
              onClose();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >{item}</button>
        );
      })}
    </ContextMenuPanel>,
    document.body,
  );
}
