import React, { useEffect, useRef, useState } from "react";
import { ROLE_LABEL, type CloudProject, type CloudRole } from "@/app/cloud/api";
import { ContextMenuDivider, ContextMenuItem, ContextMenuPanel } from "@/app/components/shared/ContextMenu";
import { getDropdownPosition } from "../getDropdownPosition";
import { MoreIcon } from "../icons/MoreIcon";

export function CloudCardIcon({ className = "size-[48px]" }: { className?: string }) {
  return (
    <svg className={`block text-[#8D8E99] group-hover:text-[#131212] transition-colors ${className}`} viewBox="0 0 48 48" fill="none">
      <path
        d="M15.5 35.5h19a7 7 0 0 0 .9-13.94A10 10 0 0 0 16.4 20.1a7.8 7.8 0 0 0-.9 15.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20.5 24.5h9M20.5 28.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MembersIcon16() {
  return (
    <svg className="block size-full" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5.2" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.2 13c.3-2 1.8-3.2 3.8-3.2s3.5 1.2 3.8 3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.6 3.4a2 2 0 0 1 0 3.8M11.4 9.9c1.3.3 2.2 1.3 2.5 2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon16() {
  return (
    <svg className="block size-full" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.66663 4.11765H13.3333M5.99996 2H9.99996M10.3333 14H5.66663C4.93025 14 4.33329 13.3679 4.33329 12.5882L4.02889 4.85292C4.01311 4.45189 4.3159 4.11765 4.69498 4.11765H11.3049C11.684 4.11765 11.9868 4.45189 11.971 4.85292L11.6666 12.5882C11.6666 13.3679 11.0697 14 10.3333 14Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 云端项目卡片：与本地卡同尺寸/同交互（悬浮出 ⋯ 菜单） */
export function CloudProjectCard({
  project,
  isSelected,
  onClick,
  onMembers,
  onDelete,
}: {
  project: CloudProject;
  isSelected?: boolean;
  onClick: () => void;
  onMembers: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });
  const [hovered, setHovered] = useState(false);
  const [moreHovered, setMoreHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || moreRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const active = hovered || isSelected || menuOpen;

  return (
    <div
      data-cloud-project={project.id}
      title={project.name}
      className={`group relative shrink-0 w-[160px] h-[150px] box-border overflow-hidden rounded-[6px] cursor-pointer transition-colors duration-150 ${
        active ? "bg-[#F7F8FA]" : "bg-transparent"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active && (
        <button
          ref={moreRef}
          type="button"
          aria-label="更多"
          className={`absolute top-[8px] right-[8px] size-[16px] z-10 flex items-center justify-center rounded-[4px] border-0 p-0 outline-none appearance-none transition-colors ${
            moreHovered || menuOpen ? "bg-[#EBECF0]" : "bg-transparent"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            const anchor = moreRef.current?.getBoundingClientRect();
            if (anchor) setMenuPos(getDropdownPosition(anchor));
            setMenuOpen((v) => !v);
          }}
          onMouseEnter={() => setMoreHovered(true)}
          onMouseLeave={() => setMoreHovered(false)}
        >
          <MoreIcon />
        </button>
      )}

      {menuOpen && (
        <ContextMenuPanel menuRef={menuRef} style={menuPos}>
          <ContextMenuItem
            icon={<MembersIcon16 />}
            label="成员管理"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onMembers();
            }}
          />
          {project.role === "owner" && (
            <>
              <ContextMenuDivider />
              <ContextMenuItem
                danger
                icon={<TrashIcon16 />}
                label="删除云端项目"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
              />
            </>
          )}
        </ContextMenuPanel>
      )}

      <div className="absolute left-1/2 -translate-x-1/2 top-[26px] size-[48px] flex items-center justify-center">
        <CloudCardIcon />
      </div>

      <p className="absolute left-[8px] top-[96px] w-[144px] h-[20px] m-0 text-center text-[14px] leading-[20px] font-normal text-[#131212] truncate">
        {project.name}
      </p>
      <p className="absolute left-[8px] top-[118px] w-[144px] h-[14px] m-0 text-center text-[10px] leading-[14px] text-[#8D8E99] truncate">
        云端 · {ROLE_LABEL[project.role as CloudRole] || project.role}
      </p>
    </div>
  );
}
