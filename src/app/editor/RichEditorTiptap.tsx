// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import React, { useState, useEffect, useRef, useCallback } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { EDITOR_CONTENT_CSS } from "./editorContentCss";
import { createEditorContentAttributes, createEditorExtensions } from "./rich-editor/extensions";
import { applyIndentCommand, applyTableAlignCommand, applyTextAlignCommand } from "./rich-editor/commands";
import {
  applyMarkdownSpaceShortcut,
  handleCodeBlockCommitKeys,
  handleEditorDomKeydown,
  handleEmptyBlockEnter,
  handleListTab,
  handleSlashMenuKeys,
  tryOpenSlashMenu,
} from "./rich-editor/editorKeymap";
import { EditorToolbar } from "./rich-editor/EditorToolbar";
import { InsertTableModal, TableFloatBar, TableRowResizeHandles } from "./rich-editor/EditorTableOverlays";
import { EditorImageToolbar } from "./rich-editor/EditorImageToolbar";
import { EditorSlashMenu } from "./rich-editor/EditorSlashMenu";
import { EditorToc } from "./rich-editor/EditorToc";
import { EditorStatusBar } from "./rich-editor/EditorStatusBar";
import { buildSlashItems } from "./rich-editor/slashItems";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  getEditorTextCount,
  HEADING_OPTIONS,
  normalizeHexColor,
} from "./constants";
import {
  compressImageForEmbed,
  escapeHtml,
  fileToDataUrl,
  MAX_ATTACHMENT_BYTES,
  MAX_VIDEO_BYTES,
  normalizeEditorHtml,
} from "./utils/html";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "./utils/image";
import { ColorPicker } from "./ui/ColorPicker";
import { Dropdown } from "./ui/Dropdown";
import { LinkModal } from "./ui/LinkModal";
import { Toast } from "./ui/Toast";
import { getElectronAPI } from "@/app/shared/electron";
import type { RichEditorTiptapProps, SavedSelection, SlashMenuState, TableRowHandle, ToastState, TocHeading, ToolbarPanel } from "./rich-editor/types";

export function RichEditorTiptap({ docName, nodeId, initialHtml, onContentChange, autoSaveEnabled = false, lastSavedAt = null, onAutoSaveChange, fontSize: propFontSize, lineHeight: propLineHeight, theme: propTheme }: RichEditorTiptapProps) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const lastExternalHtmlRef = useRef("");
  const lastSyncedNodeIdRef = useRef<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [toolbarTick, setToolbarTick] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
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
  const [tableRowHandles, setTableRowHandles] = useState<TableRowHandle[]>([]);
  const [activeRowResizeIndex, setActiveRowResizeIndex] = useState<number | null>(null);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [selectedImgRect, setSelectedImgRect] = useState<DOMRect | null>(null);
  const [editorVisibleRect, setEditorVisibleRect] = useState<DOMRect | null>(null);
  const [imageRatioLocked, setImageRatioLocked] = useState(true);
  const [imageCustomPct, setImageCustomPct] = useState("");
  const [imgBarSlider, setImgBarSlider] = useState(false);
  const selectedImagePosRef = useRef<number | null>(null);
  const [tocHeadings, setTocHeadings] = useState<TocHeading[]>([]);
  const [tocActiveId, setTocActiveId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const [slashActive, setSlashActive] = useState(-1);
  const [slashPressIdx, setSlashPressIdx] = useState<number | null>(null);
  const slashMenuRef = useRef<typeof slashMenu>(null);
  const slashActiveRef = useRef(-1);
  const slashMenuElRef = useRef<HTMLDivElement | null>(null);
  const slashItemsRef = useRef<ReturnType<typeof buildSlashItems>>([]);
  const editorInstanceRef = useRef<any>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  imageRatioLockedRef.current = imageRatioLocked;
  const savedSelectionRef = useRef<SavedSelection | null>(null);
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

  const captureEditorSelection = useCallback((activeEditor = editorInstanceRef.current) => {
    if (!activeEditor) return null;
    const selection = activeEditor.state.selection;
    const next = {
      from: selection.from,
      to: selection.to,
      ...(typeof selection.$anchorCell?.pos === "number" && typeof selection.$headCell?.pos === "number"
        ? { anchorCell: selection.$anchorCell.pos, headCell: selection.$headCell.pos }
        : {}),
    };
    savedSelectionRef.current = next;
    return next;
  }, []);

  const saveEditorSelection = useCallback(() => captureEditorSelection(), [captureEditorSelection]);

  const applySavedSelection = useCallback((activeEditor = editorInstanceRef.current, selection = savedSelectionRef.current) => {
    if (!activeEditor) return false;
    if (!selection) {
      activeEditor.chain().focus().run();
      return true;
    }
    const maxPos = activeEditor.state.doc.content.size;
    if (typeof selection.anchorCell === "number" && typeof selection.headCell === "number") {
      const anchorCell = Math.max(0, Math.min(selection.anchorCell, maxPos));
      const headCell = Math.max(0, Math.min(selection.headCell, maxPos));
      try {
        if (activeEditor.chain().focus().setCellSelection({ anchorCell, headCell }).run()) return true;
      } catch {
        // fall through to text selection
      }
    }
    const from = Math.max(0, Math.min(selection.from, maxPos));
    const to = Math.max(0, Math.min(selection.to, maxPos));
    activeEditor.chain().focus().setTextSelection({ from, to }).run();
    return true;
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
    extensions: createEditorExtensions(),
    content: normalizeEditorHtml(initialHtml),
    editorProps: {
      handleDOMEvents: {
        keydown: (view, event) => {
          const activeEditor = editorInstanceRef.current;
          if (!activeEditor) return false;
          if (handleSlashMenuKeys(event, {
            slashMenuRef,
            slashItemsRef,
            slashActiveRef,
            slashMenuElRef,
            setSlashMenu,
            setSlashActive,
            runSlashAction,
            runSlashFileAction,
          })) return true;
          return handleEditorDomKeydown(activeEditor, event);
        },
      },
      attributes: createEditorContentAttributes(propFontSize, propLineHeight),
      handleKeyDown(view, event) {
        const activeEditor = editorInstanceRef.current;
        if (!activeEditor) return false;
        return handleEditorDomKeydown(activeEditor, event);
      },
      handleTextInput(view, from, to, text) {
        const activeEditor = editorInstanceRef.current;
        if (tryOpenSlashMenu(view, from, text, {
          editor: activeEditor,
          slashItemsRef,
          setSlashMenu,
          setSlashActive,
        })) return false;
        if (text !== " " || !activeEditor) return false;
        const { $from } = view.state.selection;
        const start = $from.start();
        const textBefore = view.state.doc.textBetween(start, from, "\n", "\n");
        return applyMarkdownSpaceShortcut(activeEditor, start, from, textBefore);
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
        const $from = view.state.selection.$from;
        if ($from.parent.type.name === "codeBlock") {
          const text = event.clipboardData?.getData("text/plain");
          if (text == null) return false;
          event.preventDefault();
          const { from, to } = view.state.selection;
          view.dispatch(view.state.tr.insertText(text, from, to));
          return true;
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
      lastExternalHtmlRef.current = normalizeEditorHtml(initialHtml);
      refreshToc(editor);
    },
    onUpdate({ editor }) {
      syncSlashMenu(editor);
      if (ensureHeadingAnchors(editor)) return;
      const html = normalizeEditorHtml(editor.getHTML());
      const text = editor.getText();
      lastExternalHtmlRef.current = html;
      setCharCount(getEditorTextCount(text));
      onContentChangeRef.current?.(html, text);
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
    const headings: TocHeading[] = [];
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
    const next = normalizeEditorHtml(initialHtml);
    const nodeChanged = lastSyncedNodeIdRef.current !== nodeId;
    const externalChanged = next !== lastExternalHtmlRef.current;
    if (!nodeChanged && !externalChanged) return;

    lastSyncedNodeIdRef.current = nodeId;
    lastExternalHtmlRef.current = next;
    const current = normalizeEditorHtml(editor.getHTML());
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    const text = editor.getText();
    setCharCount(getEditorTextCount(text));
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
          event.stopImmediatePropagation();
          handleListTab(editor, event);
        }
        return;
      }
      if ((event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) && editor.isActive("codeBlock")) {
        event.stopImmediatePropagation();
        handleCodeBlockCommitKeys(editor, event);
        return;
      }
      if (handleEmptyBlockEnter(editor, event)) event.stopImmediatePropagation();
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
    const electronApi = getElectronAPI();
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
    if (tocScrollRafRef.current != null) window.cancelAnimationFrame(tocScrollRafRef.current);
  }, []);

  const runEditorCommand = useCallback((command: (activeEditor: any) => boolean | void) => {
    const activeEditor = editorInstanceRef.current;
    if (!activeEditor || activeEditor.isDestroyed) {
      setToast({ message: "编辑器正在初始化，请稍后重试", type: "info" });
      return false;
    }
    try {
      if (savedSelectionRef.current) applySavedSelection(activeEditor);
      else if (!activeEditor.isFocused) activeEditor.chain().focus().run();
      return command(activeEditor) !== false;
    } catch (error) {
      console.error("Editor command failed:", error);
      setToast({ message: "编辑命令执行失败，请重新选择内容后重试", type: "error" });
      return false;
    }
  }, [applySavedSelection]);

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
  if (editor?.isActive("link") || showLinkModal) activeFormats.add("link");
  void toolbarTick;
  void propTheme;

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

  const applyTextAlign = (align: "left" | "center" | "right" | "justify") => runEditorCommand((activeEditor) => applyTextAlignCommand(activeEditor, align));
  const applyIndent = (dir: 1 | -1) => runEditorCommand((activeEditor) => applyIndentCommand(activeEditor, dir));

  const restoreEditorSelection = (activeEditor = editorInstanceRef.current) => applySavedSelection(activeEditor);

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

  const tableAlignActive = (() => {
    if (!editor) return "left";
    const cellAlign = editor.getAttributes("tableCell").align || editor.getAttributes("tableHeader").align;
    if (cellAlign === "left" || cellAlign === "center" || cellAlign === "right") return cellAlign;
    if (editor.isActive({ textAlign: "center" })) return "center";
    if (editor.isActive({ textAlign: "right" })) return "right";
    if (editor.isActive({ textAlign: "justify" })) return "justify";
    return "left";
  })();

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

  const slashItems = buildSlashItems({
    runEditorCommand,
    openLinkDialog,
    openImagePicker,
    openVideoPicker,
    openAttachmentPicker,
    openTableDialog,
  });
  slashItemsRef.current = slashItems;

  return (
    <div className="absolute inset-0 flex flex-col">
      <style>{EDITOR_CONTENT_CSS}</style>
      <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input ref={attachInputRef} type="file" className="hidden" onChange={(e) => {
        void insertAttachmentFromFile(e.target.files?.[0]);
        e.target.value = "";
      }} />
      <EditorToolbar
        toolbarRef={toolbarRef}
        currentHeading={getCurrentHeading()}
        currentFont={getCurrentFont()}
        currentSize={getCurrentSize()}
        activeFormats={activeFormats}
        showAlignDropdown={showAlignDropdown}
        isAlignActive={Boolean(editor?.isActive({ textAlign: "center" }) || editor?.isActive({ textAlign: "right" }) || editor?.isActive({ textAlign: "justify" }))}
        saveEditorSelection={saveEditorSelection}
        toggleToolbarPanel={toggleToolbarPanel}
        runEditorCommand={runEditorCommand}
        applyIndent={applyIndent}
        openLinkModal={openLinkModal}
        openImagePicker={openImagePicker}
        openVideoPicker={openVideoPicker}
        openAttachmentPicker={openAttachmentPicker}
        openTableDialog={openTableDialog}
        copyAnchorLink={copyAnchorLink}
        linkBtnRef={linkBtnRef}
      />
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
      {showTableModal && (
        <InsertTableModal
          tableRows={tableRows}
          tableCols={tableCols}
          setTableRows={setTableRows}
          setTableCols={setTableCols}
          onClose={() => setShowTableModal(false)}
          onInsert={insertTable}
        />
      )}
      {showTableToolbar && (
        <TableFloatBar
          tableToolbarPos={tableToolbarPos}
          tableAlignActive={tableAlignActive}
          runTableCommand={runTableCommand}
          applyTableAlign={applyTableAlign}
        />
      )}
      {showTableToolbar && (
        <TableRowResizeHandles
          tableRowHandles={tableRowHandles}
          activeRowResizeIndex={activeRowResizeIndex}
          onStartResize={startTableRowResize}
        />
      )}
      {selectedImgRect && editorVisibleRect && (
        <EditorImageToolbar
          selectedImgRect={selectedImgRect}
          editorVisibleRect={editorVisibleRect}
          toolbarRef={toolbarRef}
          imageCustomPct={imageCustomPct}
          setImageCustomPct={setImageCustomPct}
          imageRatioLocked={imageRatioLocked}
          setImageRatioLocked={setImageRatioLocked}
          imgBarSlider={imgBarSlider}
          applySelectedImageWidth={applySelectedImageWidth}
          editorInstanceRef={editorInstanceRef}
          selectedImagePosRef={selectedImagePosRef}
          setImgBarSlider={setImgBarSlider}
          setSelectedImgRect={setSelectedImgRect}
          updateImageToolbar={updateImageToolbar}
        />
      )}
      {slashMenu && (
        <EditorSlashMenu
          slashMenu={slashMenu}
          slashMenuElRef={slashMenuElRef}
          slashItems={slashItems}
          slashActive={slashActive}
          slashPressIdx={slashPressIdx}
          setSlashActive={setSlashActive}
          setSlashPressIdx={setSlashPressIdx}
          runSlashAction={runSlashAction}
          runSlashFileAction={runSlashFileAction}
        />
      )}
      <div className="flex-1 min-h-0 bg-white flex justify-center items-stretch overflow-hidden" onKeyDown={(e) => {
        if (!editor) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); const pos = getCaretMenuPosition(); setLinkModalPos({ x: pos.left - 150, y: pos.top + 8 }); setLinkModalMode("insert"); setLinkModalText(""); setLinkModalUrl(""); setShowLinkModal(true); }
        if (slashMenu && e.key === "Escape") { e.preventDefault(); setSlashMenu(null); }
        if (slashMenu && e.key === "ArrowDown") {
          e.preventDefault();
          setSlashActive((idx) => {
            const count = slashItems.length;
            const next = idx < 0 ? 0 : (idx + 1) % count;
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
            const count = slashItems.length;
            const next = idx < 0 ? count - 1 : (idx - 1 + count) % count;
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
          <div className="min-w-0 min-h-0 flex-1 h-full max-w-full overflow-hidden"><EditorContent editor={editor} className="h-full min-h-0 w-full max-w-full min-w-0" /></div>
          <EditorToc
            tocListRef={tocListRef}
            tocButtonRefs={tocButtonRefs}
            tocHeadings={tocHeadings}
            tocActiveId={tocActiveId}
            onScrollToHeading={scrollToHeading}
          />
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <EditorStatusBar
        autoSaveEnabled={autoSaveEnabled}
        lastSavedAt={lastSavedAt}
        onAutoSaveChange={onAutoSaveChange}
        charCount={charCount}
      />
    </div>
  );
}
