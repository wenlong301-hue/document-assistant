import React, { useState } from "react";
import type { OutlineNode } from "@/app/document/types";
import outlineSvg from "@/imports/首页大纲模式根节点/svg-4qt61e0wiv";
import svgPaths from "@/imports/首页文档模式/svg-8pwaal4bp9";
import { OutlineNodeMenu } from "./OutlineNodeMenu";
import type { DragState, OutlineMenuHandlers } from "./types";

export function OutlineTreeNode({ node, depth, selectedId, expandedIds, dragState, onSelect, onToggle, onDragStart, onDragOver, onDrop, onDragEnd, menuHandlers, allExpanded }: {
  node: OutlineNode; depth: number; selectedId: string; expandedIds: Set<string>; dragState: DragState;
  onSelect: (id: string) => void; onToggle: (id: string) => void;
  onDragStart: (id: string, isRoot: boolean) => void; onDragOver: (id: string) => void;
  onDrop: (targetId: string, targetIsRoot: boolean) => void; onDragEnd: () => void;
  menuHandlers: OutlineMenuHandlers; allExpanded?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isSelected = node.id === selectedId;
  const isExpanded = allExpanded || expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isRoot = depth === 0;
  const isDragOver = dragState?.overId === node.id && dragState?.sourceId !== node.id;
  const color = isSelected ? "#131212" : "#8D8E99";
  const showControls = isSelected || hovered;
  const paddingLeft = 8 + depth * 16;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(node.id, isRoot); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(node.id); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(node.id, isRoot); }}
        onDragEnd={onDragEnd}
        className={`h-[36px] relative rounded-[8px] shrink-0 w-full flex items-center cursor-pointer transition-colors select-none
          ${isSelected ? "bg-[#ebecf0]" : hovered ? "bg-[#f5f6f8]" : ""}
          ${isDragOver ? "ring-[1.5px] ring-[#134CFF] ring-inset" : ""}`}
        style={{ paddingLeft, paddingRight: 8 }}
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 6-dot drag handle */}
        <div className={`relative shrink-0 size-[16px] mr-[4px] cursor-grab transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
          <svg className="block size-full" fill="none" viewBox="0 0 16 16">
            <path d={outlineSvg.p35237700} fill={color} />
            <path d={outlineSvg.p11f9c500} fill={color} />
            <path d={outlineSvg.p1bbe0b00} fill={color} />
            <path d={outlineSvg.p1cb9c000} fill={color} />
            <path d={outlineSvg.p26b22b00} fill={color} />
            <path d={outlineSvg.pf7f1a00} fill={color} />
          </svg>
        </div>
        {/* expand/collapse arrow with background */}
        <div
          className={`overflow-clip relative rounded-[4px] shrink-0 size-[20px] mr-[4px] flex items-center justify-center
            ${isSelected && hasChildren ? "bg-[#dadbdf]" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
        >
          {hasChildren && (
            <svg className="block size-[12px]" fill="none" viewBox="0 0 12 12">
              <path d={isExpanded ? outlineSvg.p32aa7080 : outlineSvg.p2c70bb70} fill={isSelected ? "#131212" : "#8D8E99"} />
            </svg>
          )}
        </div>
        {/* name */}
        <p className="flex-1 min-w-0 font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] truncate" style={{ color }}>
          {node.name}
        </p>
        {/* more button */}
        <div
          className={`relative shrink-0 size-[16px] ml-[4px] transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            menuHandlers.onMore(node.id, { x: r.right - 180, y: r.bottom + 4 });
          }}
        >
          <svg className="block size-full" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.pa91b600} fill={color} />
            <path d={svgPaths.p12e0c1f2} fill={color} />
            <path d={svgPaths.p20e27070} fill={color} />
          </svg>
        </div>
      </div>
      {menuHandlers.menuState?.id === node.id && menuHandlers.menuState?.rect && (
        <OutlineNodeMenu
          nodeId={node.id}
          includeInPreview={menuHandlers.getIncludeInPreview(node.id)}
          position={menuHandlers.menuState.rect}
          onClose={menuHandlers.onMenuClose}
          onAddChild={menuHandlers.onAddChild}
          onRename={menuHandlers.onRename}
          onCopyLink={menuHandlers.onCopyLink}
          onTogglePreview={menuHandlers.onTogglePreview}
          onExportHtml={menuHandlers.onExportHtml}
          onClone={menuHandlers.onClone}
          onDelete={menuHandlers.onDelete}
        />
      )}
      {hasChildren && isExpanded && node.children.map((child) => (
        <OutlineTreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId}
          expandedIds={expandedIds} dragState={dragState} onSelect={onSelect} onToggle={onToggle}
          onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
          menuHandlers={menuHandlers} allExpanded={allExpanded} />
      ))}
    </>
  );
}

