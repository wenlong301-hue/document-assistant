import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export function Toast({ message, type, onClose, className }: { message: string; type: "success" | "error" | "info"; onClose: () => void; className?: string }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? "bg-[#15803D]" : type === "error" ? "bg-[#E53E3E]" : "bg-[#131212]";
  return createPortal(
    <div className={`fixed top-[16px] left-1/2 -translate-x-1/2 z-[300] ${bg} text-white text-[14px] px-[16px] py-[8px] rounded-[8px] shadow-lg pointer-events-none ${className ?? ""}`}
      style={{ fontFamily: "PingFang SC, sans-serif" }}>{message}</div>,
    document.body,
  );
}
