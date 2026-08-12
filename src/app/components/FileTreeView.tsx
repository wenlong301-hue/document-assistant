import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { FolderTreeNode } from "../document/types";
import outlineSvg from "../../imports/首页大纲模式根节点/svg-4qt61e0wiv";
import svgPaths from "../../imports/首页文档模式/svg-8pwaal4bp9";

// ===== SVG Icons =====
function FolderIcon({ color }: { color: string }) {
  return (
    <svg className="size-[16px] shrink-0 mr-[8px]" viewBox="0 0 16 16" fill="none">
      <path d="M1.60066 5.61132L1.60061 11.2942C1.60059 12.3988 2.49602 13.2942 3.6006 13.2942L12.3998 13.2942C13.5043 13.2942 14.3997 12.3988 14.3998 11.2943L14.3999 5.67518C14.4 5.12288 13.9522 4.67515 13.3999 4.67515H8.05577L6.21242 2.70605H2.60035C2.04792 2.70605 1.60014 3.15358 1.60031 3.70601C1.60048 4.30934 1.60067 5.06447 1.60066 5.61132Z" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DocumentIcon({ color }: { color: string }) {
  return (
    <svg className="size-[16px] shrink-0 mr-[8px]" viewBox="0 0 16 16" fill="none">
      <path d="M10.0001 1.6001V4.0001C10.0001 4.44193 10.3583 4.8001 10.8001 4.8001H13.2001M12.0001 2.8001C11.6441 2.48153 11.2746 2.10368 11.0414 1.85828C10.8862 1.69499 10.6717 1.6001 10.4464 1.6001H4.39994C3.51629 1.6001 2.79995 2.31644 2.79994 3.20009L2.79988 12.8001C2.79988 13.6837 3.51622 14.4001 4.39987 14.4001L11.5999 14.4001C12.4835 14.4001 13.1999 13.6838 13.1999 12.8001L13.2001 4.31865C13.2001 4.11409 13.1221 3.91745 12.9801 3.77019C12.7176 3.49786 12.2792 3.04978 12.0001 2.8001Z" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ===== File Tree Node Component =====
function FileTreeNode({
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

// ===== File Tree View =====
export function FileTreeView({
  nodes,
  selectedPath,
  onSelect,
  searchQuery,
  onNewFile,
  onOpenLocation,
}: {
  nodes: FolderTreeNode[];
  selectedPath: string | null;
  onSelect: (node: FolderTreeNode) => void;
  searchQuery: string;
  onNewFile?: (folderPath: string) => void;
  onOpenLocation?: (path: string) => void;
}) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FolderTreeNode } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getContextMenuPosition = useCallback((e: React.MouseEvent, node: FolderTreeNode) => {
    const margin = 8;
    const width = 160;
    const height = (node.isDirectory && onNewFile ? 45 : 0) + (onOpenLocation ? 45 : 0) + 8;
    return {
      x: Math.max(margin, Math.min(e.clientX, window.innerWidth - width - margin)),
      y: Math.max(margin, Math.min(e.clientY, window.innerHeight - height - margin)),
    };
  }, [onNewFile, onOpenLocation]);

  // Auto-expand root directories on mount
  useEffect(() => {
    // If single root directory, expand its children instead
    if (nodes.length === 1 && nodes[0].isDirectory) {
      const children = nodes[0].children || [];
      const childDirs = children.filter((n) => n.isDirectory);
      setExpandedPaths(new Set(childDirs.map((n) => n.path)));
    } else {
      const rootDirs = nodes.filter((n) => n.isDirectory);
      setExpandedPaths(new Set(rootDirs.map((n) => n.path)));
    }
  }, [nodes]);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const query = searchQuery.toLowerCase();
    
    const filterTree = (items: FolderTreeNode[]): FolderTreeNode[] => {
      return items
        .map((item) => {
          if (item.name.toLowerCase().includes(query)) return item;
          if (item.children) {
            const filteredChildren = filterTree(item.children);
            if (filteredChildren.length > 0) {
              return { ...item, children: filteredChildren };
            }
          }
          return null;
        })
        .filter(Boolean) as FolderTreeNode[];
    };

    return filterTree(nodes);
  }, [nodes, searchQuery]);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FolderTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ ...getContextMenuPosition(e, node), node });
  }, [getContextMenuPosition]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Flatten tree: if single root folder, skip it and show children directly
  const flatNodes = useMemo(() => {
    const result: { node: FolderTreeNode; depth: number }[] = [];
    
    // If single root directory, start from its children
    const startNodes = filteredNodes.length === 1 && filteredNodes[0].isDirectory
      ? (filteredNodes[0].children || [])
      : filteredNodes;
    
    const traverse = (items: FolderTreeNode[], depth: number) => {
      for (const item of items) {
        result.push({ node: item, depth });
        if (item.isDirectory && expandedPaths.has(item.path) && item.children) {
          const sorted = [...item.children].sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name, "zh-CN");
          });
          traverse(sorted, depth + 1);
        }
      }
    };
    traverse(startNodes, 0);
    return result;
  }, [filteredNodes, expandedPaths]);

  return (
    <div ref={containerRef} className="absolute left-[20px] top-[158px] w-[276px] bottom-[32px] overflow-auto">
      {flatNodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full px-[16px]">
          <p className="text-[14px] text-[#8d8e99] text-center">
            {searchQuery ? "无匹配结果" : "暂无文件"}
          </p>
        </div>
      ) : (
        <div className="py-[4px]">
          {flatNodes.map(({ node, depth }) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={depth}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onToggleExpand={handleToggleExpand}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[200] bg-white rounded-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[4px] w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node.isDirectory && onNewFile && (
            <button
              className="w-full px-[12px] py-[8px] text-left text-[14px] text-[#131212] hover:bg-[#f5f6f8] flex items-center gap-[8px]"
              onClick={() => {
                onNewFile(contextMenu.node.path);
                setContextMenu(null);
              }}
            >
              <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2"/>
              </svg>
              新建文件
            </button>
          )}
          {onOpenLocation && (
            <button
              className="w-full px-[12px] py-[8px] text-left text-[14px] text-[#131212] hover:bg-[#f5f6f8] flex items-center gap-[8px]"
              onClick={() => {
                onOpenLocation(contextMenu.node.path);
                setContextMenu(null);
              }}
            >
              <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
                <path d="M2 4C2 3.44772 2.44772 3 3 3H6.5L8 4.5H13C13.5523 4.5 14 4.94772 14 5.5V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="#131212" strokeWidth="1.2"/>
                <path d="M6 8H10M6 10H8" stroke="#131212" strokeLinecap="round" strokeWidth="1.2"/>
              </svg>
              打开文件位置
            </button>
          )}
        </div>
      )}
    </div>
  );
}
