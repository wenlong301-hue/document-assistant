import React, { useRef } from "react";
import { useAutoHideScrollbar } from "@/app/shared/hooks/useAutoHideScrollbar";
import { DocItem } from "./DocItem";

export type SidebarItem = { key: string; label: string; isFolderFile?: boolean };

export function DocList({ items, selected, onSelect, onRename, onDelete, onExport, onEnterOutline, emptyHint }: {
  items: SidebarItem[];
  selected: string;
  onSelect: (key: string) => void;
  onRename: (key: string) => void;
  onDelete: (key: string) => void;
  onExport: (key: string) => void;
  onEnterOutline: () => void;
  emptyHint?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useAutoHideScrollbar(scrollRef);
  return (
    <>
      <div className="scroll-auto-hide absolute left-[20px] top-[210px] bottom-[40px] w-[276px] min-h-0 overflow-x-hidden overflow-y-auto flex flex-col gap-[4px] items-start"
        ref={scrollRef}>
        {items.length === 0 && emptyHint && (
          <div className="px-[8px] py-[24px] self-stretch text-center text-[13px] text-[#8d8e99] select-none">{emptyHint}</div>
        )}
        {items.map((item) => (
          <DocItem
            key={item.key}
            name={item.label}
            isFolderFile={item.isFolderFile}
            active={selected === item.key}
            onClick={() => onSelect(item.key)}
            onRename={() => onRename(item.key)}
            onDelete={() => onDelete(item.key)}
            onExport={() => onExport(item.key)}
            onEnterOutline={onEnterOutline}
          />
        ))}
      </div>
    </>
  );
}
