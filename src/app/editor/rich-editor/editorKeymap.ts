// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { commitActiveCodeBlockEdit, insertParagraphAfterAncestor, isTiptapBlockEmpty } from "../extensions";
import { getSlashMenuPlacement } from "../constants";
import type { SlashItem, SlashMenuState } from "./types";

export const handleListTab = (activeEditor: any, event: KeyboardEvent) => {
  if (event.key !== "Tab") return false;
  if (!(activeEditor.isActive("listItem") || activeEditor.isActive("taskItem"))) return false;
  event.preventDefault();
  const itemName = activeEditor.isActive("taskItem") ? "taskItem" : "listItem";
  return event.shiftKey
    ? activeEditor.chain().focus().liftListItem(itemName).run()
    : activeEditor.chain().focus().sinkListItem(itemName).run();
};

export const handleCodeBlockCommitKeys = (activeEditor: any, event: KeyboardEvent) => {
  if (!(event.key === "Escape" || ((event.metaKey || event.ctrlKey) && event.key === "Enter"))) return false;
  if (!activeEditor.isActive("codeBlock")) return false;
  event.preventDefault();
  return commitActiveCodeBlockEdit(activeEditor);
};

export const handleEmptyBlockEnter = (activeEditor: any, event: KeyboardEvent) => {
  if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
  if (activeEditor.isActive("codeBlock")) return false;
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
};

export const handleEditorDomKeydown = (activeEditor: any, event: KeyboardEvent) => {
  if (handleListTab(activeEditor, event)) return true;
  if (handleCodeBlockCommitKeys(activeEditor, event)) return true;
  return handleEmptyBlockEnter(activeEditor, event);
};

export const applyMarkdownSpaceShortcut = (activeEditor: any, start: number, from: number, textBefore: string) => {
  const clearTrigger = () => activeEditor.chain().focus().deleteRange({ from: start, to: from });
  if (/^#{1,6}$/.test(textBefore)) {
    return clearTrigger().toggleHeading({ level: textBefore.length as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  }
  if (textBefore === ">") return clearTrigger().toggleBlockquote().run();
  if (/^\d+\.$/.test(textBefore)) return clearTrigger().toggleOrderedList().run();
  if (/^[-*+]$/.test(textBefore)) return clearTrigger().toggleBulletList().run();
  if (textBefore === "```mermaid") return clearTrigger().toggleCodeBlock({ language: "mermaid" }).run();
  if (textBefore === "```sequence") return clearTrigger().toggleCodeBlock({ language: "sequence" }).run();
  if (textBefore === "```flow") return clearTrigger().toggleCodeBlock({ language: "flow" }).run();
  if (textBefore === "```") return clearTrigger().toggleCodeBlock().run();
  return false;
};

export type SlashMenuKeyCtx = {
  slashMenuRef: { current: SlashMenuState | null };
  slashItemsRef: { current: SlashItem[] };
  slashActiveRef: { current: number };
  slashMenuElRef: { current: HTMLDivElement | null };
  setSlashMenu: (value: SlashMenuState | null) => void;
  setSlashActive: (value: number) => void;
  runSlashAction: (action: () => void) => void;
  runSlashFileAction: (action: () => void) => void;
};

export const handleSlashMenuKeys = (event: KeyboardEvent, ctx: SlashMenuKeyCtx) => {
  if (!ctx.slashMenuRef.current) return false;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    ctx.setSlashMenu(null);
    return true;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    event.stopImmediatePropagation();
    const count = ctx.slashItemsRef.current.length;
    if (count > 0) {
      const cur = ctx.slashActiveRef.current;
      const next = event.key === "ArrowDown"
        ? (cur < 0 ? 0 : (cur + 1) % count)
        : (cur < 0 ? count - 1 : (cur - 1 + count) % count);
      ctx.slashActiveRef.current = next;
      ctx.setSlashActive(next);
      requestAnimationFrame(() => {
        const el = ctx.slashMenuElRef.current?.querySelector<HTMLElement>(`[data-slash-idx="${next}"]`);
        el?.scrollIntoView({ block: "nearest" });
      });
    }
    return true;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    event.stopImmediatePropagation();
    const item = ctx.slashItemsRef.current[ctx.slashActiveRef.current] ?? ctx.slashItemsRef.current[0];
    if (item) {
      if (item.kind === "file") ctx.runSlashFileAction(item.action);
      else ctx.runSlashAction(item.action);
    }
    return true;
  }
  return false;
};

export const tryOpenSlashMenu = (
  view: any,
  from: number,
  text: string,
  ctx: {
    editor: any;
    slashItemsRef: { current: SlashItem[] };
    setSlashMenu: (value: SlashMenuState | null) => void;
    setSlashActive: (value: number) => void;
  },
) => {
  if (text !== "/") return false;
  const { $from } = view.state.selection;
  const lineText = view.state.doc.textBetween($from.start(), from, "\n", "\n");
  if (!lineText.trim()) {
    const rect = view.coordsAtPos(from);
    window.setTimeout(() => {
      if (ctx.editor?.isDestroyed) return;
      ctx.setSlashMenu(getSlashMenuPlacement(
        { left: rect.left, top: rect.top, bottom: rect.bottom },
        { itemCount: ctx.slashItemsRef.current.length || 14 },
      ));
      ctx.setSlashActive(-1);
    }, 0);
  }
  return false;
};
