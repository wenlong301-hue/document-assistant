import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import TurndownService from "turndown";
import mammoth from "mammoth";
import svgPaths from "../../imports/首页文档模式/svg-8pwaal4bp9";
import menuSvg from "../../imports/Group10/svg-fl6vqvp3w7";
import designSvg from "../../imports/首页文档模式-1/svg-bn9kvq3mly";
import wifiOnSvg from "../../imports/Frame91/svg-mnkp41cgqd";
import outlineMenuSvg from "../../imports/Group10-1/svg-kvilwhz9cx";
import outlineSvg from "../../imports/首页大纲模式根节点/svg-4qt61e0wiv";
import deleteSvg from "../../imports/删除提示确认/svg-wi3f4os8di";
import type { DocContentMap, DocStore, OutlineNode, StoredDoc } from "../document/types";
import {
  buildDeleteMessage,
  buildEmptyOutlineTree,
  buildOutlineTree,
  buildPreviewHtml,
  buildPreviewSections,
  cleanExportHtml,
  countDescendants,
  createOutlineNode,
  createStoredDoc,
  findNode,
  findNodeDepth,
  flattenOutlineNodes,
  getFirstPreviewableNode,
  headingsToWordParagraphs,
  isHtmlContentEmpty,
  isNodePreviewable,
  markdownToSimpleHtml,
  normalizeMdocDocuments,
  normalizeStoredDoc,
  outlineCollapsedIconPath,
  outlineExpandedIconPath,
  pdfPrintHtmlDocument,
  readWebState,
  resolvePreviewNodeId,
  sanitizeFileName,
  textToHtml,
  WEB_STORAGE_KEY,
  wordHtmlDocument,
  writeWebState,
} from "../document/helpers";
import { emptyParagraph, escapeHtml, getPlainTextFromHtml, sanitizeHtml } from "../editor/utils/html";
import { Toast } from "../editor/ui/Toast";
import { EditorWorkspace } from "../document/EditorWorkspace";
import { DeleteConfirmModal } from "../document/DeleteConfirmModal";
import { HelpModal } from "../document/HelpModal";
import { NewDocModal } from "../document/NewDocModal";
import { UpdateModal, type UpdateInfo, type UpdateProgress } from "../document/UpdateModal";

const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndownService.keep(["table", "thead", "tbody", "tr", "th", "td", "video"]);

function useAutoHideScrollbar(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("scroll-auto-hide");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      el.classList.add("sb-scrolling");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove("sb-scrolling"), 700);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [ref]);
}

function Search() {
  return (
    <div className="absolute left-[28px] size-[16px] top-[86px]" data-name="search-01">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="search-01">
          <path d={svgPaths.p4ffd040} id="Icon" stroke="var(--stroke-0, #8F959E)" strokeLinecap="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Group1({ value, onChange, mode, onEnter }: { value: string; onChange: (v: string) => void; mode: "document" | "outline"; onEnter?: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="absolute left-[20px] top-[78px] w-[276px] h-[32px]">
      <div
        className="relative w-full h-full rounded-[8px] bg-white transition-all duration-150"
        style={{
          border: focused ? "0.6px solid #134CFF" : "0.6px solid #ececec",
          boxShadow: "none",
        }}
      >
        <svg className="absolute left-[8px] top-1/2 -translate-y-1/2 size-[16px] pointer-events-none" fill="none" viewBox="0 0 16 16">
          <path d={svgPaths.p4ffd040} stroke="#8F959E" strokeLinecap="round" strokeWidth="1.2" />
        </svg>
        <input
          type="text"
          placeholder={mode === "outline" ? "搜索大纲..." : "搜索文档..."}
          value={value}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            onEnter?.();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 w-full h-full bg-transparent rounded-[8px] pl-[32px] pr-[8px] text-[14px] text-[#131212] outline-none"
          style={{ fontFamily: "PingFang SC, sans-serif", color: "#131212" }}
        />
      </div>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute inset-[10%_0]" data-name="Group">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 26 20.8">
        <g id="Group">
          <path clipRule="evenodd" d={svgPaths.p33b5fd00} fill="var(--fill-0, #A5A6AA)" fillRule="evenodd" id="Vector" />
          <path clipRule="evenodd" d={svgPaths.p7a2baf0} fill="var(--fill-0, #131212)" fillRule="evenodd" id="Vector_2" />
          <path d={svgPaths.p15af7c00} fill="var(--fill-0, white)" id="Vector_3" />
        </g>
      </svg>
    </div>
  );
}

function Icon() {
  return (
    <div className="overflow-clip relative shrink-0 size-[26px]" data-name="icon">
      <Group />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
      <Icon />
      <p className="[word-break:break-word] font-['Alimama_FangYuanTi_VF:SemiBold-Square',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[18px] text-black whitespace-nowrap" style={{ fontVariationSettings: '"BEVL" 1' }}>
        文档助手
      </p>
    </div>
  );
}

function Download() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="download-02">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="download-02">
          <path d={svgPaths.p3809f980} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="bg-black content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Download />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">导入</p>
      </div>
    </div>
  );
}

function Upload() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="upload-03">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="upload-03">
          <path d={svgPaths.p1de75680} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-black content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Upload />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">导出</p>
      </div>
    </div>
  );
}

function Share() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="share">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="share">
          <path d={svgPaths.p1623d680} id="Icon" stroke="var(--stroke-0, black)" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame12() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer transition-colors hover:bg-[#EBECF0] active:bg-[#dddee3]">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Share />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">分享</p>
      </div>
    </div>
  );
}

function Trash() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="trash-03">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="trash-03">
          <path d={svgPaths.p1db5f00} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame14() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer transition-colors hover:bg-[#EBECF0] active:bg-[#dddee3]">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <Trash />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">删除</p>
      </div>
    </div>
  );
}

function FrameSave() {
  return (
    <div className="bg-black content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <div className="relative shrink-0 size-[16px]" data-name="save">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
            <path d={svgPaths.p3809f980} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">保存</p>
      </div>
    </div>
  );
}

function FrameHelp() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer transition-colors hover:bg-[#EBECF0] active:bg-[#dddee3]">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <div className="relative shrink-0 size-[16px]">
          <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6.2" stroke="black" strokeWidth="1.2" />
            <path d="M6.6 6.2c0-1 .8-1.8 1.8-1.8s1.8.7 1.8 1.7c0 .9-.6 1.3-1.2 1.7-.4.2-.6.4-.6.8v.4" stroke="black" strokeLinecap="round" strokeWidth="1.2" />
            <circle cx="8" cy="11.4" r="0.7" fill="black" />
          </svg>
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">帮助</p>
      </div>
    </div>
  );
}

function Frame11({ onOpenShare, onOpenExport, onDelete, onImport, onSave, onOpenHelp }: { onOpenShare: () => void; onOpenExport: () => void; onDelete: () => void; onImport: () => void; onSave: () => void; onOpenHelp: () => void }) {
  return (
    <div className="absolute content-stretch flex h-[66px] items-center justify-between left-0 right-0 pl-[20px] pr-[8px] py-[16px] top-0">
      <Frame5 />
      <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onSave}><FrameSave /></div>
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onImport}><Frame8 /></div>
        <div className="cursor-pointer transition-all duration-150 hover:opacity-75 active:scale-95 active:opacity-60 rounded-[6px]" onClick={onOpenExport}><Frame7 /></div>
        <div
          className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]"
          onClick={onOpenShare}
        >
          <Frame12 />
        </div>
        <div className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]" onClick={onDelete}><Frame14 /></div>
        <div className="cursor-pointer transition-all duration-150 hover:bg-[#EBECF0] active:bg-[#dddee3] active:scale-95 rounded-[6px]" onClick={onOpenHelp}><FrameHelp /></div>
      </div>
    </div>
  );
}

function SidebarShareStatus({ shared, onClick }: { shared: boolean; onClick: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 w-[316px]">
      <div className="h-[0.6px] mx-[20px] bg-[#EBECF0]" />
      <div className="flex items-center">
        <div
          className="flex items-center gap-[8px] px-[28px] py-[10px] cursor-pointer group flex-1"
          onClick={onClick}
        >
          <div className="relative shrink-0 size-[16px]">
            <svg className="block size-full" fill="none" viewBox="0 0 16 16">
              {shared ? (
                <path d={wifiOnSvg.pbf2d700} stroke="#15803D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              ) : (
                <path d={designSvg.p28f1ba00} stroke="#8D8E99" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              )}
            </svg>
          </div>
          <p className={`font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] transition-colors ${shared ? "text-[#15803d]" : "text-[#8d8e99] group-hover:text-[#131212]"}`}>
            {shared ? "分享中" : "未开启分享"}
          </p>
        </div>
      </div>
    </div>
  );
}

function FolderIcon({ color = "#131212" }: { color?: string }) {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="folder">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <path d={svgPaths.p2d6a180} id="Icon" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

function DocContextMenu({ position, onRename, onExport, onDelete }: {
  position: { x: number; y: number };
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const menuItems = [
    {
      label: "重命名",
      icon: <path d={menuSvg.pb1c0600} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onRename,
      danger: false,
    },
    {
      label: "导出HTML",
      icon: <path d={menuSvg.p3809f980} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onExport,
      danger: false,
    },
    {
      label: "删除",
      icon: <path d={menuSvg.p1db5f00} stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />,
      action: onDelete,
      danger: true,
    },
  ];
  return (
    <div className="doc-context-menu fixed z-50 w-[134px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]" style={{ left: position.x, top: position.y }}>
      {menuItems.map(({ label, icon, action, danger }) => (
        <div
          key={label}
          className={`flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer transition-colors ${danger ? "hover:bg-red-50 text-[#131212] hover:text-red-600" : "hover:bg-[#f5f6f8] text-[#131212]"}`}
          onClick={(e) => { e.stopPropagation(); action(); }}
        >
          <div className="relative shrink-0 size-[16px]">
            <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">{icon}</svg>
          </div>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] whitespace-nowrap" style={{ color: "inherit" }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function DocItem({ name, active, onClick, onRename, onDelete, onExport, onEnterOutline }: {
  name: string;
  active?: boolean;
  onClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onEnterOutline?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const highlighted = active || hovered || menuOpen;
  const color = highlighted ? "#131212" : "#93959F";

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.(".doc-context-menu")) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleExport = () => {
    setMenuOpen(false);
    onExport?.();
  };

  return (
    <div
      ref={ref}
      className={`h-[36px] relative rounded-[8px] shrink-0 w-full transition-colors cursor-pointer ${highlighted ? "bg-[#ebecf0]" : ""}`}
      onClick={() => { onClick?.(); onEnterOutline?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[8px] items-center p-[8px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative">
            <FolderIcon color={color} />
            <p className="[word-break:break-word] flex-[1_0_0] font-['PingFang_SC:Regular',sans-serif] leading-[normal] min-w-px not-italic overflow-hidden relative text-[14px] text-ellipsis whitespace-nowrap" style={{ color }}>
              {name}
            </p>
          </div>
          <div
            className={`relative shrink-0 size-[16px] transition-opacity rounded-[4px] hover:bg-[#d5d6da] ${hovered || menuOpen ? "opacity-100" : "opacity-0"}`}
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              setMenuPos({ x: r.right - 134, y: r.bottom + 4 });
              setMenuOpen((v) => !v);
            }}
          >
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
              <path d={svgPaths.pa91b600} fill="#131212" />
              <path d={svgPaths.p12e0c1f2} fill="#131212" />
              <path d={svgPaths.p20e27070} fill="#131212" />
            </svg>
          </div>
        </div>
      </div>
      {menuOpen && (
        <DocContextMenu
          position={menuPos}
          onRename={() => { setMenuOpen(false); onRename?.(); }}
          onExport={handleExport}
          onDelete={() => { setMenuOpen(false); onDelete?.(); }}
        />
      )}
    </div>
  );
}

function Frame16({ docs, selected, onSelect, onRename, onDelete, onExport, onEnterOutline }: {
  docs: string[];
  selected: string;
  onSelect: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
  onExport: (name: string) => void;
  onEnterOutline: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useAutoHideScrollbar(scrollRef);
  return (
    <>
      <div className="scroll-auto-hide absolute content-stretch flex flex-col gap-[4px] items-start left-[20px] top-[210px] w-[276px]"
        ref={scrollRef}
        style={{ maxHeight: "calc(100% - 250px)", overflowY: "auto" }}>
        {docs.map((name) => (
          <DocItem
            key={name}
            name={name}
            active={selected === name}
            onClick={() => onSelect(name)}
            onRename={() => onRename(name)}
            onDelete={() => onDelete(name)}
            onExport={() => onExport(name)}
            onEnterOutline={onEnterOutline}
          />
        ))}
      </div>
    </>
  );
}

function removeNodeById(nodes: OutlineNode[], id: string): [OutlineNode[], OutlineNode | null] {
  let found: OutlineNode | null = null;
  const filter = (arr: OutlineNode[]): OutlineNode[] =>
    arr.reduce<OutlineNode[]>((acc, n) => {
      if (n.id === id) { found = n; return acc; }
      return [...acc, { ...n, children: filter(n.children) }];
    }, []);
  return [filter(nodes), found];
}

function insertNodeBefore(nodes: OutlineNode[], node: OutlineNode, targetId: string): OutlineNode[] {
  const insert = (arr: OutlineNode[]): [OutlineNode[], boolean] => {
    const idx = arr.findIndex(n => n.id === targetId);
    if (idx !== -1) { const next = [...arr]; next.splice(idx, 0, node); return [next, true]; }
    let found = false;
    const result = arr.map(n => {
      if (found) return n;
      const [children, f] = insert(n.children);
      if (f) { found = true; return { ...n, children }; }
      return n;
    });
    return [result, found];
  };
  return insert(nodes)[0];
}

function insertNodeAfter(nodes: OutlineNode[], node: OutlineNode, targetId: string): OutlineNode[] {
  const insert = (arr: OutlineNode[]): [OutlineNode[], boolean] => {
    const idx = arr.findIndex(n => n.id === targetId);
    if (idx !== -1) { const next = [...arr]; next.splice(idx + 1, 0, node); return [next, true]; }
    let found = false;
    const result = arr.map(n => {
      if (found) return n;
      const [children, f] = insert(n.children);
      if (f) { found = true; return { ...n, children }; }
      return n;
    });
    return [result, found];
  };
  return insert(nodes)[0];
}

function filterOutlineNodes(nodes: OutlineNode[], query: string): OutlineNode[] {
  const q = query.toLowerCase();
  const walk = (arr: OutlineNode[]): OutlineNode[] => {
    const out: OutlineNode[] = [];
    for (const n of arr) {
      const self = n.name.toLowerCase().includes(q);
      const children = walk(n.children);
      if (self || children.length > 0) out.push({ ...n, children });
    }
    return out;
  };
  return walk(nodes);
}

type DragState = { sourceId: string; isRootSource: boolean; overId: string } | null;

type OutlineMenuHandlers = {
  menuState: { id: string; rect: { x: number; y: number } } | null;
  onMore: (id: string, rect: { x: number; y: number }) => void;
  onMenuClose: () => void;
  onAddChild: (id: string) => void;
  onRename: (id: string) => void;
  onTogglePreview: (id: string) => void;
  onExportHtml: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  getIncludeInPreview: (id: string) => boolean;
};

function OutlineTreeNode({ node, depth, selectedId, expandedIds, dragState, onSelect, onToggle, onDragStart, onDragOver, onDrop, onDragEnd, menuHandlers, allExpanded }: {
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
        {/* file icon */}
        <div className="relative shrink-0 size-[16px] mr-[8px]">
          <svg className="block size-full" fill="none" viewBox="0 0 16 16">
            <path d={outlineSvg.p2f15d400} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
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

function OutlineNodeMenu({ nodeId, includeInPreview, position, onClose, onAddChild, onRename, onTogglePreview, onExportHtml, onClone, onDelete }: {
  nodeId: string; includeInPreview: boolean; position: { x: number; y: number }; onClose: () => void;
  onAddChild: (id: string) => void; onRename: (id: string) => void; onTogglePreview: (id: string) => void;
  onExportHtml: (id: string) => void; onClone: (id: string) => void; onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    {
      label: "添加子文档", highlighted: true,
      icon: <path d="M8 3.2L8 12.8M12.8 8L3.2 8" stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />,
      action: () => { onAddChild(nodeId); onClose(); },
    },
    {
      label: "重命名", highlighted: false,
      icon: <path d={outlineMenuSvg.pb1c0600} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onRename(nodeId); onClose(); },
    },
    {
      label: includeInPreview ? "预览时隐藏本层" : "预览时显示本层", highlighted: false,
      icon: <path d="M10.8334 10.8333H5.16671C3.6019 10.8333 2.33337 9.5648 2.33337 8C2.33337 6.43519 3.6019 5.16666 5.16671 5.16666H10.8334M10.8334 10.8333C12.3982 10.8333 13.6667 9.5648 13.6667 8C13.6667 6.43519 12.3982 5.16666 10.8334 5.16666M10.8334 10.8333C9.26857 10.8333 8.00004 9.5648 8.00004 8C8.00004 6.43519 9.26857 5.16666 10.8334 5.16666" stroke="#131212" strokeWidth="1.2" />,
      action: () => { onTogglePreview(nodeId); onClose(); },
    },
    {
      label: "导出HTML（含子文档）", highlighted: false,
      icon: <path d={outlineMenuSvg.p3809f980} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onExportHtml(nodeId); onClose(); },
    },
    {
      label: "克隆", highlighted: false,
      icon: <path d="M13.3334 8.74999L13.3334 4.99995C13.3334 3.34309 11.9902 1.99994 10.3333 1.99995L6.58337 2M9.33338 14L4.83338 14C4.00495 14 3.33338 13.3284 3.33338 12.5L3.33337 6C3.33337 5.17157 4.00495 4.5 4.83337 4.5L9.33337 4.5C10.1618 4.5 10.8334 5.17157 10.8334 6L10.8334 12.5C10.8334 13.3284 10.1618 14 9.33338 14Z" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />,
      action: () => { onClone(nodeId); onClose(); },
    },
    {
      label: "删除", highlighted: false, danger: true,
      icon: <path d={outlineMenuSvg.p1db5f00} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onDelete(nodeId); onClose(); },
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map(({ label, highlighted, danger, icon, action }) => (
        <div
          key={label}
          className={`flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer transition-colors
            ${danger ? "hover:bg-red-50" : "hover:bg-[#f5f6f8]"}`}
          onClick={action}
        >
          <div className="relative shrink-0 size-[16px]">
            <svg className="block size-full" fill="none" viewBox="0 0 16 16">{icon}</svg>
          </div>
          <p className={`font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] whitespace-nowrap ${danger ? "text-[#131212] hover:text-red-600" : "text-[#131212]"}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function OutlineTree({ nodes, selectedId, contentMap, onSelect, onUpdateNodes, filter = "", enterTick = 0 }: {
  nodes: OutlineNode[]; selectedId: string; contentMap?: DocContentMap;
  onSelect: (id: string) => void; onUpdateNodes: (nodes: OutlineNode[]) => void;
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

function Frame27({ onNewDoc, onNewFile, mode, onSwitchMode }: { onNewDoc: () => void; onNewFile: () => void; mode: "document" | "outline"; onSwitchMode: () => void }) {
  const isOutline = mode === "outline";
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[20px] top-[122px] w-[276px]">
      <div
        className="content-stretch flex gap-[8px] items-center px-[8px] py-[7px] relative shrink-0 cursor-pointer rounded-[6px] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
        onClick={onSwitchMode}
      >
        <div className="relative shrink-0 size-[20px]">
          {isOutline ? (
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
              <path d={outlineSvg.p56ad280} stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
              <path d={svgPaths.p9eb87c0} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
            </svg>
          )}
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#131212] text-[16px] whitespace-nowrap">
          {isOutline ? "大纲" : "文档"}
        </p>
      </div>
      <div
        className="content-stretch flex gap-[8px] items-center p-[8px] relative shrink-0 cursor-pointer rounded-[6px] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
        onClick={isOutline ? onNewFile : onNewDoc}
      >
        <div className="relative shrink-0 size-[20px]">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
            <path d="M10 5L10 15M15 10L5 10" id="Icon" stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />
          </svg>
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#131212] text-[14px] whitespace-nowrap">
          {isOutline ? "新建文件" : "新建文档"}
        </p>
      </div>
    </div>
  );
}


function ShareModal({ shared, mode, loading, errorMessage, onToggle, onClose, onDownload, shareUrl: propUrl }: {
  shared: boolean;
  mode: "electron" | "web";
  loading?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onClose: () => void;
  onDownload?: () => void;
  shareUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = propUrl || "http://localhost:6535";

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy share url:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-[24px] h-[56px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[normal]">分享文档</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 正文 */}
        <div className="px-[24px] pb-[24px] flex flex-col gap-[10px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">
            {mode === "electron" ? "分享给同一Wi-Fi / 局域网内的人" : "生成本机预览分享页"}
          </p>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[1.6]">
            {mode === "electron" ? "开启后，复制链接发给同事；对方用浏览器打开网址即可查看文档。" : "当前是网页预览环境，会生成一个只读 HTML 分享页，可复制本机临时链接或下载文件。"}
          </p>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[1.6]">
            {mode === "electron" ? "注意：您的电脑和文档助手需要保持开启，别人才能访问。" : "如果需要同 Wi-Fi 访问链接，请在 Electron 桌面应用中开启分享。"}
          </p>
          {errorMessage && <p className="font-['PingFang_SC:Regular',sans-serif] text-[#E53E3E] text-[13px] leading-[1.6]">{errorMessage}</p>}

          {/* 开关卡片 */}
          <div
            className="rounded-[12px] px-[16px] py-[14px] flex items-center justify-between mt-[4px] transition-all duration-300"
            style={{ background: shared ? "rgba(42,182,115,0.08)" : "white", border: "1px solid", borderColor: shared ? "rgba(42,182,115,0.25)" : "#ebecf0" }}
          >
            <div className="flex flex-col gap-[6px]">
              <p
                className="font-['PingFang_SC:Medium',sans-serif] text-[14px] font-medium leading-[normal] transition-colors duration-200"
                style={{ color: shared ? "#15803d" : "#c2c6cd" }}
              >
                {loading ? "处理中..." : shared ? "开启分享" : "未开启分享"}
              </p>
              <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[normal]">
                {shared ? (mode === "electron" ? "链接已生成，点击复制链接后发给同一Wi-Fi / 局域网内的人" : "分享页已生成，可复制链接或下载 HTML 文件") : "点击右侧开关，开启后会显示访问链接"}
              </p>
            </div>
            <button
              className="relative flex-shrink-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer active:scale-95"
              style={{ width: 44, height: 24, background: shared ? "#2AB673" : "#EBECF0", opacity: loading ? 0.6 : 1 }}
              onClick={onToggle}
              disabled={loading}
            >
              <span
                className="absolute top-[2px] size-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{ left: shared ? "22px" : "2px" }}
              />
            </button>
          </div>

          {/* 访问链接区域（开启后显示） */}
          {shared && (
            <div
              className="rounded-[12px] px-[16px] py-[14px] flex flex-col gap-[10px]"
              style={{ background: "rgba(245,245,244,0.5)", border: "1px solid #ebecf0" }}
            >
              <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">访问链接</p>
              <div className="flex items-center gap-[8px]">
                <div className="flex-1 bg-white border border-[#ebecf0] rounded-[6px] px-[12px] h-[40px] flex items-center">
                  <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] tracking-[1.12px] truncate">{shareUrl}</p>
                </div>
                <button
                  className="h-[40px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity whitespace-nowrap flex-shrink-0"
                  style={{ fontFamily: "PingFang SC, sans-serif" }}
                  onClick={handleCopy}
                >
                  {copied ? "已复制" : "复制链接"}
                </button>
                {mode === "web" && onDownload && (
                  <button
                    className="h-[40px] px-[16px] rounded-[6px] border border-[#ebecf0] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#f5f6f8] active:bg-[#ebecf0] transition-colors whitespace-nowrap flex-shrink-0"
                    style={{ fontFamily: "PingFang SC, sans-serif" }}
                    onClick={onDownload}
                  >
                    下载HTML
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Frame4({ folderName }: { folderName: string }) {
  return (
    <div className="absolute content-stretch flex gap-[8px] items-center left-[20px] px-[8px] py-[9.5px] top-[170px] w-[276px]">
      <div className="relative shrink-0 size-[16px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
          <path d={svgPaths.p3d9dd500} id="Icon" stroke="#93959F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['PingFang_SC:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#93959f] text-[12px] truncate max-w-[220px]">{folderName}</p>
    </div>
  );
}

function ExportModal({ docName, content, contentMap, outlineNodes, selectedNodeId, isElectron, onClose, onToast }: {
  docName: string; content: string; contentMap?: DocContentMap; outlineNodes?: OutlineNode[]; selectedNodeId?: string; isElectron: boolean; onClose: () => void; onToast?: (message: string, type: "success" | "error" | "info") => void;
}) {
  const [scope, setScope] = useState<"current" | "all">("current");
  const [format, setFormat] = useState<"HTML" | "Markdown" | "Word" | "PDF">("HTML");
  const [exportBusy, setExportBusy] = useState(false);

  const collectSubtreeContent = (nodes: OutlineNode[], nodeId: string): { id: string; name: string; html: string; level: number }[] => {
    const node = findNode(nodes, nodeId);
    if (!node) return [];
    const results: { id: string; name: string; html: string; level: number }[] = [];
    const collect = (item: OutlineNode, level: number) => {
      results.push({ id: item.id, name: item.name, html: contentMap?.[item.id] || emptyParagraph, level });
      item.children.forEach((child) => collect(child, Math.min(6, level + 1)));
    };
    collect(node, 1);
    return results;
  };

  const collectTreeContent = (nodes: OutlineNode[]): { id: string; name: string; html: string; level: number }[] => {
    const results: { id: string; name: string; html: string; level: number }[] = [];
    const collect = (items: OutlineNode[], level: number) => {
      items.forEach((item) => {
        results.push({ id: item.id, name: item.name, html: contentMap?.[item.id] || emptyParagraph, level });
        collect(item.children, Math.min(6, level + 1));
      });
    };
    collect(nodes, 1);
    return results;
  };

  const buildExportHtml = (parts: { name: string; html: string; level?: number }[]): string => {
    return parts.map(p => {
      if (p.html.startsWith("<h1>")) return p.html;
      const level = Math.min(6, Math.max(1, p.level || 1));
      return `<h${level}>${escapeHtml(p.name)}</h${level}>${p.html}`;
    }).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n');
  };

  const notify = (message: string, type: "success" | "error" | "info") => onToast?.(message, type);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    let exportContent: string;
    let exportOutlineTree: OutlineNode[] | undefined;
    let exportSections: PreviewSection[];
    let initialNodeId = selectedNodeId;
    let exportTitle = docName;
    if (scope === "current" && outlineNodes && selectedNodeId) {
      const selectedSubtree = findNode(outlineNodes, selectedNodeId);
      const parts = collectSubtreeContent(outlineNodes, selectedNodeId);
      exportContent = parts.length > 0 ? buildExportHtml(parts) : content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportOutlineTree = selectedSubtree ? [selectedSubtree] : undefined;
      exportSections = selectedSubtree ? buildPreviewSections([selectedSubtree], contentMap) : [{ id: "root", name: docName, html: exportContent }];
      exportTitle = selectedSubtree?.name || docName;
    } else if (scope === "all" && outlineNodes) {
      const parts = collectTreeContent(outlineNodes || []);
      exportContent = parts.length > 0 ? buildExportHtml(parts) : content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportOutlineTree = outlineNodes;
      exportSections = buildPreviewSections(outlineNodes, contentMap);
      initialNodeId = selectedNodeId || exportSections[0]?.id;
    } else {
      exportContent = content || `<h1>${docName}</h1><p>暂无内容</p>`;
      exportSections = [{ id: "root", name: docName, html: exportContent }];
    }

    try {
      const safeName = sanitizeFileName(exportTitle || docName || "文档");
      const skipTitle = scope === "all" || (scope === "current" && !!exportOutlineTree);
      const payload = { title: exportTitle, content: exportContent, defaultName: safeName, options: { skipTitle } };

      if (format === "HTML") {
        const fullHtml = buildPreviewHtml(exportTitle, exportSections, exportOutlineTree, initialNodeId, contentMap);
        if (isElectron) {
          const result = await (window as any).electronAPI.exportHtml(fullHtml, `${docName}.html`);
          notify(result === false ? "已取消导出" : "导出成功", result === false ? "info" : "success");
        } else {
          downloadBlob(new Blob([fullHtml], { type: "text/html" }), `${docName}.html`);
          notify("导出成功", "success");
        }
      } else if (format === "Markdown") {
        if (isElectron && (window as any).electronAPI.exportMarkdown) {
          const result = await (window as any).electronAPI.exportMarkdown(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const md = turndownService.turndown(exportContent).trim() + "\n";
          downloadBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${safeName}.md`);
          notify("导出成功", "success");
        }
      } else if (format === "Word") {
        if (isElectron) {
          const result = await (window as any).electronAPI.exportDocx(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const htmlToDocx = (await import("html-to-docx")).default;
          const buffer = await htmlToDocx(wordHtmlDocument(exportTitle, exportContent, { skipTitle }), null, { orientation: "portrait", margins: { top: 720, right: 720, bottom: 720, left: 720 } });
          downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${safeName}.docx`);
          notify("导出成功", "success");
        }
      } else if (format === "PDF") {
        if (isElectron) {
          const result = await (window as any).electronAPI.exportPdf(payload);
          if (result?.error) throw new Error(result.error);
          notify(result?.canceled ? "已取消导出" : "导出成功", result?.canceled ? "info" : "success");
        } else {
          const w = window.open("", "_blank");
          if (!w) throw new Error("浏览器阻止了打印窗口，请允许弹窗后重试");
          w.document.write(pdfPrintHtmlDocument(exportTitle, exportContent, { skipTitle }));
          w.document.close();
          notify("已打开打印窗口，请选择保存为 PDF", "info");
        }
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      notify(error instanceof Error ? error.message : "导出失败", "error");
      setExportBusy(false);
    }
  };

  const scopeOptions = [
    { key: "current" as const, label: "当前页", desc: "导出当前层级及子集" },
    { key: "all" as const, label: "整个文档", desc: "导出当前文档全部内容" },
  ];
  const formatOptions = [
    { key: "HTML" as const, desc: "适合预览和分享" },
    { key: "Markdown" as const, desc: "适合二次编辑" },
    { key: "Word" as const, desc: "导出为docx" },
    { key: "PDF" as const, desc: "适合正式分发" },
  ];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[600px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] p-[32px] flex flex-col gap-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[18px] font-medium leading-[normal]">导出文档</p>
          <button className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" onClick={onClose} disabled={exportBusy}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 导出范围 */}
        <div className="flex flex-col gap-[12px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">导出范围</p>
          <div className="grid grid-cols-2 gap-[12px]">
            {scopeOptions.map(({ key, label, desc }) => (
              <button
                key={key}
                className={`text-left p-[16px] rounded-[12px] border transition-all duration-150 cursor-pointer ${scope === key ? "border-[#131212] bg-[#f7f8fa]" : "border-[#e5e7eb] hover:border-[#131212] hover:bg-[#fafafa]"}`}
                onClick={() => setScope(key)}
              >
                <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[15px] font-medium leading-[normal] mb-[6px]">{label}</p>
                <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[normal]">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 导出格式 */}
        <div className="flex flex-col gap-[12px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[normal]">导出格式</p>
          <div className="grid grid-cols-4 gap-[10px]">
            {formatOptions.map(({ key, desc }) => (
              <button
                key={key}
                className={`text-left p-[14px] rounded-[12px] border transition-all duration-150 cursor-pointer ${format === key ? "border-[#131212] bg-[#f7f8fa]" : "border-[#e5e7eb] hover:border-[#131212] hover:bg-[#fafafa]"}`}
                onClick={() => setFormat(key)}
              >
                <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[15px] font-medium leading-[normal] mb-[6px]">{key}</p>
                <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[12px] leading-[normal]">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-[12px]">
          <button
            className="h-[40px] px-[24px] rounded-[8px] border border-[#e5e7eb] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
            disabled={exportBusy}
          >取消</button>
          <button
            className={`h-[40px] px-[24px] rounded-[8px] bg-[#131212] text-white text-[14px] transition-opacity ${exportBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-80 active:opacity-60"}`}
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={handleExport}
            disabled={exportBusy}
          >{exportBusy ? "导出中..." : "导出"}</button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentAssistant() {
  const [selectedDoc, setSelectedDoc] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [modal, setModal] = useState<{ type: "new" } | { type: "new-file" } | { type: "rename"; target: string } | null>(null);
  const [docDeleteConfirm, setDocDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [shared, setShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [updateCheckBusy, setUpdateCheckBusy] = useState(false);
  const manualUpdateCheckRef = useRef(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [outlineSearchEnter, setOutlineSearchEnter] = useState(0);
  const [folderName] = useState("默认文件夹");
  const [mode, setMode] = useState<"document" | "outline">("document");
  const fontSize = "15px";
  const lineHeight = "1.8";
  const theme = "light";
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>([]);
  // 按文档名持久化大纲树，避免切换模式时丢失编辑
  const [outlineTrees, setOutlineTrees] = useState<Record<string, OutlineNode[]>>({});
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [docStore, setDocStore] = useState<DocStore>({});
  const [webStoreHydrated, setWebStoreHydrated] = useState(false);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const webPersistTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const webPersistErrorShownRef = useRef(false);
  const anchorNavigationHandledRef = useRef(false);
  const editorContentRef = useRef({ html: "", text: "" });
  const importInputRef = useRef<HTMLInputElement>(null);
  const [shareUrl, setShareUrl] = useState("http://localhost:6535");
  const webShareUrlRef = useRef<string | null>(null);
  const webShareHtmlRef = useRef("");
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

  const persistDoc = useCallback((docName: string, doc: StoredDoc, delay = 500) => {
    if (!isElectron || !docName) return;
    clearTimeout(saveTimersRef.current[docName]);
    saveTimersRef.current[docName] = setTimeout(() => {
      (window as any).electronAPI.saveDoc(docName, { ...doc, updatedAt: new Date().toISOString() });
    }, delay);
  }, [isElectron]);

  const ensureDoc = useCallback((docName: string): StoredDoc => {
    return docStore[docName] ?? createStoredDoc(docName);
  }, [docStore]);

  const setAndPersistDoc = useCallback((docName: string, updater: (doc: StoredDoc) => StoredDoc, delay = 500) => {
    setDocStore((prev) => {
      const current = prev[docName] ?? createStoredDoc(docName);
      const nextDoc = { ...updater(current), name: docName, updatedAt: new Date().toISOString() };
      persistDoc(docName, nextDoc, delay);
      return { ...prev, [docName]: nextDoc };
    });
  }, [persistDoc]);

  useEffect(() => {
    const handler = () => setModal({ type: "new" });
    document.addEventListener("opencode-new-doc", handler);
    return () => document.removeEventListener("opencode-new-doc", handler);
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.onUpdateAvailable) return;

    const unsubAvailable = api.onUpdateAvailable?.(async (payload: UpdateInfo) => {
      setUpdateCheckBusy(false);
      setUpdateError("");
      setUpdateDownloaded(false);
      setUpdateProgress(null);
      const isManual = manualUpdateCheckRef.current;
      manualUpdateCheckRef.current = false;
      const skipped = api.getSkippedUpdateVersion ? await api.getSkippedUpdateVersion() : "";
      if (!isManual && skipped && payload?.version && skipped === payload.version) return;
      setUpdateInfo({
        version: payload?.version || "",
        currentVersion: payload?.currentVersion,
        releaseDate: payload?.releaseDate,
        platform: payload?.platform,
      });
    });
    const unsubNotAvailable = api.onUpdateNotAvailable?.((payload: { currentVersion?: string; reason?: string }) => {
      setUpdateCheckBusy(false);
      if (manualUpdateCheckRef.current) {
        setToast({
          message: payload?.reason === "dev" ? "开发模式不检查更新" : "当前已是最新版本",
          type: "info",
        });
        manualUpdateCheckRef.current = false;
      }
    });
    const unsubProgress = api.onUpdateProgress?.((payload: UpdateProgress) => {
      setUpdateDownloading(true);
      setUpdateProgress(payload);
    });
    const unsubDownloaded = api.onUpdateDownloaded?.((payload: { version?: string; platform?: string }) => {
      setUpdateDownloading(false);
      setUpdateDownloaded(true);
      setUpdateProgress({ percent: 100 });
      setUpdateInfo((prev) => prev ? { ...prev, version: payload?.version || prev.version, platform: payload?.platform || prev.platform } : prev);
      setToast({ message: "更新包已下载完成", type: "success" });
    });
    const unsubError = api.onUpdateError?.((payload: { message?: string }) => {
      setUpdateCheckBusy(false);
      setUpdateDownloading(false);
      const message = payload?.message || "检查或下载更新失败";
      setUpdateError(message);
      if (manualUpdateCheckRef.current) {
        setToast({ message, type: "error" });
      }
      manualUpdateCheckRef.current = false;
    });

    return () => {
      unsubAvailable?.();
      unsubNotAvailable?.();
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, [isElectron]);

  const handleCheckForUpdates = useCallback(async () => {
    if (!isElectron) {
      setToast({ message: "请在桌面应用中检查更新", type: "info" });
      return;
    }
    const api = (window as any).electronAPI;
    if (!api?.checkForUpdates) {
      setToast({ message: "当前版本不支持检查更新", type: "error" });
      return;
    }
    manualUpdateCheckRef.current = true;
    setUpdateCheckBusy(true);
    setUpdateError("");
    try {
      await api.checkForUpdates({ manual: true });
    } catch (error) {
      setUpdateCheckBusy(false);
      manualUpdateCheckRef.current = false;
      setToast({ message: error instanceof Error ? error.message : "检查更新失败", type: "error" });
    }
  }, [isElectron]);

  const handleUpdateLater = useCallback(async () => {
    if (updateInfo?.version && (window as any).electronAPI?.skipUpdateVersion) {
      try { await (window as any).electronAPI.skipUpdateVersion(updateInfo.version); } catch {}
    }
    setUpdateInfo(null);
    setUpdateDownloading(false);
    setUpdateDownloaded(false);
    setUpdateProgress(null);
    setUpdateError("");
  }, [updateInfo]);

  const handleOpenReleasePage = useCallback(async () => {
    try {
      if ((window as any).electronAPI?.openReleasePage) {
        await (window as any).electronAPI.openReleasePage();
      } else {
        window.open("https://github.com/wenlong301-hue/document-assistant/releases/latest", "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open("https://github.com/wenlong301-hue/document-assistant/releases/latest", "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    setUpdateError("");
    setUpdateDownloading(true);
    setUpdateProgress({ percent: 0 });
    try {
      const result = await (window as any).electronAPI?.downloadUpdate?.();
      if (result && result.ok === false) {
        setUpdateDownloading(false);
        setUpdateError(result.message || "下载更新失败");
      }
    } catch (error) {
      setUpdateDownloading(false);
      setUpdateError(error instanceof Error ? error.message : "下载更新失败");
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.installUpdate?.();
      if (result?.mode === "replace-in-place") {
        setToast({ message: "正在安装新版本并重启…", type: "info" });
      } else if (result?.mode === "open-installer") {
        setToast({
          message: "已打开安装包：请将应用拖入「应用程序」并选择替换，勿保留旧版",
          type: "info",
        });
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "安装更新失败");
      setToast({ message: "安装失败，请打开下载页手动安装", type: "error" });
    }
  }, []);

  useEffect(() => {
    if (isElectron) {
      (window as any).electronAPI.getDocs().then(async (list: any[]) => {
        if (list.length > 0) {
          const loadedEntries = await Promise.all(list.map(async (item: any) => {
            const id = item.id ?? item.name;
            const raw = await (window as any).electronAPI.getDoc(id);
            const doc = normalizeStoredDoc(item.name ?? id, raw);
            return [doc.name, doc] as const;
          }));
          const loadedStore = Object.fromEntries(loadedEntries) as DocStore;
          const names = loadedEntries.map(([name]) => name);
          setDocStore(loadedStore);
          setDocs(names);
          setSelectedDoc(names[0]);
          setOutlineNodes(loadedStore[names[0]]?.children ?? buildOutlineTree(names[0]));
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isElectron) return;
    let cancelled = false;
    const load = async () => {
      let persisted: WebPersistedState | null = null;
      try {
        persisted = await readWebState();
      } catch (error) {
        console.error("Failed to load IndexedDB store:", error);
      }
      if (!persisted) {
        try {
          const raw = localStorage.getItem(WEB_STORAGE_KEY);
          persisted = raw ? JSON.parse(raw) as WebPersistedState : null;
        } catch (error) {
          console.error("Failed to load legacy web store:", error);
        }
      }
      if (cancelled) return;
      if (persisted) {
        const loadedStore = Object.fromEntries(
          Object.entries(persisted.docStore ?? {}).map(([name, doc]) => [name, normalizeStoredDoc(name, doc)])
        ) as DocStore;
        const names = Array.isArray(persisted.docs)
          ? persisted.docs.filter((name: unknown): name is string => typeof name === "string")
          : Object.keys(loadedStore);
        if (names.length > 0) {
          const nextSelected = persisted.selectedDoc && names.includes(persisted.selectedDoc) ? persisted.selectedDoc : names[0];
          const firstDoc = loadedStore[nextSelected] ?? loadedStore[names[0]];
          setDocStore(loadedStore);
          setDocs(names);
          setSelectedDoc(nextSelected);
          setOutlineNodes(firstDoc?.children ?? []);
          setSelectedNodeId(firstDoc?.children?.[0]?.id ?? "");
        }
      }
      setWebStoreHydrated(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [isElectron]);

  useEffect(() => {
    if (isElectron || !webStoreHydrated) return;
    clearTimeout(webPersistTimerRef.current);
    const state: WebPersistedState = { docs, docStore, selectedDoc };
    webPersistTimerRef.current = setTimeout(async () => {
      try {
        await writeWebState(state);
        localStorage.removeItem(WEB_STORAGE_KEY);
        webPersistErrorShownRef.current = false;
      } catch (indexedDbError) {
        console.error("Failed to save IndexedDB store:", indexedDbError);
        try {
          localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state));
          webPersistErrorShownRef.current = false;
        } catch (storageError) {
          console.error("Failed to save fallback web store:", storageError);
          if (!webPersistErrorShownRef.current) {
            webPersistErrorShownRef.current = true;
            setToast({ message: "文档内容过大，浏览器存储失败，请导出文档后减少媒体文件", type: "error" });
          }
        }
      }
    }, 500);
    return () => clearTimeout(webPersistTimerRef.current);
  }, [docs, docStore, selectedDoc, isElectron, webStoreHydrated]);

  const revokeWebShareUrl = useCallback(() => {
    if (webShareUrlRef.current) {
      URL.revokeObjectURL(webShareUrlRef.current);
      webShareUrlRef.current = null;
    }
    webShareHtmlRef.current = "";
  }, []);

  useEffect(() => () => revokeWebShareUrl(), [revokeWebShareUrl]);

  const buildCurrentShareHtml = useCallback(() => {
    if (!selectedDoc) throw new Error("请先新建或选择文档");
    const doc = docStore[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
    const tree = doc.children?.length ? doc.children : getOutlineTree(selectedDoc);
    const sections = buildPreviewSections(tree, doc.content);
    const bodyHtml = sections.length > 0
      ? sections.map((section) => section.html).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n')
      : `<h1>${escapeHtml(doc.name || selectedDoc)}</h1>${emptyParagraph}`;
    return buildPreviewHtml(
      doc.name || selectedDoc,
      sections.length > 0 ? sections : [{ id: "root", name: doc.name || selectedDoc, html: bodyHtml }],
      tree,
      selectedNodeId || sections[0]?.id,
      doc.content,
    );
  }, [selectedDoc, selectedNodeId, docStore, outlineTrees]);

  const createWebShare = useCallback(() => {
    revokeWebShareUrl();
    const html = buildCurrentShareHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    webShareUrlRef.current = url;
    webShareHtmlRef.current = html;
    setShareUrl(url);
  }, [buildCurrentShareHtml, revokeWebShareUrl]);

  const handleToggleShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    setShareError("");
    try {
      if (!isElectron) {
        if (shared) {
          revokeWebShareUrl();
          setShared(false);
          setToast({ message: "分享已关闭", type: "info" });
        } else {
          createWebShare();
          setShared(true);
          setToast({ message: "分享页已生成", type: "success" });
        }
        return;
      }
      if (!shared) {
        if (!selectedDoc) {
          setShareError("请先新建或选择文档后再开启分享");
          setToast({ message: "请先选择文档", type: "error" });
          return;
        }
        const url = await (window as any).electronAPI.startShare(6535, selectedDoc);
        setShareUrl(url);
        setShared(true);
        setToast({ message: "分享已开启", type: "success" });
      } else {
        await (window as any).electronAPI.stopShare();
        setShared(false);
        setToast({ message: "分享已关闭", type: "info" });
      }
    } catch (error) {
      console.error("Failed to toggle share:", error);
      const message = error instanceof Error ? error.message : "分享操作失败";
      setShareError(message.includes("EADDRINUSE") ? "端口 6535 已被占用，请关闭占用程序后重试。" : message);
      setToast({ message: "分享开启失败", type: "error" });
    } finally {
      setShareBusy(false);
    }
  };

  const handleDownloadShareHtml = () => {
    try {
      const html = webShareHtmlRef.current || buildCurrentShareHtml();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc || "文档助手分享"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "分享HTML已下载", type: "success" });
    } catch (error) {
      console.error("Failed to download share HTML:", error);
      setToast({ message: error instanceof Error ? error.message : "下载分享HTML失败", type: "error" });
    }
  };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^/.]+$/, "");
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "docx") {
      try {
        const buffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        const html = result.value;
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const title = titleMatch ? titleMatch[1].trim() : name;
        const tree = buildOutlineTree(title);
        const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
        const doc = createStoredDoc(title, tree, { [leaf.id]: html || emptyParagraph });
        setDocs((prev) => [...new Set([...prev, title])]);
        setSelectedDoc(title);
        setDocStore((prev) => ({ ...prev, [title]: doc }));
        setOutlineTrees((prev) => ({ ...prev, [title]: tree }));
        setOutlineNodes(tree);
        setSelectedNodeId(leaf.id);
        setMode("outline");
        editorContentRef.current = { html, text: new DOMParser().parseFromString(html, "text/html").body.textContent || "" };
        persistDoc(title, doc, 0);
      } catch { setToast({ message: "导入失败", type: "error" }); }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (ext === "mdoc") {
          try {
            const raw = JSON.parse(text);
            const doc = normalizeStoredDoc(name, raw);
            const firstNode = flattenOutlineNodes(doc.children).find((node) => doc.content[node.id]?.replace(/<[^>]*>/g, "").trim()) ?? flattenOutlineNodes(doc.children)[0];
            setDocs((prev) => [...new Set([...prev, doc.name])]);
            setSelectedDoc(doc.name);
            setDocStore((prev) => ({ ...prev, [doc.name]: doc }));
            setOutlineTrees((prev) => ({ ...prev, [doc.name]: doc.children }));
            setOutlineNodes(doc.children);
            setSelectedNodeId(firstNode?.id ?? "");
            persistDoc(doc.name, doc, 0);
          } catch {
            setToast({ message: "mdoc 文件格式错误", type: "error" });
            return;
          }
        } else if (ext === "md") {
          const html = markdownToSimpleHtml(text);
          const lines = text.split("\n");
          const titles: string[] = [];
          lines.forEach(line => {
            const m = line.match(/^(#{1,5})\s+(.+)/);
            if (m) titles.push(m[2].trim());
          });
          const title = titles[0] || name;
          const tree = buildOutlineTree(title);
          const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
          const doc = createStoredDoc(title, tree, { [leaf.id]: html });
          setDocs((prev) => [...new Set([...prev, title])]);
          setSelectedDoc(title);
          setDocStore((prev) => ({ ...prev, [title]: doc }));
          setOutlineTrees((prev) => ({ ...prev, [title]: tree }));
          setOutlineNodes(tree);
          setSelectedNodeId(leaf.id);
          persistDoc(title, doc, 0);
        } else {
          const html = textToHtml(text);
          const tree = buildOutlineTree(name);
          const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
          const doc = createStoredDoc(name, tree, { [leaf.id]: html });
          setDocs((prev) => [...new Set([...prev, name])]);
          setSelectedDoc(name);
          setDocStore((prev) => ({ ...prev, [name]: doc }));
          setOutlineTrees((prev) => ({ ...prev, [name]: tree }));
          setOutlineNodes(tree);
          setSelectedNodeId(leaf.id);
          persistDoc(name, doc, 0);
        }
        setMode("outline");
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  useEffect(() => {
    if (anchorNavigationHandledRef.current || (!isElectron && !webStoreHydrated) || docs.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetDoc = params.get("doc");
    const targetNode = params.get("node");
    if (!targetDoc || !targetNode || !docs.includes(targetDoc)) {
      anchorNavigationHandledRef.current = true;
      return;
    }
    const tree = docStore[targetDoc]?.children ?? [];
    if (!findNode(tree, targetNode)) {
      anchorNavigationHandledRef.current = true;
      setToast({ message: "锚点对应的文档内容不存在", type: "error" });
      return;
    }
    anchorNavigationHandledRef.current = true;
    setSelectedDoc(targetDoc);
    setOutlineNodes(tree);
    setSelectedNodeId(targetNode);
    setMode("outline");
  }, [docs, docStore, isElectron, webStoreHydrated]);

  const getOutlineTree = (docName: string) =>
    docName ? (docStore[docName]?.children ?? outlineTrees[docName] ?? buildEmptyOutlineTree(docName)) : [];

  const getNodeContent = (docName: string, nodeId: string) =>
    docStore[docName]?.content?.[nodeId] ?? emptyParagraph;

  useEffect(() => {
    if (isElectron || !shared) return;
    revokeWebShareUrl();
    setShared(false);
  }, [selectedDoc, isElectron]);

  const updateOutlineTree = (docName: string, nodes: OutlineNode[]) => {
    setOutlineNodes(nodes);
    setOutlineTrees((prev) => ({ ...prev, [docName]: nodes }));
    setAndPersistDoc(docName, (doc) => ({ ...doc, children: nodes }));
  };

  const getDocChildCount = (docName: string) => {
    const tree = getOutlineTree(docName);
    return tree.reduce((acc, n) => acc + countDescendants(n), 0);
  };

  const handleSelectDoc = (name: string) => {
    setSelectedDoc(name);
    const tree = getOutlineTree(name);
    setOutlineNodes(tree);
    setSelectedNodeId(tree[0]?.id ?? "");
    if (mode === "outline") setMode("outline");
  };

  const handleNewDoc = (name: string) => {
    const tree = buildOutlineTree(name);
    const doc = createStoredDoc(name, tree);
    setDocs((prev) => [...prev, name]);
    setSelectedDoc(name);
    setDocStore((prev) => ({ ...prev, [name]: doc }));
    setOutlineTrees((prev) => ({ ...prev, [name]: doc.children }));
    setOutlineNodes(doc.children);
    setSelectedNodeId(tree[0]?.id ?? "");
    setMode("outline");
    persistDoc(name, doc, 0);
  };

  const handleNewRootFile = (name: string) => {
    if (!selectedDoc || mode !== "outline") return;
    const newNode: OutlineNode = { id: `file-${Date.now()}`, name, children: [] };
    const nextNodes = [...outlineNodes, newNode];
    updateOutlineTree(selectedDoc, nextNodes);
    setSelectedNodeId(newNode.id);
  };

  const handleRename = (oldName: string, newName: string) => {
    setDocs((prev) => prev.map((d) => (d === oldName ? newName : d)));
    if (selectedDoc === oldName) setSelectedDoc(newName);
    const renamedDoc = { ...(docStore[oldName] ?? createStoredDoc(oldName)), name: newName, updatedAt: new Date().toISOString() };
    setOutlineTrees((prev) => {
      const tree = prev[oldName] ?? renamedDoc.children;
      const { [oldName]: _oldTree, ...rest } = prev;
      return { ...rest, [newName]: tree };
    });
    setDocStore((prev) => {
      const { [oldName]: _oldDoc, ...rest } = prev;
      return { ...rest, [newName]: renamedDoc };
    });
    if (isElectron) {
      (window as any).electronAPI.deleteDoc(oldName);
      persistDoc(newName, renamedDoc, 0);
    }
  };

  const doDeleteDoc = (name: string) => {
    setDocs((prev) => {
      const next = prev.filter((d) => d !== name);
      if (selectedDoc === name && next.length > 0) setSelectedDoc(next[0]);
      return next;
    });
    setOutlineTrees((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    setDocStore((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    if (mode === "outline" && selectedDoc === name) setMode("document");
    if (isElectron) (window as any).electronAPI.deleteDoc(name);
  };

  const handleDelete = (name: string) => {
    const childCount = getDocChildCount(name);
    setDocDeleteConfirm({
      message: buildDeleteMessage("doc", name, childCount),
      onConfirm: () => doDeleteDoc(name),
    });
  };

  const handleDocListExport = async (name: string) => {
    const doc = docStore[name] ?? createStoredDoc(name, getOutlineTree(name));
    const parts = flattenOutlineNodes(doc.children).map((node) => ({
      name: node.name,
      html: doc.content?.[node.id] || emptyParagraph,
    }));
    const bodyHtml = parts.length > 0
      ? parts.map((part) => `<h1>${escapeHtml(part.name)}</h1>${part.html}`).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n')
      : `<h1>${escapeHtml(doc.name || name)}</h1>${emptyParagraph}`;
    const sections = buildPreviewSections(doc.children, doc.content);
    const fullHtml = buildPreviewHtml(doc.name || name, sections.length > 0 ? sections : [{ id: "root", name: doc.name || name, html: bodyHtml }], doc.children, sections[0]?.id, doc.content);
    if (isElectron) {
      await (window as any).electronAPI.exportHtml(fullHtml, `${doc.name || name}.html`);
      return;
    }
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name || name}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToFolder = async () => {
    if (!selectedDoc) {
      setToast({ message: "请先新建或选择文档", type: "info" });
      return;
    }
    const doc = docStore[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
    const payload = { ...doc, children: getOutlineTree(selectedDoc), updatedAt: new Date().toISOString() };
    if (isElectron && (window as any).electronAPI.saveDocToFolder) {
      const result = await (window as any).electronAPI.saveDocToFolder(selectedDoc, payload);
      if (!result?.canceled) setToast({ message: "已保存到选择的位置", type: "success" });
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDoc}.mdoc`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: "已下载文档文件", type: "success" });
  };

  const handleTopBarDelete = () => {
    if (!selectedDoc) return;
    const childCount = getDocChildCount(selectedDoc);
    setDocDeleteConfirm({
      message: buildDeleteMessage("doc", selectedDoc, childCount),
      onConfirm: () => doDeleteDoc(selectedDoc),
    });
  };

  const handleEnterOutline = () => {
    if (!selectedDoc) return;
    const tree = getOutlineTree(selectedDoc);
    setOutlineNodes(tree);
    setSelectedNodeId(tree[0]?.id ?? "");
    setMode("outline");
  };

  const handleSwitchMode = () => {
    if (mode === "document") {
      handleEnterOutline();
    } else {
      setMode("document");
    }
  };

  const handleSearchEnter = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (mode === "document") {
      const matches = docs.filter(d => d.toLowerCase().includes(q));
      if (matches.length === 1) handleSelectDoc(matches[0]);
    } else {
      setOutlineSearchEnter(t => t + 1);
    }
  };

  const selectedNode = mode === "outline" ? findNode(outlineNodes, selectedNodeId) : null;
  const selectedNodeDepth = mode === "outline" ? findNodeDepth(outlineNodes, selectedNodeId) : 0;

  const handleTitleChange = (name: string) => {
    if (mode === "outline" && selectedNode) {
      const renameInTree = (arr: OutlineNode[]): OutlineNode[] =>
        arr.map((node) => node.id === selectedNode.id ? { ...node, name } : { ...node, children: renameInTree(node.children) });
      updateOutlineTree(selectedDoc, renameInTree(outlineNodes));
      return;
    }
    if (selectedDoc && name !== selectedDoc) handleRename(selectedDoc, name);
  };

  const handleNodeContentChange = (html: string, text: string) => {
    if (!selectedNode) return;
    editorContentRef.current = { html, text };
    setAndPersistDoc(selectedDoc, (doc) => ({
      ...doc,
      children: getOutlineTree(selectedDoc),
      content: { ...doc.content, [selectedNode.id]: html },
    }));
  };

  return (
    <div className="bg-[#f7f8fa] relative size-full" data-name="首页-文档模式">
      <EditorWorkspace docName={selectedDoc} mode={mode} selectedNode={selectedNode} nodeDepth={selectedNodeDepth} nodeContent={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : emptyParagraph} onTitleChange={handleTitleChange} theme={theme} fontSize={fontSize} lineHeight={lineHeight} sidebarWidth={276}
        onContentChange={handleNodeContentChange} />
      <Frame11 onOpenShare={() => setShowShareModal(true)} onOpenExport={() => setShowExportModal(true)} onDelete={handleTopBarDelete} onImport={() => importInputRef.current?.click()} onSave={handleSaveToFolder} onOpenHelp={() => setShowHelpModal(true)} />
      <input ref={importInputRef} type="file" accept=".mdoc,.md,.txt,.docx" className="hidden" onChange={handleImport} />
      <Group1 value={searchQuery} onChange={setSearchQuery} mode={mode} onEnter={handleSearchEnter} />
      {mode === "document" ? (
        <Frame16
          docs={searchQuery.trim() ? docs.filter(d => d.toLowerCase().includes(searchQuery.trim().toLowerCase())) : docs}
          selected={selectedDoc}
          onSelect={handleSelectDoc}
          onRename={(name) => setModal({ type: "rename", target: name })}
          onDelete={handleDelete}
          onExport={handleDocListExport}
          onEnterOutline={handleEnterOutline}
        />
      ) : (
        <OutlineTree nodes={outlineNodes} selectedId={selectedNodeId} contentMap={docStore[selectedDoc]?.content ?? {}} onSelect={setSelectedNodeId} onUpdateNodes={(nodes) => updateOutlineTree(selectedDoc, nodes)} filter={searchQuery} enterTick={outlineSearchEnter} />
      )}
      <Frame27 onNewDoc={() => setModal({ type: "new" })} onNewFile={() => setModal({ type: "new-file" })} mode={mode} onSwitchMode={handleSwitchMode} />
      <Frame4 folderName={mode === "outline" ? (selectedDoc || folderName) : folderName} />
      <SidebarShareStatus shared={shared} onClick={() => setShowShareModal(true)} />
      {docDeleteConfirm && (
        <DeleteConfirmModal
          message={docDeleteConfirm.message}
          onConfirm={docDeleteConfirm.onConfirm}
          onClose={() => setDocDeleteConfirm(null)}
        />
      )}
      {showExportModal && (
        <ExportModal docName={selectedDoc} content={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : editorContentRef.current.html} contentMap={docStore[selectedDoc]?.content ?? {}} outlineNodes={outlineNodes} selectedNodeId={selectedNodeId} isElectron={!!isElectron} onClose={() => setShowExportModal(false)} onToast={(message, type) => setToast({ message, type })} />
      )}
      {showShareModal && (
        <ShareModal
          shared={shared}
          mode={isElectron ? "electron" : "web"}
          loading={shareBusy}
          errorMessage={shareError}
          shareUrl={shareUrl}
          onToggle={handleToggleShare}
          onDownload={isElectron ? undefined : handleDownloadShareHtml}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showHelpModal && (
        <HelpModal
          onClose={() => setShowHelpModal(false)}
          onCheckUpdate={isElectron ? handleCheckForUpdates : undefined}
          updateCheckBusy={updateCheckBusy}
        />
      )}
      {updateInfo && (
        <UpdateModal
          info={updateInfo}
          downloading={updateDownloading}
          downloaded={updateDownloaded}
          progress={updateProgress}
          errorMessage={updateError}
          onLater={handleUpdateLater}
          onOpenRelease={handleOpenReleasePage}
          onDownload={handleDownloadUpdate}
          onInstall={handleInstallUpdate}
        />
      )}
      {modal?.type === "new" && (
        <NewDocModal
          title="新建文档"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewDoc(name); setModal(null); }}
        />
      )}
      {modal?.type === "new-file" && (
        <NewDocModal
          title="新建文件"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewRootFile(name); setModal(null); }}
        />
      )}
      {modal?.type === "rename" && (
        <NewDocModal
          title="重命名"
          initialValue={modal.target}
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleRename(modal.target, name); setModal(null); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
