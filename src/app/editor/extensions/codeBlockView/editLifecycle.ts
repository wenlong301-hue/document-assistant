// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { closeCodeLangPicker } from "../../utils/codeLangPicker";
import { codeBlockArmedSessions } from "../codeBlockSessions";
import type { CodeBlockViewCtx } from "./types";

export function createEditLifecycle(ctx: CodeBlockViewCtx) {
  ctx.placeCaretInSource = () => {
    if (ctx.langPickerBusy()) return;
    const range = ctx.nodeRange();
    if (!range) return;
    // 落在内容区内，避免 pos+size-1 落在块边界被判定为离开
    const end = Math.min(Math.max(range.pos + 1, range.pos + range.size - 2), range.pos + range.size - 1);
    // 落点全过程加锁：focus 可能先触发 selectionUpdate（选区仍在块外）
    ctx.lockEnteringEdit(240);
    try {
      ctx.editor.chain().setTextSelection(end).focus().run();
    } catch {
      try { ctx.editor.commands.focus(); } catch { /* ignore */ }
    }
    ctx.lockEnteringEdit(240);
  };
  ctx.enterEdit = (opts?: { focusSource?: boolean }) => {
    if (!ctx.editor.isEditable) return;
    if (ctx.editing) {
      if (opts?.focusSource !== false) ctx.placeCaretInSource();
      return;
    }
    const range = ctx.nodeRange();
    if (!range) return;
    const shouldAnimateExpand = ctx.isDiagram();
    ctx.sourceCollapsing = false;
    ctx.sourceOpen = !shouldAnimateExpand;
    ctx.pendingFocusAfterExpand = shouldAnimateExpand && opts?.focusSource !== false;
    ctx.editing = true;
    ctx.armed = false;
    ctx.clearArmedSession();
    window.clearTimeout(ctx.blurCommitTimer);
    if (ctx.isDiagram()) {
      // 取消进行中的预览渲染，避免异步回调把界面打回预览态
      ctx.renderToken += 1;
      window.clearTimeout(ctx.debounceTimer);
    }
    ctx.rememberEditSession();
    // 先切 is-editing 但保持 height:0；展开完成后再落点，避免 NodeView 重建跳过动画
    ctx.lockEnteringEdit();
    ctx.syncChrome();
    if (shouldAnimateExpand) ctx.expandSourceShell();
    else if (opts?.focusSource !== false) ctx.placeCaretInSource();
  };
  ctx.rememberArmedSession = () => {
    const range = ctx.nodeRange();
    if (!range) return;
    codeBlockArmedSessions.set(ctx.editor, { pos: range.pos });
  };
  ctx.clearArmedSession = () => {
    codeBlockArmedSessions.delete(ctx.editor);
  };
  ctx.armExpandBar = () => {
    if (!ctx.editor.isEditable || !ctx.isDiagram() || ctx.editing || ctx.sourceCollapsing) return;
    if (ctx.armed) {
      ctx.rememberArmedSession();
      ctx.syncExpandBar();
      return;
    }
    ctx.armed = true;
    ctx.rememberArmedSession();
    ctx.syncChrome();
  };
  ctx.disarmExpandBar = () => {
    if (!ctx.armed) return;
    ctx.armed = false;
    ctx.clearArmedSession();
    ctx.syncChrome();
  };
  ctx.commitEdit = (opts?: { keepSelection?: boolean }) => {
    if (!ctx.editing) {
      ctx.disarmExpandBar();
      return;
    }
    if (ctx.isEnteringEdit()) return;
    const wasDiagram = ctx.isDiagram();
    if (wasDiagram) ctx.sourceCollapsing = true;
    ctx.editing = false;
    ctx.armed = false;
    ctx.editLockUntil = 0;
    ctx.clearArmedSession();
    if (ctx.langPickerBusy()) closeCodeLangPicker();
    ctx.clearEditSession();
    if (!opts?.keepSelection) ctx.focusAfterNode();
    const finishChrome = () => {
      ctx.sourceCollapsing = false;
      ctx.syncChrome();
      if (wasDiagram) ctx.scheduleRender();
      else ctx.syncHighlight();
    };
    if (wasDiagram) ctx.collapseSourceShell(finishChrome);
    else finishChrome();
  };
}
