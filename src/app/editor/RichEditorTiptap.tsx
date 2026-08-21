// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import React, { useState, useEffect, useRef, useCallback } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { EDITOR_CONTENT_CSS } from "./editorContentCss";
import { createEditorContentAttributes, createEditorExtensions } from "./rich-editor/extensions";
import { applyIndentCommand, applyTextAlignCommand } from "./rich-editor/commands";
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
import { EditorFloatingChrome } from "./rich-editor/EditorFloatingChrome";
import { EditorToc } from "./rich-editor/EditorToc";
import { EditorStatusBar } from "./rich-editor/EditorStatusBar";
import { getEditorTextCount, HEADING_OPTIONS } from "./constants";
import { escapeHtml, normalizeEditorHtml } from "./utils/html";
import { Toast } from "./ui/Toast";
import { isCodeLangPickerOpen } from "./utils/codeLangPicker";
import { getElectronAPI } from "@/app/shared/electron";
import type { RichEditorTiptapProps, SavedSelection, ToastState, ToolbarPanel } from "./rich-editor/types";
import { useEditorSelection } from "./rich-editor/hooks/useEditorSelection";
import { useTableOverlays } from "./rich-editor/hooks/useTableOverlays";
import { useImageToolbarState } from "./rich-editor/hooks/useImageToolbarState";
import { useEditorToc } from "./rich-editor/hooks/useEditorToc";
import { useMediaInsert } from "./rich-editor/hooks/useMediaInsert";
import { useSlashMenuActions } from "./rich-editor/hooks/useSlashMenuActions";

export function RichEditorTiptap({ docName, nodeId, initialHtml, onContentChange, autoSaveEnabled = false, lastSavedAt = null, onAutoSaveChange, fontSize: propFontSize, lineHeight: propLineHeight, theme: propTheme }: RichEditorTiptapProps) {
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
  const editorInstanceRef = useRef<any>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<SavedSelection | null>(null);
  const mountedRef = useRef(true);
  const onContentChangeRef = useRef(onContentChange);
  const cleanupPendingSlashRef = useRef<() => boolean>(() => false);
  const insertImageFromFileRef = useRef<(file?: File | null) => Promise<void>>(async () => {});
  const runSlashActionRef = useRef<(action: () => void) => void>(() => {});
  const runSlashFileActionRef = useRef<(action: () => void) => void>(() => {});
  const refreshTocRef = useRef<(activeEditor: any) => void>(() => {});
  const ensureHeadingAnchorsRef = useRef<(activeEditor: any) => boolean>(() => false);
  const syncSlashMenuRef = useRef<(activeEditor?: any) => void>(() => {});
  const getCaretMenuPositionRef = useRef<() => { left: number; top: number }>(() => ({ left: 320, top: 146 }));
  // slash hooks are created after useEditor; callbacks only read these after mount
  let slash: ReturnType<typeof useSlashMenuActions>;

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  const { saveEditorSelection, applySavedSelection } = useEditorSelection(editorInstanceRef, savedSelectionRef);

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

  const image = useImageToolbarState({ editorInstanceRef, toolbarRef });
  const {
    selectedImgRect, setSelectedImgRect, editorVisibleRect,
    imageRatioLocked, setImageRatioLocked, imageCustomPct, setImageCustomPct,
    imgBarSlider, setImgBarSlider, selectedImagePosRef,
    clearImageToolbar, updateImageToolbar, applySelectedImageWidth,
  } = image;

  const media = useMediaInsert({
    editorInstanceRef,
    mountedRef,
    applySavedSelection,
    saveEditorSelection,
    cleanupPendingSlashRef,
    setToast,
  });
  const {
    imgInputRef, videoInputRef, attachInputRef,
    insertImageFromFile, insertVideoFromFile, insertAttachmentFromFile,
    openImagePicker, openVideoPicker, openAttachmentPicker,
    handleImageUpload, handleVideoUpload,
  } = media;
  insertImageFromFileRef.current = insertImageFromFile;

  const table = useTableOverlays({
    editorInstanceRef,
    toolbarRef,
    saveEditorSelection,
    applySavedSelection,
    setToast,
    setToolbarPanel,
    runEditorCommand,
  });
  const {
    showTableToolbar, setShowTableToolbar, tableToolbarPos, tableRowHandles, setTableRowHandles,
    activeRowResizeIndex, tableRows, setTableRows, tableCols, setTableCols,
    updateTableToolbar, startTableRowResize, runTableCommand, applyTableAlign, insertTable, openTableDialog,
  } = table;

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
    const caretPos = getCaretMenuPositionRef.current();
    setLinkModalPos(anchorRect ? { x: anchorRect.left - 150, y: anchorRect.bottom + 8 } : { x: caretPos.left - 150, y: caretPos.top + 8 });
    setToolbarPanel("link");
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(),
    content: normalizeEditorHtml(initialHtml),
    editorProps: {
      handleDOMEvents: {
        beforeinput: () => isCodeLangPickerOpen(),
        focus: () => isCodeLangPickerOpen(),
        keydown: (view, event) => {
          const activeEditor = editorInstanceRef.current;
          if (!activeEditor) return false;
          if (isCodeLangPickerOpen()) return true;
          if (handleSlashMenuKeys(event, {
            slashMenuRef: slash.slashMenuRef,
            slashItemsRef: slash.slashItemsRef,
            slashActiveRef: slash.slashActiveRef,
            slashMenuElRef: slash.slashMenuElRef,
            setSlashMenu: slash.setSlashMenu,
            setSlashActive: slash.setSlashActive,
            runSlashAction: (action) => runSlashActionRef.current(action),
            runSlashFileAction: (action) => runSlashFileActionRef.current(action),
          })) return true;
          return handleEditorDomKeydown(activeEditor, event);
        },
      },
      attributes: createEditorContentAttributes(propFontSize, propLineHeight),
      handleKeyDown(view, event) {
        const activeEditor = editorInstanceRef.current;
        if (!activeEditor) return false;
        if (isCodeLangPickerOpen()) return true;
        return handleEditorDomKeydown(activeEditor, event);
      },
      handleTextInput(view, from, to, text) {
        if (isCodeLangPickerOpen()) return true;
        const activeEditor = editorInstanceRef.current;
        if (tryOpenSlashMenu(view, from, text, {
          editor: activeEditor,
          slashItemsRef: slash.slashItemsRef,
          setSlashMenu: slash.setSlashMenu,
          setSlashActive: slash.setSlashActive,
        })) return false;
        if (text !== " " || !activeEditor) return false;
        const { $from } = view.state.selection;
        const start = $from.start();
        const textBefore = view.state.doc.textBetween(start, from, "\n", "\n");
        return applyMarkdownSpaceShortcut(activeEditor, start, from, textBefore);
      },
      handlePaste(view, event) {
        if (isCodeLangPickerOpen()) return true;
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i += 1) {
            if (items[i].type.startsWith("image/")) {
              const file = items[i].getAsFile();
              if (!file) return false;
              event.preventDefault();
              savedSelectionRef.current = { from: view.state.selection.from, to: view.state.selection.to };
              void insertImageFromFileRef.current(file);
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
        const imageFile = Array.from(files).find((file) => file.type.startsWith("image/"));
        if (!imageFile) return false;
        event.preventDefault();
        const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
        savedSelectionRef.current = { from: dropPos, to: dropPos };
        void insertImageFromFileRef.current(imageFile);
        return true;
      },
    },
    onCreate({ editor: ed }) {
      if (ensureHeadingAnchorsRef.current(ed)) return;
      const text = ed.getText();
      setCharCount(getEditorTextCount(text));
      lastExternalHtmlRef.current = normalizeEditorHtml(initialHtml);
      refreshTocRef.current(ed);
    },
    onUpdate({ editor: ed }) {
      syncSlashMenuRef.current(ed);
      if (ensureHeadingAnchorsRef.current(ed)) return;
      const html = normalizeEditorHtml(ed.getHTML());
      const text = ed.getText();
      lastExternalHtmlRef.current = html;
      setCharCount(getEditorTextCount(text));
      onContentChangeRef.current?.(html, text);
      setToolbarTick((tick) => tick + 1);
      refreshTocRef.current(ed);
      updateImageToolbar(ed);
    },
    onSelectionUpdate({ editor: ed }) {
      setToolbarTick((tick) => tick + 1);
      updateTableToolbar(ed);
      updateImageToolbar(ed);
      syncSlashMenuRef.current(ed);
    },
  }, [nodeId, updateTableToolbar, updateImageToolbar]);
  editorInstanceRef.current = editor;

  const toc = useEditorToc({ editor, nodeId, initialHtml, editorInstanceRef });
  const {
    tocHeadings, tocActiveId, tocListRef, tocButtonRefs, tocScrollRafRef,
    ensureHeadingAnchors, refreshToc, scrollToHeading,
  } = toc;
  refreshTocRef.current = refreshToc;
  ensureHeadingAnchorsRef.current = ensureHeadingAnchors;

  slash = useSlashMenuActions({
    editorInstanceRef,
    savedSelectionRef,
    saveEditorSelection,
    editor,
    runEditorCommand,
    openLinkDialog,
    openImagePicker,
    openVideoPicker,
    openAttachmentPicker,
    openTableDialog,
  });
  const {
    slashMenu, setSlashMenu, slashActive, setSlashActive, slashPressIdx, setSlashPressIdx,
    slashMenuRef, slashActiveRef, slashMenuElRef, slashItemsRef,
    syncSlashMenu, cleanupPendingSlash, getCaretMenuPosition,
    runSlashAction, runSlashFileAction, slashItems,
  } = slash;
  cleanupPendingSlashRef.current = cleanupPendingSlash;
  runSlashActionRef.current = runSlashAction;
  runSlashFileActionRef.current = runSlashFileAction;
  syncSlashMenuRef.current = syncSlashMenu;
  getCaretMenuPositionRef.current = getCaretMenuPosition;

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

  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      if (isCodeLangPickerOpen()) return;
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
  }, [editor, updateTableToolbar, updateImageToolbar, clearImageToolbar, setSlashMenu, setShowTableToolbar, setTableRowHandles]);

  useEffect(() => () => {
    mountedRef.current = false;
    if (tocScrollRafRef.current != null) window.cancelAnimationFrame(tocScrollRafRef.current);
  }, [tocScrollRafRef]);

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

  const tableAlignActive = (() => {
    if (!editor) return "left";
    const cellAlign = editor.getAttributes("tableCell").align || editor.getAttributes("tableHeader").align;
    if (cellAlign === "left" || cellAlign === "center" || cellAlign === "right") return cellAlign;
    if (editor.isActive({ textAlign: "center" })) return "center";
    if (editor.isActive({ textAlign: "right" })) return "right";
    if (editor.isActive({ textAlign: "justify" })) return "justify";
    return "left";
  })();

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
      <EditorFloatingChrome
        editor={editor}
        toolbarRef={toolbarRef}
        editorInstanceRef={editorInstanceRef}
        showColorPicker={showColorPicker}
        colorPickerPos={colorPickerPos}
        setShowColorPicker={setShowColorPicker}
        runEditorCommand={runEditorCommand}
        showHeadingDropdown={showHeadingDropdown}
        headingDropPos={headingDropPos}
        setShowHeadingDropdown={setShowHeadingDropdown}
        showFontDropdown={showFontDropdown}
        fontDropPos={fontDropPos}
        setShowFontDropdown={setShowFontDropdown}
        showSizeDropdown={showSizeDropdown}
        sizeDropPos={sizeDropPos}
        setShowSizeDropdown={setShowSizeDropdown}
        showAlignDropdown={showAlignDropdown}
        alignDropPos={alignDropPos}
        setShowAlignDropdown={setShowAlignDropdown}
        applyTextAlign={applyTextAlign}
        showLinkModal={showLinkModal}
        linkModalPos={linkModalPos}
        linkModalText={linkModalText}
        linkModalUrl={linkModalUrl}
        linkModalMode={linkModalMode}
        linkBtnRef={linkBtnRef}
        setShowLinkModal={setShowLinkModal}
        applyLink={applyLink}
        showTableModal={showTableModal}
        tableRows={tableRows}
        tableCols={tableCols}
        setTableRows={setTableRows}
        setTableCols={setTableCols}
        setShowTableModal={setShowTableModal}
        insertTable={insertTable}
        showTableToolbar={showTableToolbar}
        tableToolbarPos={tableToolbarPos}
        tableAlignActive={tableAlignActive}
        runTableCommand={runTableCommand}
        applyTableAlign={applyTableAlign}
        tableRowHandles={tableRowHandles}
        activeRowResizeIndex={activeRowResizeIndex}
        startTableRowResize={startTableRowResize}
        selectedImgRect={selectedImgRect}
        editorVisibleRect={editorVisibleRect}
        imageCustomPct={imageCustomPct}
        setImageCustomPct={setImageCustomPct}
        imageRatioLocked={imageRatioLocked}
        setImageRatioLocked={setImageRatioLocked}
        imgBarSlider={imgBarSlider}
        setImgBarSlider={setImgBarSlider}
        selectedImagePosRef={selectedImagePosRef}
        setSelectedImgRect={setSelectedImgRect}
        updateImageToolbar={updateImageToolbar}
        applySelectedImageWidth={applySelectedImageWidth}
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
