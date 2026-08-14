import React, { useEffect, useRef, useState } from "react";
import type { Project } from "@/app/document/types";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import { getDropdownPosition } from "./getDropdownPosition";
import { FileProjectIcon } from "./icons/FileProjectIcon";
import { MoreIcon } from "./icons/MoreIcon";
import { MoreIconActive } from "./icons/MoreIconActive";
import { FolderOpenIcon } from "./icons/FolderOpenIcon";

export function ProjectListRow({
  project,
  isSelected,
  onClick,
  onNewFile,
  onOpenLocation,
  onRemove,
}: {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
  onNewFile: () => void;
  onOpenLocation: () => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMoreHovered, setIsMoreHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const showMore = isHovered || isSelected;

  return (
    <div
      className={`flex items-center self-stretch px-[12px] py-[8px] cursor-pointer transition-colors duration-150 rounded-[8px] ${
        isSelected ? "bg-[#F7F8FA]" : "hover:bg-[#f5f6f8]"
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-[12px] flex-[3] min-w-0">
        <div className="flex items-center justify-center w-[24px] h-[24px] shrink-0">
          {project.filePath ? <FileProjectIcon className="w-[24px] h-[24px] shrink-0" /> : <img src={assetUrl("icons/folder-icon.svg")} alt="" className="w-[24px] h-[24px] shrink-0" />}
        </div>
        <span className="text-[14px] text-[#131212] truncate">{project.name}</span>
      </div>
      <div className="flex items-center flex-[2] min-w-0">
        <span className="text-[14px] text-[#8D8E99] truncate" style={{ fontWeight: 300 }}>
          {project.filePath || project.folderPath || "-"}
        </span>
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          className={`size-[16px] flex items-center justify-center rounded-[4px] transition-all ${
            showMore
              ? isMoreHovered
                ? "bg-[#d5d6da] opacity-100"
                : "bg-transparent opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
          ref={moreButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            const anchor = moreButtonRef.current?.getBoundingClientRect();
            if (anchor) setMenuPosition(getDropdownPosition(anchor));
            setShowMenu(!showMenu);
          }}
          onMouseEnter={() => setIsMoreHovered(true)}
          onMouseLeave={() => setIsMoreHovered(false)}
        >
        {isMoreHovered ? <MoreIcon /> : <MoreIconActive />}
        </button>
        {showMenu && (
          <div className="fixed z-50 w-[160px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]" style={menuPosition}>
            <div
              className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212]"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onNewFile(); }}
            >
              <div className="relative shrink-0 size-[16px]">
                <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">
                  <path d="M8 3V13M3 8H13" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>新建文件</p>
            </div>
            <div
              className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212]"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onOpenLocation(); }}
            >
              <FolderOpenIcon />
              <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>打开项目位置</p>
            </div>
            <div className="h-[1px] bg-[#EBECF0] my-[4px]" />
            <div
              className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#fff1f0] text-[#ff4d4f]"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onRemove(); }}
            >
              <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" transform="rotate(45 8 8)" />
              </svg>
              <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>移除项目</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

