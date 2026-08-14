import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FolderTreeNode } from "@/app/document/types";
import { FileTreeNode } from "./FileTreeNode";

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
    const height = (node.isDirectory && onNewFile ? 36 : 0) + (onOpenLocation ? 36 : 0) + 8;
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
          className="fixed z-[200] w-[160px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node.isDirectory && onNewFile && (
            <button
              className="w-full flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212] text-left"
              onClick={() => {
                onNewFile(contextMenu.node.path);
                setContextMenu(null);
              }}
            >
              <svg className="size-[16px] shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2"/>
              </svg>
              <span className="text-[14px] whitespace-nowrap">新建文件</span>
            </button>
          )}
          {onOpenLocation && (
            <button
              className="w-full flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212] text-left"
              onClick={() => {
                onOpenLocation(contextMenu.node.path);
                setContextMenu(null);
              }}
            >
              <svg className="size-[16px] shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M2 4C2 3.44772 2.44772 3 3 3H6.5L8 4.5H13C13.5523 4.5 14 4.94772 14 5.5V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M6 8H10M6 10H8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2"/>
              </svg>
              <span className="text-[14px] whitespace-nowrap">打开文件位置</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

