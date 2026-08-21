// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import React, { useCallback, useState, type MutableRefObject } from "react";
import { applyTableAlignCommand } from "../commands";
import type { TableRowHandle, ToastState, ToolbarPanel } from "../types";

type Opts = {
  editorInstanceRef: MutableRefObject<any>;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  saveEditorSelection: () => unknown;
  applySavedSelection: (activeEditor?: any, selection?: any) => boolean;
  setToast: (v: ToastState | null) => void;
  setToolbarPanel: React.Dispatch<React.SetStateAction<ToolbarPanel>>;
  runEditorCommand: (command: (activeEditor: any) => boolean | void) => boolean;
};

export function useTableOverlays({
  editorInstanceRef, toolbarRef, saveEditorSelection, applySavedSelection,
  setToast, setToolbarPanel, runEditorCommand,
}: Opts) {
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const [tableToolbarPos, setTableToolbarPos] = useState({ top: 0, left: 0 });
  const [tableRowHandles, setTableRowHandles] = useState<TableRowHandle[]>([]);
  const [activeRowResizeIndex, setActiveRowResizeIndex] = useState<number | null>(null);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");

  const updateTableToolbar = useCallback((activeEditor = editorInstanceRef.current) => {
  if (!activeEditor || !activeEditor.isActive("table")) {
    setShowTableToolbar(false);
    setTableRowHandles([]);
    return;
  }
  saveEditorSelection();
  const { from } = activeEditor.state.selection;
  const domAtPos = activeEditor.view.domAtPos(from);
  const node = domAtPos.node.nodeType === Node.ELEMENT_NODE
    ? domAtPos.node as Element
    : domAtPos.node.parentElement;
  const table = node?.closest?.("table");
  if (!table) {
    setShowTableToolbar(false);
    setTableRowHandles([]);
    return;
  }
  const wrapper = table.closest(".tableWrapper") ?? table;
  const rect = wrapper.getBoundingClientRect();
  const toolbarBottom = toolbarRef.current?.getBoundingClientRect().bottom ?? 120;
  const editorTop = activeEditor.view.dom.getBoundingClientRect().top;
  const safeTop = Math.max(toolbarBottom + 8, editorTop);
  const rowRects = Array.from(table.querySelectorAll("tr")).map((rowEl, index) => {
    const row = rowEl as HTMLTableRowElement;
    const rowRect = row.getBoundingClientRect();
    return {
      index,
      left: Math.max(12, rowRect.left),
      top: rowRect.bottom - 6,
      width: Math.max(80, rowRect.width),
      row,
    };
  }).filter((handle) => handle.top >= safeTop && handle.top < window.innerHeight - 8);
  const tableBarTop = Math.max(safeTop, rect.top - 42);
  setTableToolbarPos({
    left: Math.max(12, Math.min(rect.left, window.innerWidth - 760)),
    top: tableBarTop,
  });
  setTableRowHandles(rowRects);
  setShowTableToolbar(true);
  }, [saveEditorSelection]);

  const persistRowHeight = useCallback((cells: HTMLTableCellElement[], height: number) => {
  const activeEditor = editorInstanceRef.current;
  if (!activeEditor || cells.length === 0) return;
  const value = `${Math.round(height)}px`;
  let tr = activeEditor.state.tr;
  cells.forEach((cell) => {
    const rawPos = activeEditor.view.posAtDOM(cell, 0);
    const candidates = [rawPos - 1, rawPos, rawPos + 1].filter((pos, index, arr) => pos >= 0 && arr.indexOf(pos) === index);
    const cellPos = candidates.find((pos) => {
      const node = activeEditor.state.doc.nodeAt(pos);
      return node?.type.name === "tableCell" || node?.type.name === "tableHeader";
    });
    if (cellPos == null) return;
    const node = tr.doc.nodeAt(cellPos);
    if (!node) return;
    tr = tr.setNodeMarkup(cellPos, undefined, { ...node.attrs, rowHeight: value }, node.marks);
  });
  if (tr.docChanged) activeEditor.view.dispatch(tr);
  window.setTimeout(() => updateTableToolbar(activeEditor), 0);
  }, [updateTableToolbar]);

  const startTableRowResize = (
  event: React.PointerEvent<HTMLDivElement>,
  handle: TableRowHandle,
) => {
  event.preventDefault();
  event.stopPropagation();
  const row = handle.row;
  const cells = Array.from(row.querySelectorAll("td, th")) as HTMLTableCellElement[];
  if (cells.length === 0 || !row.isConnected) return;

  const resizeHandle = event.currentTarget;
  const pointerId = event.pointerId;
  const startY = event.clientY;
  const startHeight = row.getBoundingClientRect().height;
  let latestHeight = startHeight;
  let finished = false;

  const applyHeight = (height: number) => {
    latestHeight = Math.max(34, height);
    const value = `${latestHeight}px`;
    row.style.height = value;
    row.style.minHeight = value;
    cells.forEach((cell) => {
      cell.style.height = value;
      cell.style.minHeight = value;
    });
    resizeHandle.style.top = `${row.getBoundingClientRect().bottom - 6}px`;
  };

  const cleanup = (persist: boolean) => {
    if (finished) return;
    finished = true;
    document.body.classList.remove("table-row-resize-cursor");
    setActiveRowResizeIndex(null);
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onCancel, true);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("keydown", onKeyDown, true);
    try {
      resizeHandle.releasePointerCapture?.(pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    if (persist) persistRowHeight(cells, latestHeight);
    window.setTimeout(() => updateTableToolbar(editorInstanceRef.current), 0);
  };

  const onMove = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    moveEvent.preventDefault();
    applyHeight(startHeight + moveEvent.clientY - startY);
  };
  const onUp = (upEvent: PointerEvent) => {
    if (upEvent.pointerId !== pointerId) return;
    upEvent.preventDefault();
    applyHeight(startHeight + upEvent.clientY - startY);
    cleanup(true);
  };
  const onCancel = (cancelEvent: PointerEvent) => {
    if (cancelEvent.pointerId !== pointerId) return;
    cleanup(true);
  };
  const onBlur = () => cleanup(true);
  const onKeyDown = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key === "Escape") cleanup(false);
  };

  setActiveRowResizeIndex(handle.index);
  document.body.classList.add("table-row-resize-cursor");
  try {
    resizeHandle.setPointerCapture?.(pointerId);
  } catch {
    // Window-level listeners still keep the drag active without capture.
  }
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("blur", onBlur);
  document.addEventListener("keydown", onKeyDown, true);
};

  const restoreEditorSelection = (activeEditor = editorInstanceRef.current) => applySavedSelection(activeEditor);

  const runTableCommand = (command: "addRowBefore" | "addRowAfter" | "deleteRow" | "addColumnBefore" | "addColumnAfter" | "deleteColumn" | "deleteTable" | "mergeCells" | "splitCell") => {
  const activeEditor = editorInstanceRef.current;
  if (!activeEditor) return;
  restoreEditorSelection(activeEditor);
  const ok = activeEditor.chain().focus()[command]().run();
  if (!ok && (command === "mergeCells" || command === "splitCell")) {
    setToast({
      message: command === "mergeCells" ? "请先框选至少两个单元格再合并" : "当前单元格无法拆分，请先合并单元格",
      type: "info",
    });
  }
  if (command === "deleteTable") setShowTableToolbar(false);
  window.setTimeout(() => updateTableToolbar(activeEditor), 0);
  };

  const applyTableAlign = (align: "left" | "center" | "right") => {
  runEditorCommand((activeEditor) => applyTableAlignCommand(activeEditor, align));
  window.setTimeout(() => updateTableToolbar(editorInstanceRef.current), 0);
  };

  const insertTable = () => {
  const activeEditor = editorInstanceRef.current;
  const rows = parseInt(tableRows, 10);
  const cols = parseInt(tableCols, 10);
  if (!activeEditor || Number.isNaN(rows) || Number.isNaN(cols) || rows < 1 || rows > 20 || cols < 1 || cols > 10) {
    setToast({ message: "表格行数需为 1-20，列数需为 1-10", type: "error" });
    return;
  }
  try {
    restoreEditorSelection(activeEditor);
    if (!activeEditor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()) throw new Error("表格插入失败");
    setToolbarPanel(null);
    setToast({ message: "表格已插入", type: "success" });
    window.setTimeout(() => updateTableToolbar(activeEditor), 0);
  } catch (error) {
    console.error("Failed to insert table:", error);
    setToast({ message: "表格插入失败，请重新选择插入位置", type: "error" });
  }
  };

  const openTableDialog = () => {
  saveEditorSelection();
  setTableRows("3");
  setTableCols("3");
  setToolbarPanel("table");
  };

  return {
    showTableToolbar, setShowTableToolbar, tableToolbarPos, tableRowHandles, setTableRowHandles,
    activeRowResizeIndex, tableRows, setTableRows, tableCols, setTableCols,
    updateTableToolbar, startTableRowResize, runTableCommand, applyTableAlign, insertTable, openTableDialog,
  };
}
