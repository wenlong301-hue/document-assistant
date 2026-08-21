// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { useCallback, useRef, useState, type MutableRefObject } from "react";
import { buildSlashItems } from "../slashItems";
import type { SavedSelection, SlashMenuState } from "../types";

type Opts = {
  editorInstanceRef: MutableRefObject<any>;
  savedSelectionRef: MutableRefObject<SavedSelection | null>;
  saveEditorSelection: () => unknown;
  editor: any;
  runEditorCommand: (command: (activeEditor: any) => boolean | void) => boolean;
  openLinkDialog: (anchorRect?: DOMRect) => void;
  openImagePicker: () => void;
  openVideoPicker: () => void;
  openAttachmentPicker: () => void;
  openTableDialog: () => void;
};

export function useSlashMenuActions({
  editorInstanceRef, savedSelectionRef, saveEditorSelection, editor,
  runEditorCommand, openLinkDialog, openImagePicker, openVideoPicker,
  openAttachmentPicker, openTableDialog,
}: Opts) {
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const [slashActive, setSlashActive] = useState(-1);
  const [slashPressIdx, setSlashPressIdx] = useState<number | null>(null);
  const slashMenuRef = useRef<typeof slashMenu>(null);
  const slashActiveRef = useRef(-1);
  const slashMenuElRef = useRef<HTMLDivElement | null>(null);
  const slashItemsRef = useRef<ReturnType<typeof buildSlashItems>>([]);
  const pendingSlashCleanupRef = useRef<{ from: number; to: number } | null>(null);
  slashMenuRef.current = slashMenu;
  slashActiveRef.current = slashActive;

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
    runEditorCommand, openLinkDialog, openImagePicker, openVideoPicker,
    openAttachmentPicker, openTableDialog,
  });
  slashItemsRef.current = slashItems;

  return {
    slashMenu, setSlashMenu, slashActive, setSlashActive, slashPressIdx, setSlashPressIdx,
    slashMenuRef, slashActiveRef, slashMenuElRef, slashItemsRef, pendingSlashCleanupRef,
    syncSlashMenu, markSlashCleanup, cleanupPendingSlash, getCaretMenuPosition,
    runSlashAction, runSlashFileAction, slashItems,
  };
}
