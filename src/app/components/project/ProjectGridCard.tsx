import React, { useEffect, useRef, useState } from "react";
import type { Project } from "@/app/document/types";
import { ContextMenuItem, ContextMenuPanel } from "@/app/components/shared/ContextMenu";
import { getDropdownPosition } from "./getDropdownPosition";
import { FileProjectIcon } from "./icons/FileProjectIcon";
import { FolderIconActive } from "./icons/FolderIconActive";
import { FolderIconDefault } from "./icons/FolderIconDefault";
import { MoreIcon } from "./icons/MoreIcon";
import { FolderOpenIcon } from "./icons/FolderOpenIcon";

function PlusIcon16() {
  return (
    <svg className="block size-full" fill="none" viewBox="0 0 16 16">
      <path d="M8 3.2V12.8M12.8 8H3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon16() {
  return (
    <svg className="block size-full" fill="none" viewBox="0 0 16 16">
      <path
        d="M2.66663 4.11765H13.3333M5.99996 2H9.99996M10.3333 14H5.66663C4.93025 14 4.33329 13.3679 4.33329 12.5882L4.02889 4.85292C4.01311 4.45189 4.3159 4.11765 4.69498 4.11765H11.3049C11.684 4.11765 11.9868 4.45189 11.971 4.85292L11.6666 12.5882C11.6666 13.3679 11.0697 14 10.3333 14Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProjectGridCard({
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
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || moreButtonRef.current?.contains(target)) return;
      setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // 激活态（悬浮/选中）：背景 #F7F8FA + 显示更多
  const isActive = isHovered || isSelected || showMenu;
  const pathText = project.filePath || project.folderPath || "本地项目";

  // 布局（全部在卡片内）:
  // 图标 top:22 h:48 → 底 70；标题 top:90 (图标下 20px) h:20；
  // 路径 top:112 (标题下 2px) h:14；路径底 126 + 底边距 12 = 卡片高 138
  return (
    <div
      className={`relative shrink-0 w-[142px] h-[138px] box-border overflow-hidden rounded-[6px] cursor-pointer transition-colors duration-150 ${
        isActive ? "bg-[#F7F8FA]" : "bg-transparent"
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 更多：仅悬浮/选中时显示三点图标；未激活不渲染 */}
      {isActive && (
        <button
          type="button"
          className={`absolute top-[8px] right-[8px] size-[16px] flex items-center justify-center rounded-[4px] z-10 border-0 p-0 outline-none appearance-none transition-colors ${
            isMoreHovered || showMenu ? "bg-[#EBECF0]" : "bg-transparent"
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
          aria-label="更多"
        >
          <MoreIcon />
        </button>
      )}

      <div className="absolute left-1/2 -translate-x-1/2 top-[22px] w-[52px] h-[48px] flex items-center justify-center">
        {project.filePath ? (
          <FileProjectIcon className="w-[52px] h-[48px] block" />
        ) : isActive ? (
          <FolderIconActive />
        ) : (
          <FolderIconDefault />
        )}
      </div>

      <p
        className="absolute left-[8px] top-[90px] w-[126px] h-[20px] m-0 text-center text-[14px] leading-[20px] font-normal text-[#131212] truncate"
        title={project.name}
      >
        {project.name}
      </p>
      <p
        className="absolute left-[8px] top-[112px] w-[126px] h-[14px] m-0 text-center text-[10px] leading-[14px] text-[#8D8E99] truncate"
        style={{ fontWeight: 300 }}
        title={pathText}
      >
        {pathText}
      </p>

      {showMenu && (
        <ContextMenuPanel menuRef={menuRef} style={menuPosition}>
          <ContextMenuItem
            icon={<PlusIcon16 />}
            label="新建文件"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onNewFile();
            }}
          />
          <ContextMenuItem
            icon={<FolderOpenIcon />}
            label="打开项目位置"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onOpenLocation();
            }}
          />
          <ContextMenuItem
            danger
            icon={<TrashIcon16 />}
            label="移除项目"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onRemove();
            }}
          />
        </ContextMenuPanel>
      )}
    </div>
  );
}
