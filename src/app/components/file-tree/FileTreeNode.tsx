import React, { useState } from "react";
import type { FolderTreeNode } from "@/app/document/types";
import outlineSvg from "@/imports/首页大纲模式根节点/svg-4qt61e0wiv";
import svgPaths from "@/imports/首页文档模式/svg-8pwaal4bp9";
import { FolderIcon } from "./FolderIcon";
import { DocumentIcon } from "./DocumentIcon";

export function FileTreeNode({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggleExpand,
  onContextMenu,
}: {
  node: FolderTreeNode;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onSelect: (node: FolderTreeNode) => void;
  onToggleExpand: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FolderTreeNode) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.isDirectory && node.children && node.children.length > 0;
  const [hovered, setHovered] = useState(false);
  const color = isSelected ? "#131212" : "#8D8E99";
  const iconColor = isSelected || hovered ? "#131212" : "#8D8E99";
  const showControls = isSelected || hovered;

  const handleClick = () => {
    onSelect(node);
  };

  return (
    <div>
      <div
        className={`h-[36px] relative rounded-[8px] shrink-0 w-full flex items-center cursor-pointer transition-colors select-none
          ${isSelected ? "bg-[#EBECF0]" : hovered ? "bg-[#f5f6f8]" : ""}`}
        style={{ paddingLeft: 8 + depth * 16, paddingRight: 8 }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* expand/collapse arrow with background */}
        <div
          className={`overflow-clip relative rounded-[4px] shrink-0 size-[20px] mr-[4px] flex items-center justify-center
            ${isSelected && hasChildren ? "bg-[#dadbdf]" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleExpand(node.path); }}
        >
          {hasChildren && (
            <svg className="block size-[12px]" fill="none" viewBox="0 0 12 12">
              <path d={isExpanded ? outlineSvg.p32aa7080 : outlineSvg.p2c70bb70} fill={isSelected ? "#131212" : "#8D8E99"} />
            </svg>
          )}
        </div>

        {/* Icon */}
        {node.isDirectory ? <FolderIcon color={iconColor} /> : <DocumentIcon color={iconColor} />}

        {/* Name */}
        <span className="flex-1 min-w-0 text-[14px] truncate" style={{ color }}>
          {node.name}
        </span>

        {/* More button */}
        <div
          className={`relative shrink-0 size-[16px] ml-[4px] transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}
          onClick={(e) => { e.stopPropagation(); onContextMenu(e, node); }}
        >
          <svg className="block size-full" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.pa91b600} fill={color} />
            <path d={svgPaths.p12e0c1f2} fill={color} />
            <path d={svgPaths.p20e27070} fill={color} />
          </svg>
        </div>
      </div>

    </div>
  );
}

