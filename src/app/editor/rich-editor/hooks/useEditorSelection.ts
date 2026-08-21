// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { useCallback, type MutableRefObject } from "react";
import type { SavedSelection } from "../types";

export function useEditorSelection(
  editorInstanceRef: MutableRefObject<any>,
  savedSelectionRef: MutableRefObject<SavedSelection | null>,
) {
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

  return { captureEditorSelection, saveEditorSelection, applySavedSelection };
}
