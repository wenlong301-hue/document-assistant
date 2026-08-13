import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, FontSize, LineHeight, TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import editorSvg from "../../imports/首页大纲模式根节点未编写内容-1/svg-208e2u96ym";
import {
  AttachmentNode,
  BlockAnchorExtension,
  IndentExtension,
  insertParagraphAfterAncestor,
  isCurrentCodeLineEmpty,
  isTiptapBlockEmpty,
  ResizableImage,
  TableCellWithRowHeight,
  TableHeaderWithRowHeight,
  TyporaKeymap,
  VideoNode,
} from "./extensions";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  formatSavedAt,
  getEditorTextCount,
  getEditorWordCount,
  getSlashMenuPlacement,
  HEADING_OPTIONS,
  normalizeHexColor,
} from "./constants";
import {
  compressImageForEmbed,
  emptyParagraph,
  fileToDataUrl,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_VIDEO_BYTES,
  sanitizeHtml,
} from "./utils/html";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "./utils/image";
import { ColorPicker } from "./ui/ColorPicker";
import { Dropdown } from "./ui/Dropdown";
import { EditorToolBtn } from "./ui/EditorToolBtn";
import { IconSvg, InlineIconSvg } from "./ui/IconSvg";
import { LinkModal } from "./ui/LinkModal";
import { Toast } from "./ui/Toast";

export function RichEditorTiptap({ docName, nodeId, initialHtml, onContentChange, fontSize: propFontSize, lineHeight: propLineHeight, theme: propTheme }: {
  docName: string; nodeId: string; initialHtml?: string; onContentChange?: (html: string, text: string) => void;
  fontSize?: string; lineHeight?: string; theme?: string;
}) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const lastExternalHtmlRef = useRef("");
  const lastSyncedNodeIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [toolbarTick, setToolbarTick] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  type ToolbarPanel = null | "heading" | "font" | "size" | "align" | "fore" | "back" | "link" | "table";
  const [toolbarPanel, setToolbarPanel] = useState<ToolbarPanel>(null);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });
  const [headingDropPos, setHeadingDropPos] = useState({ x: 0, y: 0 });
  const [fontDropPos, setFontDropPos] = useState({ x: 0, y: 0 });
  const [sizeDropPos, setSizeDropPos] = useState({ x: 0, y: 0 });
  const [alignDropPos, setAlignDropPos] = useState({ x: 0, y: 0 });
  const [linkModalPos, setLinkModalPos] = useState({ x: 0, y: 0 });
  const [linkModalText, setLinkModalText] = useState("");
  const [linkModalUrl, setLinkModalUrl] = useState("");
  const [linkModalMode, setLinkModalMode] = useState<"insert" | "edit">("insert");
  const showColorPicker = toolbarPanel === "fore" || toolbarPanel === "back" ? toolbarPanel : null;
  const showHeadingDropdown = toolbarPanel === "heading";
  const showFontDropdown = toolbarPanel === "font";
  const showSizeDropdown = toolbarPanel === "size";
  const showAlignDropdown = toolbarPanel === "align";
  const showLinkModal = toolbarPanel === "link";
  const showTableModal = toolbarPanel === "table";
  const setShowColorPicker = (v: "fore" | "back" | null) => setToolbarPanel(v);
  const setShowHeadingDropdown = (v: boolean) => setToolbarPanel(v ? "heading" : null);
  const setShowFontDropdown = (v: boolean) => setToolbarPanel(v ? "font" : null);
  const setShowSizeDropdown = (v: boolean) => setToolbarPanel(v ? "size" : null);
  const setShowAlignDropdown = (v: boolean) => setToolbarPanel(v ? "align" : null);
  const setShowLinkModal = (v: boolean) => setToolbarPanel(v ? "link" : null);
  const setShowTableModal = (v: boolean) => setToolbarPanel(v ? "table" : null);
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const [tableToolbarPos, setTableToolbarPos] = useState({ top: 0, left: 0 });
  const [tableRowHandles, setTableRowHandles] = useState<{ top: number; left: number; width: number; index: number; row: HTMLTableRowElement }[]>([]);
  const [activeRowResizeIndex, setActiveRowResizeIndex] = useState<number | null>(null);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [selectedImgRect, setSelectedImgRect] = useState<DOMRect | null>(null);
  const [editorVisibleRect, setEditorVisibleRect] = useState<DOMRect | null>(null);
  const [imageRatioLocked, setImageRatioLocked] = useState(true);
  const [imageCustomPct, setImageCustomPct] = useState("");
  const [imgBarSlider, setImgBarSlider] = useState(false);
  const selectedImagePosRef = useRef<number | null>(null);
  const [tocHeadings, setTocHeadings] = useState<{ tag: string; text: string; id: string }[]>([]);
  const [tocActiveId, setTocActiveId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ top: number; left: number; maxHeight?: number } | null>(null);
  const [slashActive, setSlashActive] = useState(-1);
  const slashMenuRef = useRef<typeof slashMenu>(null);
  const slashActiveRef = useRef(-1);
  const slashMenuElRef = useRef<HTMLDivElement | null>(null);
  const slashItemsRef = useRef<{ label: string; icon: React.ReactNode; action: () => void; kind?: "file" }[]>([]);
  const editorInstanceRef = useRef<any>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  imageRatioLockedRef.current = imageRatioLocked;
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const pendingSlashCleanupRef = useRef<{ from: number; to: number } | null>(null);
  const tocListRef = useRef<HTMLDivElement>(null);
  const tocButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const tocScrollRafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const onContentChangeRef = useRef(onContentChange);
  slashMenuRef.current = slashMenu;
  slashActiveRef.current = slashActive;

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  const saveEditorSelection = useCallback(() => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return null;
    const selection = { from: activeEditor.state.selection.from, to: activeEditor.state.selection.to };
    savedSelectionRef.current = selection;
    return selection;
  }, []);

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
    const rowRects = Array.from(table.querySelectorAll("tr")).map((row, index) => {
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
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 620)),
      top: tableBarTop,
    });
    setTableRowHandles(rowRects);
    setShowTableToolbar(true);
  }, [saveEditorSelection]);

  const clearImageToolbar = useCallback(() => {
    selectedImagePosRef.current = null;
    setSelectedImgRect(null);
    setEditorVisibleRect(null);
  }, []);

  const updateImageToolbar = useCallback((activeEditor = editorInstanceRef.current) => {
    if (!activeEditor || activeEditor.isDestroyed || !activeEditor.isActive("image")) {
      clearImageToolbar();
      return;
    }
    const { from } = activeEditor.state.selection;
    let pos: number | null = null;
    const nodeAt = activeEditor.state.doc.nodeAt(from);
    if (nodeAt?.type?.name === "image") pos = from;
    else {
      const $from = activeEditor.state.selection.$from;
      for (let d = $from.depth; d >= 0; d--) {
        const n = $from.node(d);
        if (n.type.name === "image") {
          pos = $from.before(d);
          break;
        }
      }
      if (pos == null) {
        const maybe = activeEditor.state.selection as { node?: { type?: { name?: string } }; from: number };
        if (maybe.node?.type?.name === "image") pos = maybe.from;
      }
    }
    if (pos == null) {
      clearImageToolbar();
      return;
    }
    const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
    if (!dom) {
      clearImageToolbar();
      return;
    }
    const img = (dom.tagName === "IMG" ? dom : dom.querySelector("img")) as HTMLImageElement | null;
    const target = img ?? dom;
    const rect = target.getBoundingClientRect();
    const toolbarBottom = toolbarRef.current?.getBoundingClientRect().bottom ?? 120;
    if (rect.bottom + 56 < toolbarBottom || rect.top > window.innerHeight) {
      clearImageToolbar();
      return;
    }
    selectedImagePosRef.current = pos;
    setSelectedImgRect(rect);
    setEditorVisibleRect(activeEditor.view.dom.getBoundingClientRect());
  }, [clearImageToolbar]);

  const syncSlashMenu = useCallback((activeEditor = editorInstanceRef.current) => {
    if (!slashMenuRef.current) return;
    if (!activeEditor || activeEditor.isDestroyed) {
      setSlashMenu(null);
      return;
    }
    const { $from, from, empty } = activeEditor.state.selection;
    if (!empty) {
      setSlashMenu(null);
      return;
    }
    const lineText = activeEditor.state.doc.textBetween($from.start(), from, "\n", "\n");
    if (!/^\s*\//.test(lineText)) setSlashMenu(null);
  }, []);

  const applySelectedImageWidth = useCallback((pct: number | "auto") => {
    const activeEditor = editorInstanceRef.current;
    const pos = selectedImagePosRef.current;
    if (!activeEditor || pos == null) return;
    const node = activeEditor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== "image") return;
    const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
    const img = (dom?.tagName === "IMG" ? dom : dom?.querySelector("img")) as HTMLImageElement | null;
    if (pct === "auto") {
      if (img) {
        img.style.width = "";
        img.style.height = "";
        img.style.maxWidth = "";
      }
      syncContainerToImage(dom);
      activeEditor.chain().setNodeSelection(pos).updateAttributes("image", { width: null, height: null }).run();
    } else {
      const parentW = activeEditor.view.dom.clientWidth || 1;
      const width = Math.max(48, Math.round(parentW * Math.min(100, Math.max(5, pct)) / 100));
      const naturalW = img?.naturalWidth || Number(node.attrs.width) || width;
      const naturalH = img?.naturalHeight || Number(node.attrs.height) || width;
      const locked = imageRatioLockedRef.current;
      const sized = fitImageSize(width, width / (naturalW / Math.max(1, naturalH)), naturalW, naturalH, locked);
      if (img) {
        img.style.width = `${sized.width}px`;
        img.style.height = locked ? "auto" : `${sized.height}px`;
        img.style.maxWidth = "none";
      }
      syncContainerToImage(dom);
      activeEditor.chain().setNodeSelection(pos).updateAttributes("image", {
        width: sized.width,
        height: locked ? null : sized.height,
      }).run();
    }
    window.requestAnimationFrame(() => {
      syncContainerToImage(activeEditor.view.nodeDOM(pos) as HTMLElement | null);
      updateImageToolbar(activeEditor);
    });
  }, [updateImageToolbar]);

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

  const ensureHeadingAnchors = useCallback((activeEditor: any) => {
    if (!activeEditor || activeEditor.isDestroyed) return false;
    const seenIds = new Set<string>();
    const safeNodeId = (nodeId || "document").replace(/[^a-zA-Z0-9_-]/g, "-");
    let transaction = activeEditor.state.tr;
    activeEditor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name !== "heading") return;
      const currentId = typeof node.attrs.id === "string" ? node.attrs.id.trim() : "";
      if (currentId && !seenIds.has(currentId)) {
        seenIds.add(currentId);
        return;
      }
      const randomPart = typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const nextId = `heading-${safeNodeId}-${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, "-");
      seenIds.add(nextId);
      transaction = transaction.setNodeMarkup(pos, undefined, { ...node.attrs, id: nextId }, node.marks);
    });
    if (!transaction.docChanged) return false;
    activeEditor.view.dispatch(transaction);
    return true;
  }, [nodeId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        codeBlock: {
          HTMLAttributes: { class: "doc-code-block" },
        },
        blockquote: {
          HTMLAttributes: { class: "doc-blockquote" },
        },
        bulletList: {
          keepMarks: true,
          HTMLAttributes: { class: "doc-list doc-bullet-list" },
        },
        orderedList: {
          keepMarks: true,
          HTMLAttributes: { class: "doc-list doc-ordered-list" },
        },
      }),
      TyporaKeymap,
      TextStyle,
      Color,
      BackgroundColor,
      FontFamily,
      FontSize,
      LineHeight,
      IndentExtension,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Placeholder.configure({ placeholder: "输入 / 呼出命令，或直接开始写作" }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { class: "doc-link", target: "_blank", rel: "noreferrer" },
      }),
      BlockAnchorExtension,
      VideoNode,
      AttachmentNode,
      ResizableImage.configure({
        allowBase64: true,
        HTMLAttributes: { class: "doc-image" },
        resize: { enabled: true, alwaysPreserveAspectRatio: false, minWidth: 48, minHeight: 48 },
      }),
      Table.configure({
        resizable: true,
        cellMinWidth: 96,
        handleWidth: 6,
        lastColumnResizable: false,
        HTMLAttributes: { class: "doc-table" },
      }),
      TableRow,
      TableHeaderWithRowHeight,
      TableCellWithRowHeight,
      TaskList.configure({ HTMLAttributes: { class: "doc-task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "doc-task-item" } }),
    ],
    content: sanitizeHtml(initialHtml || emptyParagraph),
    editorProps: {
      handleDOMEvents: {
        keydown: (view, event) => {
          const activeEditor = editorInstanceRef.current;
          if (!activeEditor) return false;
          if (slashMenuRef.current) {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopImmediatePropagation();
              setSlashMenu(null);
              return true;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              event.stopImmediatePropagation();
              const count = slashItemsRef.current.length;
              if (count > 0) {
                const next = event.key === "ArrowDown"
                  ? (slashActiveRef.current + 1 + count) % count
                  : (slashActiveRef.current - 1 + count) % count;
                slashActiveRef.current = next;
                setSlashActive(next);
                requestAnimationFrame(() => {
                  const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${next}"]`);
                  el?.scrollIntoView({ block: "nearest" });
                });
              }
              return true;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopImmediatePropagation();
              const item = slashItemsRef.current[slashActiveRef.current] ?? slashItemsRef.current[0];
              if (item) {
                if (item.kind === "file") runSlashFileAction(item.action);
                else runSlashAction(item.action);
              }
              return true;
            }
          }
          if (event.key === "Tab") {
            if (activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) {
              event.preventDefault();
              const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
              return event.shiftKey
                ? activeEditor.chain().focus().liftListItem(itemName).run()
                : activeEditor.chain().focus().sinkListItem(itemName).run();
            }
            return false;
          }
          if ((event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) && activeEditor.isActive("codeBlock")) {
            event.preventDefault();
            return activeEditor.chain().focus().exitCode().run();
          }
          if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
          if (activeEditor.isActive("codeBlock")) {
            if (isCurrentCodeLineEmpty(activeEditor)) {
              event.preventDefault();
              return activeEditor.chain().focus().exitCode().run();
            }
            return false;
          }
          if (activeEditor.isActive("blockquote") && isTiptapBlockEmpty(activeEditor)) {
            event.preventDefault();
            return insertParagraphAfterAncestor(activeEditor, "blockquote");
          }
          if ((activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) && isTiptapBlockEmpty(activeEditor)) {
            event.preventDefault();
            const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
            return activeEditor.chain().focus().liftListItem(itemName).setParagraph().run();
          }
          return false;
        },
      },
      attributes: {
        class: "doc-tiptap-content ProseMirror h-full min-h-0 overflow-y-auto overscroll-contain px-[24px] py-[24px] outline-none",
        style: `font-size:${propFontSize || "15px"};line-height:${propLineHeight || "1.8"};font-family:PingFang SC, sans-serif;`,
      },
      handleKeyDown(view, event) {
        const activeEditor = editorInstanceRef.current;
        if (!activeEditor) return false;
        if (event.key === "Tab") {
          if (activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) {
            event.preventDefault();
            const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
            return event.shiftKey
              ? activeEditor.chain().focus().liftListItem(itemName).run()
              : activeEditor.chain().focus().sinkListItem(itemName).run();
          }
          return false;
        }
        if ((event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) && activeEditor.isActive("codeBlock")) {
          event.preventDefault();
          return activeEditor.chain().focus().exitCode().run();
        }
        if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
        if (activeEditor.isActive("codeBlock")) {
          if (isCurrentCodeLineEmpty(activeEditor)) {
            event.preventDefault();
            return activeEditor.chain().focus().exitCode().run();
          }
          return false;
        }
        if (activeEditor.isActive("blockquote") && isTiptapBlockEmpty(activeEditor)) {
          event.preventDefault();
          return insertParagraphAfterAncestor(activeEditor, "blockquote");
        }
        if ((activeEditor.isActive("listItem") || activeEditor.isActive("taskItem")) && isTiptapBlockEmpty(activeEditor)) {
          event.preventDefault();
          const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
          return activeEditor.chain().focus().liftListItem(itemName).setParagraph().run();
        }
        return false;
      },
      handleTextInput(view, from, to, text) {
        const activeEditor = editorInstanceRef.current;
        if (text === "/") {
          const { $from } = view.state.selection;
          const lineText = view.state.doc.textBetween($from.start(), from, "\n", "\n");
          if (!lineText.trim()) {
            const rect = view.coordsAtPos(from);
            window.setTimeout(() => {
              if (activeEditor?.isDestroyed) return;
              setSlashMenu(getSlashMenuPlacement(
                { left: rect.left, top: rect.top, bottom: rect.bottom },
                { itemCount: slashItemsRef.current.length || 14 },
              ));
              setSlashActive(0);
            }, 0);
          }
          return false;
        }
        if (text !== " " || !activeEditor) return false;
        const { $from } = view.state.selection;
        const start = $from.start();
        const textBefore = view.state.doc.textBetween(start, from, "\n", "\n");
        const clearTrigger = () => activeEditor.chain().focus().deleteRange({ from: start, to: from });
        if (/^#{1,6}$/.test(textBefore)) {
          return clearTrigger().toggleHeading({ level: textBefore.length as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }
        if (textBefore === ">") return clearTrigger().toggleBlockquote().run();
        if (/^\d+\.$/.test(textBefore)) return clearTrigger().toggleOrderedList().run();
        if (/^[-*+]$/.test(textBefore)) return clearTrigger().toggleBulletList().run();
        if (textBefore === "```") return clearTrigger().toggleCodeBlock().run();
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i += 1) {
            if (items[i].type.startsWith("image/")) {
              const file = items[i].getAsFile();
              if (!file) return false;
              event.preventDefault();
              savedSelectionRef.current = { from: view.state.selection.from, to: view.state.selection.to };
              void insertImageFromFile(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const image = Array.from(files).find((file) => file.type.startsWith("image/"));
        if (!image) return false;
        event.preventDefault();
        const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
        savedSelectionRef.current = { from: dropPos, to: dropPos };
        void insertImageFromFile(image);
        return true;
      },
    },
    onCreate({ editor }) {
      if (ensureHeadingAnchors(editor)) return;
      const text = editor.getText();
      setCharCount(getEditorTextCount(text));
      setWordCount(getEditorWordCount(text));
      lastExternalHtmlRef.current = sanitizeHtml(initialHtml || emptyParagraph);
      refreshToc(editor);
    },
    onUpdate({ editor }) {
      syncSlashMenu(editor);
      if (ensureHeadingAnchors(editor)) return;
      const html = sanitizeHtml(editor.getHTML());
      const text = editor.getText();
      lastExternalHtmlRef.current = html;
      setCharCount(getEditorTextCount(text));
      setWordCount(getEditorWordCount(text));
      setSaveStatus("unsaved");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveStatus("saving");
        window.setTimeout(() => {
          setSavedAt(formatSavedAt());
          setSaveStatus("saved");
        }, 160);
      }, 500);
      onContentChange?.(html, text);
      setToolbarTick((tick) => tick + 1);
      refreshToc(editor);
      updateImageToolbar(editor);
    },
    onSelectionUpdate({ editor }) {
      setToolbarTick((tick) => tick + 1);
      updateTableToolbar(editor);
      updateImageToolbar(editor);
      syncSlashMenu(editor);
    },
  }, [nodeId, updateTableToolbar, updateImageToolbar, syncSlashMenu, ensureHeadingAnchors]);
  editorInstanceRef.current = editor;

  const refreshToc = useCallback((activeEditor: any) => {
    if (!activeEditor || activeEditor.isDestroyed) return;
    const headings: { tag: string; text: string; id: string }[] = [];
    activeEditor.state.doc.descendants((node: any) => {
      if (node.type.name !== "heading") return;
      const text = String(node.textContent || "").trim().slice(0, 50);
      const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
      if (text && id) headings.push({ tag: `h${node.attrs.level || 1}`, text, id });
    });
    setTocHeadings(headings);
    setTocActiveId((current) => current && headings.some((heading) => heading.id === current) ? current : headings[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = sanitizeHtml(initialHtml || emptyParagraph);
    const nodeChanged = lastSyncedNodeIdRef.current !== nodeId;
    const externalChanged = next !== lastExternalHtmlRef.current;
    if (!nodeChanged && !externalChanged) return;

    lastSyncedNodeIdRef.current = nodeId;
    lastExternalHtmlRef.current = next;
    const current = sanitizeHtml(editor.getHTML());
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    const text = editor.getText();
    setCharCount(getEditorTextCount(text));
    setWordCount(getEditorWordCount(text));
    setSaveStatus("saved");
    setSavedAt(formatSavedAt());
    if (!ensureHeadingAnchors(editor)) refreshToc(editor);
  }, [editor, nodeId, initialHtml, refreshToc, ensureHeadingAnchors]);

  const scrollToHeading = useCallback((headingId: string, behavior: ScrollBehavior = "smooth") => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor || activeEditor.isDestroyed) return false;
    const scrollElement = activeEditor.view.dom as HTMLElement;
    const target = scrollElement.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`);
    if (!target) return false;
    const containerRect = scrollElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTop = Math.max(0, scrollElement.scrollTop + targetRect.top - containerRect.top - 20);
    scrollElement.scrollTo({ top: targetTop, behavior });
    setTocActiveId(headingId);
    return true;
  }, []);

  useEffect(() => {
    if (!editor || new URLSearchParams(window.location.search).get("node") !== nodeId || !window.location.hash) return;
    const anchorId = decodeURIComponent(window.location.hash.slice(1));
    const timer = window.setTimeout(() => { scrollToHeading(anchorId, "smooth"); }, 120);
    return () => window.clearTimeout(timer);
  }, [editor, nodeId, initialHtml, scrollToHeading, tocHeadings]);

  useEffect(() => {
    if (!editor) return;
    const scrollElement = editor.view.dom as HTMLElement;
    const updateActiveHeading = () => {
      tocScrollRafRef.current = null;
      const headings = Array.from(scrollElement.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]"));
      if (headings.length === 0) {
        setTocActiveId(null);
        return;
      }
      const containerRect = scrollElement.getBoundingClientRect();
      const activationLine = containerRect.top + 36;
      let activeHeading = headings[0];
      headings.forEach((heading) => {
        if (heading.getBoundingClientRect().top <= activationLine) activeHeading = heading;
      });
      if (scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 4) {
        activeHeading = headings[headings.length - 1];
      }
      setTocActiveId(activeHeading.id);
    };
    const handleScroll = () => {
      if (tocScrollRafRef.current != null) return;
      tocScrollRafRef.current = window.requestAnimationFrame(updateActiveHeading);
    };
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      if (tocScrollRafRef.current != null) window.cancelAnimationFrame(tocScrollRafRef.current);
      tocScrollRafRef.current = null;
    };
  }, [editor, nodeId, tocHeadings]);

  useEffect(() => {
    if (!tocActiveId) return;
    const list = tocListRef.current;
    const button = tocButtonRefs.current.get(tocActiveId);
    if (!list || !button) return;
    const listRect = list.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.top < listRect.top) list.scrollTop -= listRect.top - buttonRect.top + 4;
    else if (buttonRect.bottom > listRect.bottom) list.scrollTop += buttonRect.bottom - listRect.bottom + 4;
  }, [tocActiveId]);

  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        if (editor.isActive("listItem") || editor.isActive("taskItem")) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const itemName = editor.isActive("taskItem") ? "taskItem" : "listItem";
          if (event.shiftKey) editor.chain().focus().liftListItem(itemName).run();
          else editor.chain().focus().sinkListItem(itemName).run();
        }
        return;
      }
      if ((event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) && editor.isActive("codeBlock")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        editor.chain().focus().exitCode().run();
        return;
      }
      if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (editor.isActive("codeBlock") && isCurrentCodeLineEmpty(editor)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        editor.chain().focus().exitCode().run();
        return;
      }
      if (editor.isActive("blockquote") && isTiptapBlockEmpty(editor)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        insertParagraphAfterAncestor(editor, "blockquote");
        return;
      }
      if ((editor.isActive("listItem") || editor.isActive("taskItem")) && isTiptapBlockEmpty(editor)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const itemName = editor.isActive("taskItem") ? "taskItem" : "listItem";
        editor.chain().focus().liftListItem(itemName).setParagraph().run();
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener("keydown", handler, true);
    return () => dom.removeEventListener("keydown", handler, true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    let viewportRaf: number | null = null;
    const handler = () => {
      updateTableToolbar(editor);
      updateImageToolbar(editor);
    };
    const clearFloatingUi = () => {
      setToolbarPanel(null);
      setSlashMenu(null);
      setShowTableToolbar(false);
      setTableRowHandles([]);
      clearImageToolbar();
    };
    const onViewportChange = () => {
      // 全屏/最大化时先卸掉浮动层，再在下一帧按新视口重算，避免 Mac 上遮挡工具栏
      clearFloatingUi();
      if (viewportRaf != null) window.cancelAnimationFrame(viewportRaf);
      viewportRaf = window.requestAnimationFrame(() => {
        viewportRaf = window.requestAnimationFrame(handler);
      });
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", handler, true);
    document.addEventListener("mouseup", handler);
    document.addEventListener("fullscreenchange", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    const electronApi = (window as any).electronAPI;
    const offViewport = typeof electronApi?.onViewportChange === "function"
      ? electronApi.onViewportChange(onViewportChange)
      : undefined;
    return () => {
      if (viewportRaf != null) window.cancelAnimationFrame(viewportRaf);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", handler, true);
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("fullscreenchange", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      if (typeof offViewport === "function") offViewport();
    };
  }, [editor, updateTableToolbar, updateImageToolbar, clearImageToolbar]);

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimeout(saveTimer.current);
    if (tocScrollRafRef.current != null) window.cancelAnimationFrame(tocScrollRafRef.current);
  }, []);

  const runEditorCommand = useCallback((command: (activeEditor: any) => boolean | void) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor || activeEditor.isDestroyed) {
      setToast({ message: "编辑器正在初始化，请稍后重试", type: "info" });
      return false;
    }
    try {
      const selection = savedSelectionRef.current;
      if (selection) {
        const maxPos = activeEditor.state.doc.content.size;
        const from = Math.max(0, Math.min(selection.from, maxPos));
        const to = Math.max(0, Math.min(selection.to, maxPos));
        activeEditor.chain().focus().setTextSelection({ from, to }).run();
      } else if (!activeEditor.isFocused) {
        activeEditor.chain().focus().run();
      }
      return command(activeEditor) !== false;
    } catch (error) {
      console.error("Editor command failed:", error);
      setToast({ message: "编辑命令执行失败，请重新选择内容后重试", type: "error" });
      return false;
    }
  }, []);

  const getCurrentHeading = () => {
    if (!editor) return "正文";
    for (let level = 1; level <= 5; level += 1) {
      if (editor.isActive("heading", { level })) return HEADING_OPTIONS[level];
    }
    return "正文";
  };
  const getCurrentFont = () => editor?.getAttributes("textStyle").fontFamily || "系统默认";
  const getCurrentSize = () => editor?.getAttributes("textStyle").fontSize || propFontSize || "15px";
  const activeFormats = new Set<string>();
  if (editor?.isActive("bold")) activeFormats.add("bold");
  if (editor?.isActive("italic")) activeFormats.add("italic");
  if (editor?.isActive("strike")) activeFormats.add("strikeThrough");
  if (editor?.isActive("underline")) activeFormats.add("underline");
  if (editor?.isActive("blockquote")) activeFormats.add("blockquote");
  if (editor?.isActive("link")) activeFormats.add("link");
  void toolbarTick;
  void propTheme;

  const Btn = ({ label, cmd, action, children, getBtnRef }: { label: string; cmd?: string; action?: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; getBtnRef?: (el: HTMLButtonElement | null) => void }) => (
    <EditorToolBtn
      label={label}
      cmd={cmd}
      activeFormats={activeFormats}
      action={(e) => {
        saveEditorSelection();
        action?.(e);
      }}
      getBtnRef={getBtnRef}
    >{children}</EditorToolBtn>
  );

  const closeAllToolbarPanels = () => setToolbarPanel(null);

  const toggleToolbarPanel = (panel: Exclude<ToolbarPanel, null>, pos?: { x: number; y: number }) => {
    if (pos) {
      if (panel === "heading") setHeadingDropPos(pos);
      else if (panel === "font") setFontDropPos(pos);
      else if (panel === "size") setSizeDropPos(pos);
      else if (panel === "align") setAlignDropPos(pos);
      else if (panel === "fore" || panel === "back") setColorPickerPos(pos);
    }
    setToolbarPanel((cur) => (cur === panel ? null : panel));
  };

  const applyTextAlign = (align: "left" | "center" | "right" | "justify") => runEditorCommand((activeEditor) => {
    if (activeEditor.chain().focus().setTextAlign(align).run()) return true;
    const { state, view } = activeEditor;
    const { $from, from, to } = state.selection;
    const types = new Set(["paragraph", "heading"]);
    const tr = state.tr;
    let changed = false;
    const applyAt = (pos: number, node: any) => {
      if (!types.has(node.type.name)) return;
      if (node.attrs?.textAlign === align) return;
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: align });
      changed = true;
    };
    if (from === to) {
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth);
        if (types.has(node.type.name)) {
          applyAt($from.before(depth), node);
          break;
        }
      }
    } else {
      state.doc.nodesBetween(from, to, (node: any, pos: number) => {
        applyAt(pos, node);
      });
    }
    if (!changed) {
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth);
        if (types.has(node.type.name)) {
          applyAt($from.before(depth), node);
          break;
        }
      }
    }
    if (changed) {
      view.dispatch(tr);
      activeEditor.commands.focus();
      return true;
    }
    return false;
  });

  const applyIndent = (dir: 1 | -1) => runEditorCommand((activeEditor) => {
    if (activeEditor.isActive("taskItem")) {
      return dir > 0
        ? activeEditor.chain().focus().sinkListItem("taskItem").run()
        : activeEditor.chain().focus().liftListItem("taskItem").run();
    }
    if (activeEditor.isActive("listItem")) {
      return dir > 0
        ? activeEditor.chain().focus().sinkListItem("listItem").run()
        : activeEditor.chain().focus().liftListItem("listItem").run();
    }
    return dir > 0
      ? activeEditor.chain().focus().indent().run()
      : activeEditor.chain().focus().outdent().run();
  });

  const openLinkDialog = (anchorRect?: DOMRect) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    restoreEditorSelection(activeEditor);
    const attrs = activeEditor.getAttributes("link");
    const selectedText = activeEditor.state.doc.textBetween(activeEditor.state.selection.from, activeEditor.state.selection.to, " ");
    setLinkModalMode(attrs.href ? "edit" : "insert");
    setLinkModalText(selectedText || "");
    setLinkModalUrl(attrs.href || "");
    const caretPos = getCaretMenuPosition();
    setLinkModalPos(anchorRect ? { x: anchorRect.left - 150, y: anchorRect.bottom + 8 } : { x: caretPos.left - 150, y: caretPos.top + 8 });
    setToolbarPanel("link");
  };

  const restoreEditorSelection = (activeEditor = editorInstanceRef.current) => {
    if (!activeEditor) return false;
    const selection = savedSelectionRef.current;
    if (!selection) {
      activeEditor.chain().focus().run();
      return true;
    }
    const maxPos = activeEditor.state.doc.content.size;
    const from = Math.max(0, Math.min(selection.from, maxPos));
    const to = Math.max(0, Math.min(selection.to, maxPos));
    activeEditor.chain().focus().setTextSelection({ from, to }).run();
    return true;
  };

  const markSlashCleanup = () => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return null;
    const { from } = activeEditor.state.selection;
    const textBefore = activeEditor.state.doc.textBetween(Math.max(0, from - 1), from);
    const cleanup = textBefore === "/" ? { from: from - 1, to: from } : null;
    pendingSlashCleanupRef.current = cleanup;
    return cleanup;
  };

  const cleanupPendingSlash = () => {
    const activeEditor = editorInstanceRef.current;
    const cleanup = pendingSlashCleanupRef.current;
    pendingSlashCleanupRef.current = null;
    if (!activeEditor || !cleanup) return false;
    activeEditor.chain().focus().deleteRange(cleanup).run();
    savedSelectionRef.current = { from: cleanup.from, to: cleanup.from };
    return true;
  };

  const openLinkModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    saveEditorSelection();
    openLinkDialog(e.currentTarget.getBoundingClientRect());
  };

  const applyLink = ({ text, url }: { text: string; url: string }) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    if (text.trim() && activeEditor.state.selection.empty) {
      activeEditor.chain().focus().insertContent(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(text.trim())}</a>`).run();
      return;
    }
    activeEditor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank", rel: "noreferrer" }).run();
  };

  const insertImageFromFile = async (file?: File | null) => {
    const activeEditor = editorInstanceRef.current;
    if (!file || !activeEditor) return;
    try {
      const src = await compressImageForEmbed(file);
      if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
      cleanupPendingSlash();
      restoreEditorSelection(activeEditor);
      if (!activeEditor.chain().focus().setImage({ src, alt: file.name }).run()) throw new Error("图片插入失败");
      setToast({ message: "图片已插入", type: "success" });
    } catch (error) {
      console.error("Failed to insert image:", error);
      if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "图片插入失败", type: "error" });
    }
  };

  const insertVideoFromFile = async (file?: File | null) => {
    const activeEditor = editorInstanceRef.current;
    if (!file || !activeEditor) return;
    try {
      if (!file.type.startsWith("video/")) throw new Error("请选择视频文件");
      if (file.size > MAX_VIDEO_BYTES) throw new Error("视频不能超过 20MB");
      const src = await fileToDataUrl(file);
      if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
      cleanupPendingSlash();
      restoreEditorSelection(activeEditor);
      if (!activeEditor.chain().focus().insertContent({ type: "video", attrs: { src, controls: true } }).run()) throw new Error("视频插入失败");
      setToast({ message: "视频已插入", type: "success" });
    } catch (error) {
      console.error("Failed to insert video:", error);
      if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "视频插入失败", type: "error" });
    }
  };

  const insertAttachmentFromFile = async (file?: File | null) => {
    const activeEditor = editorInstanceRef.current;
    if (!file || !activeEditor) return;
    try {
      if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("附件不能超过 10MB");
      const src = await fileToDataUrl(file);
      if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
      cleanupPendingSlash();
      restoreEditorSelection(activeEditor);
      if (!activeEditor.chain().focus().insertContent({
        type: "attachment",
        attrs: { src, fileName: file.name, fileSize: file.size, fileType: file.type || "application/octet-stream" },
      }).run()) throw new Error("附件插入失败");
      setToast({ message: "附件已插入", type: "success" });
    } catch (error) {
      console.error("Failed to insert attachment:", error);
      if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "附件插入失败", type: "error" });
    }
  };

  const openImagePicker = () => {
    saveEditorSelection();
    imgInputRef.current?.click();
  };

  const openVideoPicker = () => {
    saveEditorSelection();
    videoInputRef.current?.click();
  };

  const openAttachmentPicker = () => {
    saveEditorSelection();
    attachInputRef.current?.click();
  };

  const openTableDialog = () => {
    saveEditorSelection();
    setTableRows("3");
    setTableCols("3");
    setToolbarPanel("table");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    void insertImageFromFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    void insertVideoFromFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const startTableRowResize = (
    event: React.PointerEvent<HTMLDivElement>,
    handle: { index: number; row: HTMLTableRowElement },
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

  const runTableCommand = (command: "addRowBefore" | "addRowAfter" | "deleteRow" | "addColumnBefore" | "addColumnAfter" | "deleteColumn" | "deleteTable") => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    restoreEditorSelection(activeEditor);
    activeEditor.chain().focus()[command]().run();
    if (command === "deleteTable") setShowTableToolbar(false);
    window.setTimeout(() => updateTableToolbar(activeEditor), 0);
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
      setShowTableModal(false);
      setToast({ message: "表格已插入", type: "success" });
      window.setTimeout(() => updateTableToolbar(activeEditor), 0);
    } catch (error) {
      console.error("Failed to insert table:", error);
      setToast({ message: "表格插入失败，请重新选择插入位置", type: "error" });
    }
  };

  const copyAnchorLink = async () => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    restoreEditorSelection(activeEditor);
    const blockType = activeEditor.state.selection.$from.parent.type.name;
    if (!["paragraph", "heading", "blockquote", "codeBlock"].includes(blockType)) {
      setToast({ message: "请将光标放在正文、标题、引用或代码块中", type: "info" });
      return;
    }
    const existingId = activeEditor.getAttributes(blockType).id as string | undefined;
    const anchorId = existingId || `anchor-${nodeId}-${crypto.randomUUID()}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!existingId && !activeEditor.chain().focus().updateAttributes(blockType, { id: anchorId }).run()) {
      setToast({ message: "锚点创建失败", type: "error" });
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("doc", docName);
      url.searchParams.set("node", nodeId);
      url.hash = anchorId;
      await navigator.clipboard.writeText(url.toString());
      setToast({ message: "锚点链接已复制到剪贴板", type: "success" });
    } catch (error) {
      console.error("Failed to copy anchor:", error);
      setToast({ message: "无法访问剪贴板，请检查浏览器权限", type: "error" });
    }
  };

  const getCaretMenuPosition = () => {
    const rect = editor?.view.coordsAtPos(editor.state.selection.from);
    const menuWidth = 190;
    const menuHeight = 320;
    const rawLeft = rect?.left ?? 320;
    const rawTop = (rect?.bottom ?? 140) + 6;
    return {
      left: Math.max(12, Math.min(rawLeft, window.innerWidth - menuWidth - 12)),
      top: Math.max(12, Math.min(rawTop, window.innerHeight - menuHeight - 12)),
    };
  };

  const runSlashAction = (action: () => void) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor) return;
    const { from } = activeEditor.state.selection;
    const textBefore = activeEditor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (textBefore === "/") {
      activeEditor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
      savedSelectionRef.current = { from: from - 1, to: from - 1 };
    } else {
      saveEditorSelection();
    }
    setSlashMenu(null);
    action();
  };

  const runSlashFileAction = (action: () => void) => {
    saveEditorSelection();
    markSlashCleanup();
    setSlashMenu(null);
    action();
    window.setTimeout(() => cleanupPendingSlash(), 0);
  };

  const slashItems = [
    { label: "一级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H1</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 1 }).run()) },
    { label: "二级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H2</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 2 }).run()) },
    { label: "三级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H3</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 3 }).run()) },
    { label: "正文", icon: <span className="text-[11px] font-semibold text-[#131212]">T</span>, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().setParagraph().run()) },
    { label: "有序列表", icon: <InlineIconSvg path={editorSvg.p31fc8400} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleOrderedList().run()) },
    { label: "无序列表", icon: <InlineIconSvg path={editorSvg.p1ddeb0c0} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBulletList().run()) },
    { label: "任务列表", icon: <InlineIconSvg path={editorSvg.p30909380} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleTaskList().run()) },
    { label: "引用块", icon: <InlineIconSvg path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBlockquote().run()) },
    { label: "代码块", icon: <InlineIconSvg path={editorSvg.p36d5aa00} />, action: () => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleCodeBlock().run()) },
    { label: "链接", icon: <InlineIconSvg path={editorSvg.pda5c3c0} />, action: () => openLinkDialog() },
    { label: "图片", icon: <InlineIconSvg path={editorSvg.p2a7b5cf0} isFill fill="#131212" />, action: openImagePicker, kind: "file" as const },
    { label: "视频", icon: <InlineIconSvg path={editorSvg.p1a4aa900} />, action: openVideoPicker, kind: "file" as const },
    { label: "附件", icon: <InlineIconSvg path={editorSvg.p149b2100} />, action: openAttachmentPicker, kind: "file" as const },
    { label: "表格", icon: <InlineIconSvg path={editorSvg.p808b680} />, action: openTableDialog },
  ];
  slashItemsRef.current = slashItems;

  return (
    <div className="absolute left-0 right-0 top-[60px] bottom-0 flex flex-col">
      <style>{`
        .doc-tiptap-content p{margin:0 0 10px}.doc-tiptap-content h1{font-size:28px;line-height:1.45;margin:18px 0 12px;font-weight:700}.doc-tiptap-content h2{font-size:24px;line-height:1.45;margin:16px 0 10px;font-weight:700}.doc-tiptap-content h3{font-size:20px;line-height:1.5;margin:14px 0 8px;font-weight:650}.doc-tiptap-content h4,.doc-tiptap-content h5,.doc-tiptap-content h6{font-size:17px;line-height:1.55;margin:12px 0 8px;font-weight:650}
        .doc-tiptap-content .doc-blockquote{border-left:3px solid #134CFF;background:#f7f8fa;margin:10px 0;padding:8px 14px;color:#606266;border-radius:0 8px 8px 0}.doc-tiptap-content .doc-blockquote p{margin:0 0 4px;line-height:1.65}.doc-tiptap-content .doc-blockquote p:last-child{margin-bottom:0}
        .doc-tiptap-content .doc-list{margin:8px 0 10px;padding-left:28px}.doc-tiptap-content .doc-ordered-list{list-style:decimal}.doc-tiptap-content .doc-ordered-list .doc-ordered-list{list-style:lower-alpha}.doc-tiptap-content .doc-ordered-list .doc-ordered-list .doc-ordered-list{list-style:lower-roman}.doc-tiptap-content .doc-bullet-list{list-style:disc}.doc-tiptap-content .doc-bullet-list .doc-bullet-list{list-style:circle}.doc-tiptap-content .doc-bullet-list .doc-bullet-list .doc-bullet-list{list-style:square}.doc-tiptap-content li{margin:4px 0;padding-left:2px}.doc-tiptap-content li>p{margin:0}.doc-tiptap-content .doc-task-list{list-style:none;margin:8px 0 10px;padding-left:0}.doc-tiptap-content .doc-task-item{display:flex;gap:8px;align-items:flex-start}.doc-tiptap-content .doc-task-item>label{margin-top:2px}.doc-tiptap-content .doc-task-item>div{flex:1}
        .doc-tiptap-content .doc-code-block{background:#f5f6f8;border:1px solid #ebecf0;border-radius:8px;padding:12px 14px;margin:12px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.65;white-space:pre-wrap}
        .doc-tiptap-content .doc-link{color:#134CFF;text-decoration:underline}.doc-tiptap-content .doc-image{display:block;max-width:100%;height:auto;margin:0;border-radius:8px;cursor:pointer}.doc-tiptap-content [data-resize-container][data-node="image"]{display:inline-flex;width:fit-content;margin:12px 0;max-width:100%;outline:none;position:relative}.doc-tiptap-content [data-resize-container][data-node="image"].ProseMirror-selectednode{outline:2px solid #134CFF;outline-offset:2px;border-radius:8px}.doc-tiptap-content [data-resize-wrapper]{display:block;width:fit-content;max-width:100%;height:auto;line-height:0;position:relative}.doc-tiptap-content [data-resize-handle]{background:#fff;border:2px solid #134CFF;border-radius:50%;box-sizing:border-box;height:12px;opacity:0;pointer-events:none;position:absolute;width:12px;z-index:3}.doc-tiptap-content [data-resize-container].ProseMirror-selectednode [data-resize-handle],.doc-tiptap-content [data-resize-container][data-resize-state="true"] [data-resize-handle]{opacity:1;pointer-events:auto}.doc-tiptap-content [data-resize-handle="top-left"]{cursor:nwse-resize;left:0;top:0;transform:translate(-50%,-50%)}.doc-tiptap-content [data-resize-handle="top-right"]{cursor:nesw-resize;right:0;top:0;transform:translate(50%,-50%)}.doc-tiptap-content [data-resize-handle="bottom-left"]{bottom:0;cursor:nesw-resize;left:0;transform:translate(-50%,50%)}.doc-tiptap-content [data-resize-handle="bottom-right"]{bottom:0;cursor:nwse-resize;right:0;transform:translate(50%,50%)}.doc-tiptap-content .doc-video{display:block;max-width:100%;margin:12px 0;border-radius:8px;background:#000}.doc-tiptap-content .doc-attachment{align-items:center;background:#f7f8fa;border:1px solid #ebecf0;border-radius:8px;color:#303133;display:flex;font-size:13px;margin:12px 0;max-width:520px;min-height:42px;padding:10px 12px;text-decoration:none}.doc-tiptap-content .doc-attachment:hover{border-color:#cfd4df;background:#f2f4f7}
        .doc-tiptap-content .tableWrapper{display:block;margin:14px 0;max-width:100%;overflow-x:auto;overflow-y:hidden;padding:2px 0 8px}.doc-tiptap-content .tableWrapper table,.doc-tiptap-content table.doc-table,.doc-tiptap-content table{border:1px solid #EEF0F5;border-collapse:collapse;border-spacing:0;display:table;margin:0;max-width:none;overflow:visible;table-layout:fixed;width:100%}.doc-tiptap-content table td,.doc-tiptap-content table th,.doc-tiptap-content .doc-table td,.doc-tiptap-content .doc-table th{border:1px solid #EEF0F5;box-sizing:border-box;min-width:96px;padding:7px 9px;position:relative;vertical-align:top}.doc-tiptap-content table th,.doc-tiptap-content .doc-table th{background:#f7f8fa;color:#131212;font-weight:600;text-align:left}.doc-tiptap-content table tr:nth-child(odd) td,.doc-tiptap-content .doc-table tr:nth-child(odd) td{background:rgba(238,240,245,0.502)}.doc-tiptap-content table td>*,.doc-tiptap-content table th>*,.doc-tiptap-content .doc-table td>*,.doc-tiptap-content .doc-table th>*{margin-bottom:0!important}.doc-tiptap-content table td p,.doc-tiptap-content table th p{line-height:1.6;margin:0;min-height:20px}.doc-tiptap-content table td p:empty::before,.doc-tiptap-content table th p:empty::before{content:"\\00a0";display:inline-block}.doc-tiptap-content table .selectedCell:after,.doc-tiptap-content .doc-table .selectedCell:after{background:rgba(19,76,255,0.12);content:"";inset:0;pointer-events:none;position:absolute;z-index:2}.doc-tiptap-content table td:focus-within,.doc-tiptap-content table th:focus-within,.doc-tiptap-content .doc-table td:focus-within,.doc-tiptap-content .doc-table th:focus-within{box-shadow:inset 0 0 0 2px rgba(0,94,255,0.18);background:#FAFCFF!important}.doc-tiptap-content .column-resize-handle{background:#134CFF;bottom:-2px;pointer-events:none;position:absolute;right:-3px;top:0;width:3px}.resize-cursor{cursor:col-resize}.table-row-resize-cursor,.table-row-resize-cursor *{cursor:row-resize!important}.doc-table-row-resize-handle{background:transparent;border-radius:0;cursor:row-resize;height:12px;position:fixed;touch-action:none;z-index:280}.doc-table-row-resize-handle::after{background:transparent;border-radius:999px;content:"";height:2px;left:0;position:absolute;right:0;top:5px;transition:background-color .12s ease}.doc-table-row-resize-handle:hover::after{background:rgba(19,76,255,0.18)}.doc-table-row-resize-handle.is-resizing::after{background:rgba(19,76,255,0.42)}
        .doc-tiptap-content .is-empty::before{color:#b8bbc4;content:attr(data-placeholder);float:left;height:0;pointer-events:none}.doc-tiptap-content:focus{outline:none}
        .doc-tiptap-content p[style*="text-align"],.doc-tiptap-content h1[style*="text-align"],.doc-tiptap-content h2[style*="text-align"],.doc-tiptap-content h3[style*="text-align"],.doc-tiptap-content h4[style*="text-align"],.doc-tiptap-content h5[style*="text-align"],.doc-tiptap-content h6[style*="text-align"]{display:block}
        .doc-editor-toolbar{position:relative;z-index:260;isolation:isolate;pointer-events:auto;scrollbar-gutter:stable both-edges;-webkit-overflow-scrolling:touch}
        .doc-editor-toolbar button,.doc-editor-toolbar [role="button"]{pointer-events:auto;position:relative;z-index:1}
        /* macOS overlay 滚动条会压在内容右缘上抢点击：预留右侧安全区 + 非覆盖式滚动条 */
        .doc-editor-toolbar{padding-right:40px!important}
        .doc-editor-toolbar::-webkit-scrollbar{height:8px}
        .doc-editor-toolbar::-webkit-scrollbar-track{background:transparent}
        .doc-editor-toolbar::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:4px}
        .doc-editor-toolbar::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.32)}
      `}</style>
      <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input ref={attachInputRef} type="file" className="hidden" onChange={(e) => {
        void insertAttachmentFromFile(e.target.files?.[0]);
        e.target.value = "";
      }} />
      <div ref={toolbarRef} className="doc-editor-toolbar relative z-[260] isolate flex items-center gap-[24px] pl-[24px] pr-[40px] py-[6px] border-b border-[#EBECF0] bg-white flex-shrink-0 overflow-x-auto overscroll-x-contain">
        <button type="button" className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("heading", { x: r.left, y: r.bottom + 4 });
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[56px] truncate">{getCurrentHeading()}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
        </button>
        <button type="button" className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("font", { x: r.left, y: r.bottom + 4 });
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[56px] truncate">{getCurrentFont()}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
        </button>
        <button type="button" className="relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("size", { x: r.left, y: r.bottom + 4 });
          }}>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] w-[46px] truncate">{getCurrentSize()}</p>
          <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
        </button>
        <Btn label="加粗" cmd="bold" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBold().run())}><IconSvg path={editorSvg.p3290fd80} /></Btn>
        <Btn label="斜体" cmd="italic" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleItalic().run())}><IconSvg path={editorSvg.p3837edc0} /></Btn>
        <Btn label="删除线" cmd="strikeThrough" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleStrike().run())}><IconSvg path={editorSvg.p2ae8080} /></Btn>
        <Btn label="下划线" cmd="underline" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleUnderline().run())}><IconSvg path={editorSvg.pc604cd0} /></Btn>
        <Btn label="字体颜色" action={(e) => {
          saveEditorSelection();
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("fore", { x: r.left, y: r.bottom + 4 });
        }}><IconSvg path={[editorSvg.peaacc00, "M4 17H16"]} stroke="#131212" /></Btn>
        <Btn label="背景颜色" action={(e) => {
          saveEditorSelection();
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("back", { x: r.left, y: r.bottom + 4 });
        }}>
          <div className="absolute left-[4px] size-[20px] top-[4px]"><svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 20 20"><rect fill="#FEF0F0" height="20" rx="4" width="20"/><path d={editorSvg.p16c26880} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" /></svg></div>
        </Btn>
        <Btn label="任务列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleTaskList().run())}><IconSvg path={editorSvg.p30909380} /></Btn>
        <Btn label="有序列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleOrderedList().run())}><IconSvg path={editorSvg.p31fc8400} /></Btn>
        <Btn label="无序列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBulletList().run())}><IconSvg path={editorSvg.p1ddeb0c0} /></Btn>
        <Btn label="减少缩进" action={() => applyIndent(-1)}><IconSvg path={editorSvg.p3244ee00} /></Btn>
        <Btn label="增加缩进" action={() => applyIndent(1)}><IconSvg path={editorSvg.p25bdc300} /></Btn>
        <button type="button" className={`relative flex items-center gap-[8px] py-[2px] shrink-0 cursor-pointer select-none bg-transparent border-0 ${showAlignDropdown || editor?.isActive({ textAlign: "center" }) || editor?.isActive({ textAlign: "right" }) || editor?.isActive({ textAlign: "justify" }) ? "opacity-100" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            saveEditorSelection();
            const r = e.currentTarget.getBoundingClientRect();
            toggleToolbarPanel("align", { x: r.left, y: r.bottom + 4 });
          }}>
          <div className={`size-[28px] rounded-[6px] flex items-center justify-center hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors ${showAlignDropdown || editor?.isActive({ textAlign: "center" }) || editor?.isActive({ textAlign: "right" }) || editor?.isActive({ textAlign: "justify" }) ? "bg-[#f5f6f8]" : ""}`}><IconSvg path={editorSvg.p2c9c5c80} /></div>
        </button>
        <Btn label="引用块" cmd="blockquote" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBlockquote().run())}><IconSvg path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill /></Btn>
        <Btn label="代码块" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleCodeBlock().run())}><IconSvg path={editorSvg.p36d5aa00} /></Btn>
        <div className={`rounded-[6px] transition-colors ${showLinkModal || activeFormats.has("link") ? "bg-[#fff5f5] ring-1 ring-[#ff4d4f]" : ""}`}>
          <Btn label="插入链接" action={openLinkModal} getBtnRef={(el) => { linkBtnRef.current = el; }}><IconSvg path={editorSvg.pda5c3c0} stroke={showLinkModal || activeFormats.has("link") ? "#ff4d4f" : "#131212"} /></Btn>
        </div>
        <Btn label="清除链接" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().unsetLink().run())}><IconSvg path={editorSvg.p3418c200} /></Btn>
        <Btn label="插入图片" action={openImagePicker}><IconSvg path={editorSvg.p2a7b5cf0} isFill fill="#131212" /></Btn>
        <Btn label="插入视频" action={openVideoPicker}><IconSvg path={editorSvg.p1a4aa900} /></Btn>
        <Btn label="清除格式" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().unsetAllMarks().clearNodes().run())}><IconSvg path={editorSvg.p3e282b00} stroke="#131212" /></Btn>
        <Btn label="附件" action={openAttachmentPicker}><IconSvg path={editorSvg.p149b2100} /></Btn>
        <Btn label="表格" action={openTableDialog}><IconSvg path={editorSvg.p808b680} /></Btn>
        <Btn label="复制锚点链接" action={() => { void copyAnchorLink(); }}><IconSvg path={editorSvg.pda5c3c0} /></Btn>
      </div>
      {showColorPicker && (
        <ColorPicker
          mode={showColorPicker}
          currentColor={
            showColorPicker === "fore"
              ? normalizeHexColor(editor?.getAttributes("textStyle")?.color, "#000000")
              : normalizeHexColor(editor?.getAttributes("textStyle")?.backgroundColor, "#fef0f0")
          }
          onSelect={(color) => {
            runEditorCommand((activeEditor) => (
              showColorPicker === "fore"
                ? activeEditor.chain().focus().setColor(color).run()
                : activeEditor.chain().focus().setBackgroundColor(color).run()
            ));
          }}
          onClose={() => setShowColorPicker(null)}
          position={colorPickerPos}
        />
      )}
      {showHeadingDropdown && (
        <Dropdown items={HEADING_OPTIONS} position={headingDropPos} onSelect={(v) => {
          const idx = HEADING_OPTIONS.indexOf(v);
          runEditorCommand((activeEditor) => idx === 0
            ? activeEditor.chain().focus().setParagraph().run()
            : activeEditor.chain().focus().toggleHeading({ level: idx as 1 | 2 | 3 | 4 | 5 }).run());
        }} onClose={() => setShowHeadingDropdown(false)} />
      )}
      {showFontDropdown && (
        <Dropdown items={FONT_FAMILIES} position={fontDropPos} onSelect={(v) => runEditorCommand((activeEditor) => v === "系统默认" ? activeEditor.chain().focus().unsetFontFamily().run() : activeEditor.chain().focus().setFontFamily(v).run())} onClose={() => setShowFontDropdown(false)} />
      )}
      {showSizeDropdown && (
        <Dropdown items={FONT_SIZES} position={sizeDropPos} onSelect={(v) => runEditorCommand((activeEditor) => activeEditor.chain().focus().setFontSize(v).run())} onClose={() => setShowSizeDropdown(false)} />
      )}
      {showAlignDropdown && (
        <Dropdown
          items={["左对齐", "居中对齐", "右对齐", "两端对齐"]}
          position={alignDropPos}
          onSelect={(v) => applyTextAlign(v === "左对齐" ? "left" : v === "居中对齐" ? "center" : v === "右对齐" ? "right" : "justify")}
          onClose={() => setShowAlignDropdown(false)}
        />
      )}
      {showLinkModal && <LinkModal position={linkModalPos} initialText={linkModalText} initialUrl={linkModalUrl} mode={linkModalMode} triggerRef={linkBtnRef} onClose={() => setShowLinkModal(false)} onConfirm={applyLink} />}
      {showTableModal && createPortal(
        <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={() => setShowTableModal(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white rounded-[16px] w-[360px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] p-[24px] flex flex-col gap-[20px]" onClick={(e) => e.stopPropagation()}>
            <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px]">插入表格</p>
            <div className="flex gap-[16px]">
              <label className="flex-1 flex flex-col gap-[6px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">行数<input type="number" min="1" max="20" value={tableRows} onChange={(e) => setTableRows(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") insertTable(); if (e.key === "Escape") setShowTableModal(false); }} className="h-[36px] rounded-[8px] border border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF]" /></label>
              <label className="flex-1 flex flex-col gap-[6px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px]">列数<input type="number" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") insertTable(); if (e.key === "Escape") setShowTableModal(false); }} className="h-[36px] rounded-[8px] border border-[#e5e7eb] px-[12px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF]" /></label>
            </div>
            <div className="flex justify-end gap-[12px]"><button className="h-[36px] px-[20px] rounded-[8px] border border-[#e5e7eb] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0]" onClick={() => setShowTableModal(false)}>取消</button><button className="h-[36px] px-[20px] rounded-[8px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80" onClick={insertTable}>插入表格</button></div>
          </div>
        </div>,
        document.body,
      )}
      {showTableToolbar && createPortal(
        <div className="fixed z-[280] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] p-[4px] flex items-center gap-[4px]"
          style={{ left: tableToolbarPos.left, top: tableToolbarPos.top }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="flex items-center gap-[4px] px-[8px] py-[4px] text-[12px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]">表格</div>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addRowBefore"); }}>上方行</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addRowAfter"); }}>下方行</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteRow"); }}>删行</button>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addColumnBefore"); }}>左列</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("addColumnAfter"); }}>右列</button>
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteColumn"); }}>删列</button>
          <div className="w-[1px] h-[16px] bg-[#ebecf0] mx-[4px]" />
          <button type="button" className="h-[28px] px-[8px] rounded-[4px] text-[12px] text-[#ff4d4f] cursor-pointer hover:bg-[#fff5f5] transition-colors" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); runTableCommand("deleteTable"); }}>删表格</button>
        </div>,
        document.body,
      )}
      {showTableToolbar && createPortal(
        <>
          {tableRowHandles.map((handle) => (
            <div
              key={handle.index}
              className={`doc-table-row-resize-handle ${activeRowResizeIndex === handle.index ? "is-resizing" : ""}`}
              style={{ left: handle.left, top: handle.top, width: handle.width }}
              onPointerDown={(event) => startTableRowResize(event, handle)}
              title="拖拽调整行高"
              aria-label="拖拽调整行高"
            />
          ))}
        </>,
        document.body,
      )}
      {selectedImgRect && editorVisibleRect && (() => {
        const r = selectedImgRect;
        const editorR = editorVisibleRect;
        const barLeft = r.left + r.width / 2;
        const barTop = r.bottom + 8;
        if (barTop < editorR.top || barTop + 48 > editorR.bottom) return null;
        if (r.bottom < editorR.top || r.top > editorR.bottom) return null;
        const pctBtns = ["25", "50", "70", "100"] as const;
        const applyCustomPct = () => {
          const v = parseInt(imageCustomPct, 10);
          if (v && v >= 5 && v <= 100) applySelectedImageWidth(v);
          setImageCustomPct("");
        };
        return createPortal(
          <div
            className="img-resize-bar fixed z-[280] bg-white border border-[#ebecf0] rounded-[12px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] px-[10px] py-[6px] flex items-center gap-[6px]"
            style={{ left: barLeft, top: Math.max(barTop, (toolbarRef.current?.getBoundingClientRect().bottom ?? 0) + 8), transform: "translateX(-50%)" }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <span className="px-[4px] text-[13px] text-[#8d8e99] whitespace-nowrap select-none" style={{ fontFamily: "PingFang SC, sans-serif" }}>宽度</span>
            {pctBtns.map((pct) => (
              <button
                key={pct}
                type="button"
                className="h-[32px] min-w-[40px] px-[8px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap bg-white"
                style={{ fontFamily: "PingFang SC, sans-serif" }}
                onClick={(e) => { e.stopPropagation(); applySelectedImageWidth(Number(pct)); }}
              >{pct}%</button>
            ))}
            <button
              type="button"
              className="h-[32px] min-w-[32px] px-[8px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] whitespace-nowrap bg-white"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              title="恢复原图大小"
              onClick={(e) => { e.stopPropagation(); applySelectedImageWidth("auto"); }}
            >原</button>
            <button
              type="button"
              className={`size-[32px] rounded-[6px] border border-[#ebecf0] flex items-center justify-center cursor-pointer transition-colors bg-white ${imageRatioLocked ? "bg-[#f0f3ff] border-[#c9d5ff]" : "hover:bg-[#f5f6f8]"}`}
              title={imageRatioLocked ? "锁定缩放比例（已开）" : "锁定缩放比例（已关）"}
              onClick={(e) => { e.stopPropagation(); setImageRatioLocked((v) => !v); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3334 6.52874V2.66667H9.47109M13.3334 2.66667L8.82737 7.17242M2.66675 9.47127V13.3333H6.52907M2.66675 13.3333L7.17279 8.82759" stroke={imageRatioLocked ? "#134CFF" : "#131212"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="w-[1px] h-[20px] bg-[#ebecf0] mx-[2px]" />
            <div className="flex items-center gap-[4px]">
              <input
                className="w-[40px] h-[32px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] text-center outline-none focus:border-[#134CFF] bg-white"
                style={{ fontFamily: "PingFang SC, sans-serif" }}
                placeholder="%"
                value={imageCustomPct}
                onChange={(e) => setImageCustomPct(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCustomPct();
                  }
                }}
                onBlur={() => { if (imageCustomPct) applyCustomPct(); }}
                onMouseDown={(e) => e.stopPropagation()}
                title="自定义缩放比例"
              />
              <span className="text-[13px] text-[#8d8e99] select-none" style={{ fontFamily: "PingFang SC, sans-serif" }}>%</span>
            </div>
            <div className="w-[1px] h-[20px] bg-[#ebecf0] mx-[2px]" />
            <div
              className={`size-[32px] rounded-[6px] border border-[#ebecf0] flex items-center justify-center cursor-ew-resize bg-white hover:bg-[#f5f6f8] ${imgBarSlider ? "bg-[#f5f6f8]" : ""}`}
              title="等比缩放（拖拽调整宽度）"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const activeEditor = editorInstanceRef.current;
                const pos = selectedImagePosRef.current;
                if (!activeEditor || pos == null) return;
                const node = activeEditor.state.doc.nodeAt(pos);
                if (!node || node.type.name !== "image") return;
                const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
                const img = (dom?.tagName === "IMG" ? dom : dom?.querySelector("img")) as HTMLImageElement | null;
                if (!img) return;
                setImgBarSlider(true);
                const startX = e.clientX;
                const startW = img.offsetWidth || Number(node.attrs.width) || 100;
                const parentW = activeEditor.view.dom.clientWidth || 1;
                const naturalW = img.naturalWidth || startW;
                const naturalH = img.naturalHeight || startW;
                const onMove = (ev: MouseEvent) => {
                  const dx = ev.clientX - startX;
                  const nextW = Math.max(48, Math.min(parentW, Math.round(startW + dx)));
                  const locked = imageRatioLockedRef.current;
                  const sized = fitImageSize(nextW, nextW * (naturalH / Math.max(1, naturalW)), naturalW, naturalH, locked);
                  img.style.width = `${sized.width}px`;
                  img.style.height = locked ? "auto" : `${sized.height}px`;
                  img.style.maxWidth = "none";
                  syncContainerToImage(dom);
                  setSelectedImgRect(img.getBoundingClientRect());
                };
                const onUp = () => {
                  setImgBarSlider(false);
                  document.removeEventListener("mousemove", onMove);
                  document.removeEventListener("mouseup", onUp);
                  const finalW = Math.max(48, Math.round(img.offsetWidth));
                  const locked = imageRatioLockedRef.current;
                  const sized = fitImageSize(finalW, img.offsetHeight, naturalW, naturalH, locked);
                  syncContainerToImage(dom);
                  activeEditor.chain().setNodeSelection(pos).updateAttributes("image", {
                    width: sized.width,
                    height: locked ? null : sized.height,
                  }).run();
                  window.requestAnimationFrame(() => {
                    syncContainerToImage(activeEditor.view.nodeDOM(pos) as HTMLElement | null);
                    updateImageToolbar(activeEditor);
                  });
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.57541 1.60001C2.48447 1.60001 1.6001 2.48438 1.6001 3.57531M9.42232 1.60001H6.57787M14.4001 3.57532C14.4001 2.48438 13.5157 1.60001 12.4248 1.60001M1.6001 6.57778V9.42223M14.4001 9.42223V6.57778M1.6001 12.4247C1.6001 13.5156 2.48447 14.4 3.57541 14.4M12.4248 14.4C13.5157 14.4 14.4001 13.5156 14.4001 12.4247M6.57787 14.4H9.42232M1.6001 8.00001H6.57787C7.36335 8.00001 8.0001 8.63676 8.0001 9.42223V14.4H3.73343C2.55522 14.4 1.6001 13.4449 1.6001 12.2667V8.00001Z" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>,
          document.body,
        );
      })()}
      {slashMenu && createPortal(
        <div ref={slashMenuElRef} role="menu" className="fixed z-[280] bg-white rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] border border-[#ebecf0] py-[4px] min-w-[180px] overflow-y-auto overscroll-contain" style={{ left: slashMenu.left, top: slashMenu.top, maxHeight: slashMenu.maxHeight ?? "min(70vh, 480px)" }} onMouseDown={(e) => e.stopPropagation()}>
          {slashItems.map((item, idx) => <button key={item.label} type="button" role="menuitem" data-slash-idx={idx} aria-selected={idx === slashActive} className={`w-full flex items-center gap-[8px] px-[12px] py-[7px] cursor-pointer transition-colors text-left ${idx === slashActive ? "bg-[#f5f6f8]" : "hover:bg-[#f5f6f8]"}`} onMouseEnter={() => setSlashActive(idx)} onMouseDown={(e) => { e.stopPropagation(); if (item.kind !== "file") e.preventDefault(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (item.kind === "file") runSlashFileAction(item.action); else runSlashAction(item.action); }}><div className="size-[20px] flex items-center justify-center rounded-[4px] bg-[#ebecf0] text-[11px] font-bold text-[#131212]">{item.icon}</div><span className="text-[14px] text-[#131212] font-['PingFang_SC:Regular',sans-serif]">{item.label}</span></button>)}
        </div>,
        document.body,
      )}
      <div className="flex-1 min-h-0 bg-white flex justify-center overflow-hidden" onKeyDown={(e) => {
        if (!editor) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); setSavedAt(formatSavedAt()); setSaveStatus("saved"); setToast({ message: "已保存", type: "success" }); }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); const pos = getCaretMenuPosition(); setLinkModalPos({ x: pos.left - 150, y: pos.top + 8 }); setLinkModalMode("insert"); setLinkModalText(""); setLinkModalUrl(""); setShowLinkModal(true); }
        if (slashMenu && e.key === "Escape") { e.preventDefault(); setSlashMenu(null); }
        if (slashMenu && e.key === "ArrowDown") {
          e.preventDefault();
          setSlashActive((idx) => {
            const next = (idx + 1 + slashItems.length) % slashItems.length;
            requestAnimationFrame(() => {
              const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${next}"]`);
              el?.scrollIntoView({ block: "nearest" });
            });
            return next;
          });
        }
        if (slashMenu && e.key === "ArrowUp") {
          e.preventDefault();
          setSlashActive((idx) => {
            const next = (idx - 1 + slashItems.length) % slashItems.length;
            requestAnimationFrame(() => {
              const el = slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${next}"]`);
              el?.scrollIntoView({ block: "nearest" });
            });
            return next;
          });
        }
        if (slashMenu && e.key === "Enter") {
          e.preventDefault();
          const item = slashItems[slashActive] ?? slashItems[0];
          if (item.kind === "file") runSlashFileAction(item.action);
          else runSlashAction(item.action);
        }
      }}>
        <div className="flex h-full min-h-0 w-full max-w-[1248px] px-[24px] gap-[60px] overflow-hidden">
          <div className="min-w-0 min-h-0 flex-1 h-full overflow-hidden"><EditorContent editor={editor} className="h-full min-h-0" /></div>
          <div className="w-[180px] shrink-0 min-h-0 py-[24px] overflow-hidden hidden xl:flex xl:flex-col">
            <p className="font-['PingFang_SC:Medium',sans-serif] text-[#8d8e99] text-[13px] mb-[10px]">大纲</p>
            <div ref={tocListRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-[4px]">
              {tocHeadings.length === 0 ? <p className="text-[#b8bbc4] text-[13px]">暂无标题</p> : tocHeadings.map((h) => <button key={`${h.id}-${h.text}`} ref={(element) => {
                if (element) tocButtonRefs.current.set(h.id, element);
                else tocButtonRefs.current.delete(h.id);
              }} type="button" className={`block w-full text-left text-[13px] rounded-[4px] px-[8px] py-[4px] truncate ${tocActiveId === h.id ? "text-[#134CFF] bg-[#f5f8ff]" : "text-[#8d8e99] hover:bg-[#f5f6f8]"}`} style={{ paddingLeft: `${(Number(h.tag.slice(1)) - 1) * 10 + 8}px` }} onClick={() => { scrollToHeading(h.id); }}>{h.text}</button>)}
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between px-[24px] py-[10px] border-t border-[#EBECF0] bg-white flex-shrink-0">
        <div className="flex items-center gap-[8px]"><div className="relative shrink-0 size-[8px]"><svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 8 8"><circle cx="4" cy="4" fill={saveStatus === "saving" ? "#F59E0B" : saveStatus === "saved" ? "#15803D" : "#8D8E99"} r="4" /></svg></div><p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px] whitespace-nowrap">{saveStatus === "saving" ? "自动保存中..." : savedAt ? `已自动保存，更新于${savedAt}` : "等待自动保存"}</p></div>
        <div className="flex items-center gap-[25px]"><div className="flex items-center gap-[8px]"><div className="relative shrink-0 size-[14px]"><svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 14 14"><path d={editorSvg.p2ce2bc00} stroke="#8D8E99" strokeLinecap="round" strokeWidth="1.2" /></svg></div><p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">大纲</p></div><p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">{charCount}字符 {wordCount}字</p></div>
      </div>
    </div>
  );
}
