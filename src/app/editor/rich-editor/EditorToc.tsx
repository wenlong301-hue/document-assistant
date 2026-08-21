import React from "react";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import type { TocHeading } from "./types";

export function EditorToc({
  tocListRef,
  tocButtonRefs,
  tocHeadings,
  tocActiveId,
  onScrollToHeading,
}: {
  tocListRef: React.RefObject<HTMLDivElement | null>;
  tocButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  tocHeadings: TocHeading[];
  tocActiveId: string | null;
  onScrollToHeading: (id: string) => void;
}) {
  return (
    <div className="w-[264px] max-w-[264px] shrink-0 min-w-0 min-h-0 self-stretch pt-[24px] pb-[12px] overflow-hidden hidden xl:flex xl:flex-col gap-[4px] box-border">
      <div className="flex items-center gap-[8px] shrink-0 min-w-0">
        <img src={assetUrl("icons/figma-ref/menu-02.svg")} alt="" width={16} height={16} className="size-4 shrink-0" />
        <p className="font-['PingFang_SC:Regular',sans-serif] font-normal text-[#3F4046] text-[14px] leading-[24px]">在本页</p>
      </div>
      <div ref={tocListRef} className="h-0 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        {tocHeadings.length === 0 ? <p className="text-[#b8bbc4] text-[14px] leading-[24px] font-normal">暂无标题</p> : tocHeadings.map((h) => {
          const level = Math.min(Math.max(Number(h.tag.slice(1)) || 1, 1), 6);
          const padLeft = (level - 1) * 16;
          const isActive = tocActiveId === h.id;
          return (
            <button
              key={`${h.id}-${h.text}`}
              ref={(element) => {
                if (element) tocButtonRefs.current.set(h.id, element);
                else tocButtonRefs.current.delete(h.id);
              }}
              type="button"
              title={h.text}
              className={`block w-full max-w-full min-w-0 shrink-0 h-8 text-left font-['PingFang_SC:Regular',sans-serif] font-normal text-[14px] leading-[24px] py-1 truncate bg-transparent border-0 outline-none appearance-none ${isActive ? "text-[#134CFF]" : "text-[#505257] hover:text-[#3F4046]"}`}
              style={{ paddingLeft: `${padLeft}px`, paddingRight: 0 }}
              onClick={() => { onScrollToHeading(h.id); }}
            >
              {h.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
