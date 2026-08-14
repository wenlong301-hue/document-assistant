import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DocContentMap, OutlineNode } from "@/app/document/types";
import {
  buildDeleteMessage,
  buildPreviewHtml,
  buildPreviewSections,
  countDescendants,
  findNode,
  findNodeDepth,
} from "@/app/document/helpers";
import { filterOutlineNodes, insertNodeAfter, insertNodeBefore, removeNodeById } from "@/app/document/outlineTreeOps";
import { DeleteConfirmModal } from "@/app/document/DeleteConfirmModal";
import { NewDocModal } from "@/app/document/NewDocModal";
import { useAutoHideScrollbar } from "@/app/shared/hooks/useAutoHideScrollbar";
import { OutlineTreeNode } from "./OutlineTreeNode";
import type { DragState, OutlineMenuHandlers } from "./types";

export function OutlineTree({ nodes, selectedId, docName, contentMap, onSelect, onUpdateNodes, onToast, filter = "", enterTick = 0 }: {
  nodes: OutlineNode[]; selectedId: string; contentMap?: DocContentMap;
  docName: string; onSelect: (id: string) => void; onUpdateNodes: (nodes: OutlineNode[]) => void; onToast?: (message: string, type: "success" | "error" | "info") => void;
  filter?: string; enterTick?: number;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root", "1.1", "1.1.1", "1.1.1.1"]));
  const [dragState, setDragState] = useState<DragState>(null);
  const [menuState, setMenuState] = useState<{ id: string; rect: { x: number; y: number } } | null>(null);
  const [renameState, setRenameState] = useState<{ id: string; currentName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useAutoHideScrollbar(scrollRef);
  const filtering = filter.trim().length > 0;
  const filteredNodes = useMemo(() => (filtering ? filterOutlineNodes(nodes, filter.trim()) : nodes), [nodes, filter, filtering]);

  useEffect(() => {
    if (filtering && enterTick > 0 && filteredNodes.length > 0) onSelect(filteredNodes[0].id);
  }, [enterTick, filtering, filteredNodes, onSelect]);

  const toggle = (id: string) => setExpandedIds((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const handleDragStart = (id: string, isRoot: boolean) => { if (filtering) return; setDragState({ sourceId: id, isRootSource: isRoot, overId: id }); };
  const handleDragOver = (id: string) => { if (dragState) setDragState({ ...dragState, overId: id }); };
  const handleDrop = (targetId: string, targetIsRoot: boolean) => {
    if (!dragState || dragState.sourceId === targetId) { setDragState(null); return; }
    if (dragState.isRootSource && !targetIsRoot) { setDragState(null); return; }
    const [removed, removedNode] = removeNodeById(nodes, dragState.sourceId);
    if (!removedNode) { setDragState(null); return; }
    onUpdateNodes(insertNodeBefore(removed, removedNode, targetId));
    setDragState(null);
  };
  const handleDragEnd = () => setDragState(null);

  const doDelete = (id: string) => {
    const [updated] = removeNodeById(nodes, id);
    onUpdateNodes(updated);
    if (selectedId === id && updated.length > 0) onSelect(updated[0].id);
  };

  const handleDelete = (id: string) => {
    const node = findNode(nodes, id);
    if (!node) return;
    const isLeaf = node.children.length === 0;
    const childCount = countDescendants(node);
    const type = isLeaf ? "leaf" : "branch";
    setDeleteConfirm({
      message: buildDeleteMessage(type, node.name, childCount),
      onConfirm: () => doDelete(id),
    });
  };

  const handleAddChild = (parentId: string) => {
    const depth = findNodeDepth(nodes, parentId);
    if (depth >= 5) return;
    const newNode: OutlineNode = { id: `${parentId}-child-${Date.now()}`, name: "新建子文档", children: [], includeInPreview: true };
    const addChild = (arr: OutlineNode[]): OutlineNode[] =>
      arr.map(n => n.id === parentId ? { ...n, children: [...n.children, newNode] } : { ...n, children: addChild(n.children) });
    onUpdateNodes(addChild(nodes));
    setExpandedIds(prev => new Set([...prev, parentId]));
    onSelect(newNode.id);
  };

  const handleRename = (id: string, newName: string) => {
    const renameInTree = (arr: OutlineNode[]): OutlineNode[] =>
      arr.map(n => n.id === id ? { ...n, name: newName } : { ...n, children: renameInTree(n.children) });
    onUpdateNodes(renameInTree(nodes));
  };

  const handleTogglePreview = (id: string) => {
    const toggleInTree = (arr: OutlineNode[]): OutlineNode[] =>
      arr.map(n => n.id === id
        ? { ...n, includeInPreview: n.includeInPreview === false }
        : { ...n, children: toggleInTree(n.children) });
    onUpdateNodes(toggleInTree(nodes));
  };

  const handleCopyLink = async (id: string) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("doc", docName);
      url.searchParams.set("node", id);
      url.hash = "";
      await navigator.clipboard.writeText(url.toString());
      onToast?.("层级链接已复制到剪贴板", "success");
    } catch (error) {
      console.error("Failed to copy outline link:", error);
      onToast?.("无法访问剪贴板，请检查浏览器权限", "error");
    }
  };

  const handleExportHtml = (id: string) => {
    const node = findNode(nodes, id);
    if (!node) return;
    const fullHtml = buildPreviewHtml(node.name, buildPreviewSections([node], contentMap), [node], node.id, contentMap);
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${node.name}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const cloneNodeDeep = (node: OutlineNode): OutlineNode => {
    const newId = `${node.id}-clone-${Date.now()}`;
    return { ...node, id: newId, name: `${node.name} (副本)`, includeInPreview: node.includeInPreview !== false, children: node.children.map(cloneNodeDeep) };
  };

  const handleClone = (id: string) => {
    const node = findNode(nodes, id);
    if (!node) return;
    const cloned = cloneNodeDeep(node);
    onUpdateNodes(insertNodeAfter(nodes, cloned, id));
    setMenuState(null);
  };

  const menuHandlers: OutlineMenuHandlers = {
    menuState,
    onMore: (id, rect) => setMenuState({ id, rect }),
    onMenuClose: () => setMenuState(null),
    onAddChild: handleAddChild,
    onRename: (id) => {
      const n = findNode(nodes, id);
      setMenuState(null);
      if (n) setRenameState({ id, currentName: n.name });
    },
    onCopyLink: handleCopyLink,
    onTogglePreview: handleTogglePreview,
    onExportHtml: handleExportHtml,
    onClone: handleClone,
    onDelete: handleDelete,
    getIncludeInPreview: (id) => findNode(nodes, id)?.includeInPreview !== false,
  };

  return (
    <>
      <div
        className="scroll-auto-hide absolute content-stretch flex flex-col gap-[4px] items-start left-[20px] top-[210px] w-[276px]"
        ref={scrollRef}
        style={{ maxHeight: "calc(100% - 250px)", overflowY: "auto" }}
      >
        {filtering && filteredNodes.length === 0 && (
          <div className="px-[8px] py-[24px] self-stretch text-center text-[13px] text-[#8d8e99] select-none">无匹配结果</div>
        )}
        {filteredNodes.map((node) => (
          <OutlineTreeNode key={node.id} node={node} depth={0} selectedId={selectedId}
            expandedIds={expandedIds} dragState={dragState} onSelect={onSelect} onToggle={toggle}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
            menuHandlers={menuHandlers} allExpanded={filtering} />
        ))}
      </div>
      {renameState && (
        <NewDocModal
          title="重命名"
          initialValue={renameState.currentName}
          onClose={() => setRenameState(null)}
          onConfirm={(name) => { handleRename(renameState.id, name); setRenameState(null); }}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          message={deleteConfirm.message}
          onConfirm={deleteConfirm.onConfirm}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}

