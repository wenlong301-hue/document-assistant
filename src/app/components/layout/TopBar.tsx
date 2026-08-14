import React, { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import { BrandTitle } from "./BrandTitle";
import { SaveButton } from "./SaveButton";
import { ImportButton } from "./ImportButton";
import { ExportButton } from "./ExportButton";
import { ShareButton } from "./ShareButton";
import { DeleteButton } from "./DeleteButton";
import { HelpButton } from "./HelpButton";
import { MoreButton } from "./MoreButton";

export function TopBar({ onOpenShare, onOpenExport, onDelete, onImport, onSave, onSaveAsMdoc, onOpenHelp, level, projectName, onBack, shareDisabled = false, saveDisabled = false, saveAsDisabled = false }: {
  onOpenShare: () => void;
  onOpenExport: () => void;
  onDelete: () => void;
  onImport: () => void;
  onSave: () => void;
  onSaveAsMdoc: () => void;
  onOpenHelp: () => void;
  level?: "projects" | "project";
  projectName?: string;
  onBack?: () => void;
  shareDisabled?: boolean;
  saveDisabled?: boolean;
  saveAsDisabled?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isProjectLevel = level === "project";
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
  const saveAsShortcut = isMac ? "⇧⌘S" : "Ctrl+Shift+S";

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
          className={`transition-all duration-150 rounded-[6px] ${saveDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-75 active:scale-95 active:opacity-60"}`}
          onClick={saveDisabled ? undefined : onSave}
          title={saveDisabled ? "请先选择文档" : "保存到原文件或默认库"}
        >
          <SaveButton />
        </div>
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onImport}><ImportButton /></div>
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onOpenExport}><ExportButton /></div>
        <div
          className={`transition-all duration-150 rounded-[6px] ${shareDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95"}`}
          onClick={shareDisabled ? undefined : onOpenShare}
          title={shareDisabled ? "请选择文件后再分享" : undefined}
        >
          <ShareButton />
        </div>
        <div className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]" onClick={onDelete}><DeleteButton /></div>
        <div className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]" onClick={onOpenHelp}><HelpButton /></div>
        <div className="relative shrink-0" ref={moreRef}>
          <div
            className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]"
            onClick={() => setMoreOpen((v) => !v)}
            title="更多"
            aria-label="更多"
          >
            <MoreButton />
          </div>
          {moreOpen && (
            <div className="absolute right-0 top-[38px] z-[100] min-w-[180px] rounded-[8px] border border-[#ebecf0] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <button
                type="button"
                disabled={saveAsDisabled}
                className={`w-full flex items-center justify-between gap-[16px] px-[12px] py-[8px] text-left text-[14px] ${
                  saveAsDisabled
                    ? "text-[#c0c4cc] cursor-not-allowed"
                    : "text-[#131212] hover:bg-[#f5f6f8] cursor-pointer"
                }`}
                onClick={() => {
                  if (saveAsDisabled) return;
                  setMoreOpen(false);
                  onSaveAsMdoc();
                }}
              >
                <span>另存为 .mdoc</span>
                <span className="text-[12px] text-[#8d8e99] whitespace-nowrap">{saveAsShortcut}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
