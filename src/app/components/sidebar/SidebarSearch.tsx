import React from "react";
import svgPaths from "@/imports/首页文档模式/svg-8pwaal4bp9";

export function SidebarSearch({ value, onChange, mode, onEnter }: { value: string; onChange: (v: string) => void; mode: "document" | "outline"; onEnter?: () => void }) {
  return (
    <div className="absolute left-[20px] top-[78px] w-[276px] h-[32px]">
      <div className="relative w-full h-full rounded-[8px] bg-white border border-solid border-[#EBECF0] focus-within:border-[#131212] transition-all duration-150">
        <svg className="absolute left-[8px] top-1/2 -translate-y-1/2 size-[16px] pointer-events-none" fill="none" viewBox="0 0 16 16">
          <path d={svgPaths.p4ffd040} stroke="#8F959E" strokeLinecap="round" strokeWidth="1.2" />
        </svg>
        <input
          type="text"
          placeholder={mode === "outline" ? "搜索大纲" : "搜索文件"}
          value={value}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            onEnter?.();
          }}
          className="absolute inset-0 w-full h-full bg-transparent rounded-[8px] pl-[32px] pr-[8px] text-[14px] text-[#131212] outline-none placeholder:text-[#C0C4CC]"
          style={{ fontFamily: "PingFang SC, sans-serif" }}
        />
      </div>
    </div>
  );
}
