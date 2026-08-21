import React from "react";
import { createPortal } from "react-dom";
import { ContextMenuPanel } from "../../components/shared/ContextMenu";
import type { SlashItem, SlashMenuState } from "./types";

export function EditorSlashMenu({
  slashMenu,
  slashMenuElRef,
  slashItems,
  slashActive,
  slashPressIdx,
  setSlashActive,
  setSlashPressIdx,
  runSlashAction,
  runSlashFileAction,
}: {
  slashMenu: SlashMenuState;
  slashMenuElRef: React.RefObject<HTMLDivElement | null>;
  slashItems: SlashItem[];
  slashActive: number;
  slashPressIdx: number | null;
  setSlashActive: React.Dispatch<React.SetStateAction<number>>;
  setSlashPressIdx: (value: number | null) => void;
  runSlashAction: (action: () => void) => void;
  runSlashFileAction: (action: () => void) => void;
}) {
  return createPortal(
    <ContextMenuPanel
      menuRef={slashMenuElRef}
      width={180}
      className="z-[280] overflow-y-auto overscroll-contain"
      style={{ left: slashMenu.left, top: slashMenu.top, maxHeight: slashMenu.maxHeight ?? "min(70vh, 480px)" }}
    >
      {slashItems.map((item, idx) => {
        const bg = slashPressIdx === idx ? "#EBECF0" : idx === slashActive ? "#F7F8FA" : "transparent";
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            data-slash-idx={idx}
            aria-selected={idx === slashActive}
            className="w-full flex items-center gap-[8px] h-[32px] px-[12px] box-border rounded-[4px] cursor-pointer transition-colors text-left border-0 outline-none"
            style={{ appearance: "none", WebkitAppearance: "none", backgroundColor: bg }}
            onMouseEnter={() => setSlashActive(idx)}
            onMouseLeave={() => {
              setSlashPressIdx(null);
              setSlashActive((cur) => (cur === idx ? -1 : cur));
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (item.kind !== "file") e.preventDefault();
              setSlashPressIdx(idx);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (item.kind === "file") runSlashFileAction(item.action);
              else runSlashAction(item.action);
            }}
          >
            <div className="size-[20px] flex items-center justify-center text-[11px] font-bold text-[#131212] shrink-0">{item.icon}</div>
            <span className="text-[14px] leading-none text-[#131212] font-['PingFang_SC:Regular',sans-serif] whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </ContextMenuPanel>,
    document.body,
  );
}
