import React from "react";
import { createPortal } from "react-dom";
import type { TableRowHandle } from "./types";

export function InsertTableModal({
  tableRows,
  tableCols,
  setTableRows,
  setTableCols,
  onClose,
  onInsert,
}: {
  tableRows: string;
  tableCols: string;
  setTableRows: (value: string) => void;
  setTableCols: (value: string) => void;
  onClose: () => void;
  onInsert: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative bg-white rounded-[16px] w-[360px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] p-[24px] flex flex-col gap-[20px]" onClick={(e) => e.stopPropagation()}>
        <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px]">插入表格</p>
        <div className="flex gap-[16px]">
          <label className="flex-1 flex flex-col gap-[6px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">行数<input type="number" min="1" max="20" value={tableRows} onChange={(e) => setTableRows(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onInsert(); if (e.key === "Escape") onClose(); }} className="h-[36px] rounded-[8px] border border-solid border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#131212]" /></label>
          <label className="flex-1 flex flex-col gap-[6px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">列数<input type="number" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onInsert(); if (e.key === "Escape") onClose(); }} className="h-[36px] rounded-[8px] border border-solid border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#131212]" /></label>
        </div>
        <div className="flex justify-end gap-[12px]"><button className="h-[36px] px-[20px] rounded-[8px] border border-[#EBECF0] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#F7F8FA]" onClick={onClose}>取消</button><button className="h-[36px] px-[20px] rounded-[8px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-90" onClick={onInsert}>插入表格</button></div>
      </div>
    </div>,
    document.body,
  );
}

export function TableFloatBar({
  tableToolbarPos,
  tableAlignActive,
  runTableCommand,
  applyTableAlign,
}: {
  tableToolbarPos: { top: number; left: number };
  tableAlignActive: string;
  runTableCommand: (command: "addRowBefore" | "addRowAfter" | "deleteRow" | "addColumnBefore" | "addColumnAfter" | "deleteColumn" | "deleteTable" | "mergeCells" | "splitCell") => void;
  applyTableAlign: (align: "left" | "center" | "right") => void;
}) {
  return createPortal(
    <div className="doc-table-float-bar fixed z-[280] rounded-[8px] border border-[#EBECF0] p-[6px] flex items-center gap-[4px] shadow-[0_16px_32px_-8px_rgba(36,36,36,0.12)]"
      style={{ left: tableToolbarPos.left, top: tableToolbarPos.top }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <div className="doc-table-float-label">表格</div>
      <div className="doc-table-float-sep" />
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addRowBefore"); }}>上方行</button>
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addRowAfter"); }}>下方行</button>
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteRow"); }}>删行</button>
      <div className="doc-table-float-sep" />
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addColumnBefore"); }}>左列</button>
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addColumnAfter"); }}>右列</button>
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteColumn"); }}>删列</button>
      <div className="doc-table-float-sep" />
      <button type="button" className={`doc-table-float-btn${tableAlignActive === "left" ? " is-active" : ""}`} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyTableAlign("left"); }}>左齐</button>
      <button type="button" className={`doc-table-float-btn${tableAlignActive === "center" ? " is-active" : ""}`} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyTableAlign("center"); }}>居中</button>
      <button type="button" className={`doc-table-float-btn${tableAlignActive === "right" ? " is-active" : ""}`} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyTableAlign("right"); }}>右齐</button>
      <div className="doc-table-float-sep" />
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("mergeCells"); }}>合并</button>
      <button type="button" className="doc-table-float-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("splitCell"); }}>拆分</button>
      <div className="doc-table-float-sep" />
      <button type="button" className="doc-table-float-btn is-danger" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteTable"); }}>删表格</button>
    </div>,
    document.body,
  );
}

export function TableRowResizeHandles({
  tableRowHandles,
  activeRowResizeIndex,
  onStartResize,
}: {
  tableRowHandles: TableRowHandle[];
  activeRowResizeIndex: number | null;
  onStartResize: (event: React.PointerEvent<HTMLDivElement>, handle: TableRowHandle) => void;
}) {
  return createPortal(
    <>
      {tableRowHandles.map((handle) => (
        <div
          key={handle.index}
          className={`doc-table-row-resize-handle ${activeRowResizeIndex === handle.index ? "is-resizing" : ""}`}
          style={{ left: handle.left, top: handle.top, width: handle.width }}
          onPointerDown={(event) => onStartResize(event, handle)}
          title="拖拽调整行高"
          aria-label="拖拽调整行高"
        />
      ))}
    </>,
    document.body,
  );
}
