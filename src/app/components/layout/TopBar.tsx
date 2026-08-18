import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import { BrandTitle } from "./BrandTitle";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";
import { MoreButton } from "./MoreButton";
import { ContextMenuItem, ContextMenuPanel } from "@/app/components/shared/ContextMenu";
import svgPaths from "@/imports/首页文档模式/svg-8pwaal4bp9";

function SaveAsButton() {
  return (
    <div className="bg-white flex items-center justify-center h-[32px] px-[12px] relative rounded-[8px] shrink-0">
      <div aria-hidden className="absolute border border-[#EBECF0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="relative font-['PingFang_SC:Regular',sans-serif] leading-none not-italic text-[14px] text-[#131212] whitespace-nowrap">另存为</p>
    </div>
  );
}

function MenuIcon({ d }: { d: string }) {
  return (
    <svg className="block size-full" fill="none" viewBox="0 0 16 16">
      <path d={d} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
    </svg>
  );
}

function HelpMenuIcon() {
  return (
    <svg className="block size-full" fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.6 6.2c0-1 .8-1.8 1.8-1.8s1.8.7 1.8 1.7c0 .9-.6 1.3-1.2 1.7-.4.2-.6.4-.6.8v.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
      <circle cx="8" cy="11.4" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function TopBar({ onOpenShare, onOpenExport, onDelete, onImport, onSave, onSaveAsMdoc, onOpenHelp, onOpenSettings, level, projectName, onBack, shareDisabled = false, saveDisabled = false, saveAsDisabled = false }: {
  onOpenShare: () => void;
  onOpenExport: () => void;
  onDelete: () => void;
  onImport: () => void;
  onSave: () => void;
  onSaveAsMdoc: () => void;
  onOpenHelp: () => void;
  onOpenSettings?: () => void;
  level?: "projects" | "project";
  projectName?: string;
  onBack?: () => void;
  shareDisabled?: boolean;
  saveDisabled?: boolean;
  saveAsDisabled?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const isProjectLevel = level === "project";

  useEffect(() => {
    if (!moreOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  useLayoutEffect(() => {
    if (!moreOpen || !moreRef.current) {
      setMenuPos(null);
      return;
    }
    const rect = moreRef.current.getBoundingClientRect();
    const width = 158;
    const margin = 8;
    let left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    setMenuPos({ top: rect.bottom + 4, left });
  }, [moreOpen]);

  const moreItems = [
    {
      label: "导入",
      icon: <MenuIcon d={svgPaths.p3809f980} />,
      action: () => { setMoreOpen(false); onImport(); },
    },
    {
      label: "导出",
      icon: <MenuIcon d={svgPaths.p1de75680} />,
      action: () => { setMoreOpen(false); onOpenExport(); },
    },
    {
      label: "删除",
      danger: true,
      icon: <MenuIcon d={svgPaths.p1db5f00} />,
      action: () => { setMoreOpen(false); onDelete(); },
    },
    {
      label: "设置",
      icon: (
        <svg className="block size-full" fill="none" viewBox="0 0 16 16">
          <path d="M6.5 2.5h3l.4 1.3c.3.1.6.3.9.5l1.3-.4.9.9-.4 1.3c.2.3.4.6.5.9l1.3.4v3l-1.3.4c-.1.3-.3.6-.5.9l.4 1.3-.9.9-1.3-.4c-.3.2-.6.4-.9.5L9.5 13.5h-3l-.4-1.3c-.3-.1-.6-.3-.9-.5l-1.3.4-.9-.9.4-1.3c-.2-.3-.4-.6-.5-.9L2.5 9.5v-3l1.3-.4c.1-.3.3-.6.5-.9L3.9 3.9l.9-.9 1.3.4c.3-.2.6-.4.9-.5L6.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      ),
      action: () => { setMoreOpen(false); onOpenSettings?.(); },
    },
    {
      label: "帮助",
      icon: <HelpMenuIcon />,
      action: () => { setMoreOpen(false); onOpenHelp(); },
    },
  ];

  return (
    <div className="absolute content-stretch flex h-[66px] items-center justify-between left-0 right-0 pl-[20px] pr-[8px] py-[16px] top-0">
      {isProjectLevel ? (
        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 cursor-pointer" onClick={onBack}>
          <img src={assetUrl("icons/arrow-left.svg")} alt="" className="size-[28px]" />
          <p className="font-['PingFang_SC:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[20px] text-[#131212] whitespace-nowrap">
            {projectName || ""}
          </p>
        </div>
      ) : (
        <BrandTitle />
      )}
      <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
        <div
          className={`transition-all duration-150 rounded-[8px] ${saveDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-75 active:scale-95 active:opacity-60"}`}
          onClick={saveDisabled ? undefined : onSave}
          title={saveDisabled ? "请先选择文档" : "保存到原文件或默认库"}
        >
          <SaveButton />
        </div>
        <div
          className={`transition-all duration-150 rounded-[8px] ${saveAsDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] active:scale-95"}`}
          onClick={saveAsDisabled ? undefined : onSaveAsMdoc}
          title={saveAsDisabled ? "请先选择文档" : "另存为 .mdoc"}
        >
          <SaveAsButton />
        </div>
        <div
          className={`transition-all duration-150 rounded-[8px] ${shareDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] active:scale-95"}`}
          onClick={shareDisabled ? undefined : onOpenShare}
          title={shareDisabled ? "请选择文件后再分享" : undefined}
        >
          <ShareButton />
        </div>
        <div className="relative shrink-0" ref={moreRef}>
          <div
            className="cursor-pointer transition-all duration-150 hover:bg-[#F7F8FA] active:bg-[#EBECF0] active:scale-95 rounded-[8px]"
            onClick={() => setMoreOpen((v) => !v)}
            title="更多"
            aria-label="更多"
          >
            <MoreButton />
          </div>
          {moreOpen && menuPos && (
            <ContextMenuPanel
              menuRef={menuRef}
              width={158}
              style={{ left: menuPos.left, top: menuPos.top }}
            >
              {moreItems.map(({ label, danger, icon, action }) => (
                <ContextMenuItem
                  key={label}
                  danger={!!danger}
                  label={label}
                  icon={icon}
                  onClick={action}
                />
              ))}
            </ContextMenuPanel>
          )}
        </div>
      </div>
    </div>
  );
}
