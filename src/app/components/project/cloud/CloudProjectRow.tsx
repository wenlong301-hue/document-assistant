import React, { useEffect, useRef, useState } from "react";
import { ROLE_LABEL, type CloudProject, type CloudRole } from "@/app/cloud/api";
import { ContextMenuItem, ContextMenuPanel } from "@/app/components/shared/ContextMenu";
import { getDropdownPosition } from "../getDropdownPosition";
import { MoreIcon } from "../icons/MoreIcon";
import { MembersIcon16 } from "./CloudProjectCard";

function CloudMiniIcon() {
  return (
    <svg className="block size-[24px] text-[#131212]" viewBox="0 0 24 24" fill="none">
      <path
        d="M7.2 18h9.4a3.8 3.8 0 0 0 .5-7.57A5.2 5.2 0 0 0 7.6 9.3a4 4 0 0 0-.4 8.7Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.3 12.6h3.6M10.3 15.2h2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

/** 云端项目行：与本地行同结构（名称 / 位置 / ⋯） */
export function CloudProjectRow({
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
      className={`flex items-center self-stretch px-[12px] py-[8px] cursor-pointer transition-colors duration-150 rounded-[8px] ${
        active ? "bg-[#F7F8FA]" : "bg-transparent"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-[12px] flex-[3] min-w-0">
        <div className="flex items-center justify-center w-[24px] h-[24px] shrink-0">
          <CloudMiniIcon />
        </div>
        <span className="text-[14px] text-[#131212] truncate">{project.name}</span>
      </div>
      <div className="flex items-center flex-[2] min-w-0">
        <span className="text-[14px] text-[#8D8E99] truncate" style={{ fontWeight: 300 }}>
          云端 · {ROLE_LABEL[project.role as CloudRole] || project.role}
        </span>
      </div>
      <div className="relative shrink-0 size-[16px]">
        {active && (
          <button
            ref={moreRef}
            type="button"
            className={`size-[16px] flex items-center justify-center rounded-[4px] border-0 p-0 outline-none appearance-none transition-colors ${
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
            aria-label="更多"
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
            )}
          </ContextMenuPanel>
        )}
      </div>
    </div>
  );
}
