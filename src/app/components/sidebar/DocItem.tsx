import React, { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import { DocContextMenu } from "./DocContextMenu";

export function DocItem({ name, active, onClick, onRename, onDelete, onExport, onEnterOutline, isFolderFile }: {
  name: string;
  active?: boolean;
  onClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onEnterOutline?: () => void;
  isFolderFile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const highlighted = active || hovered || menuOpen;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.(".doc-context-menu")) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleExport = () => {
    setMenuOpen(false);
    onExport?.();
  };

  return (
    <div
      ref={ref}
      className={`h-[36px] relative rounded-[8px] shrink-0 w-full transition-colors cursor-pointer ${highlighted ? "bg-[#EBECF0]" : ""}`}
      onClick={() => { onClick?.(); onEnterOutline?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-row items-center size-full px-[8px] py-[8px] gap-[8px]">
        <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative">
          {isFolderFile ? (
            <img src={assetUrl("icons/file-tree.svg")} alt="" className="size-[16px] shrink-0" />
          ) : (
            <img src={assetUrl("icons/folder-tree.svg")} alt="" className="size-[16px] shrink-0" />
          )}
          <p className="[word-break:break-word] flex-[1_0_0] font-['PingFang_SC:Regular',sans-serif] leading-[normal] min-w-px overflow-hidden relative text-[14px] text-ellipsis whitespace-nowrap" style={{ color: highlighted ? "#131212" : "#8D8E99" }}>
            {name}
          </p>
        </div>
        <div
          className="relative shrink-0 size-[16px] transition-opacity rounded-[4px] hover:bg-[#d5d6da]"
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            setMenuPos({ x: r.right - 134, y: r.bottom + 4 });
            setMenuOpen((v) => !v);
          }}
        >
          <img src={assetUrl("icons/dot-vertical.svg")} alt="" className="size-[16px]" />
        </div>
      </div>
      {menuOpen && (
        <DocContextMenu
          position={menuPos}
          onRename={() => { setMenuOpen(false); onRename?.(); }}
          onExport={handleExport}
          onDelete={() => { setMenuOpen(false); onDelete?.(); }}
        />
      )}
    </div>
  );
}
