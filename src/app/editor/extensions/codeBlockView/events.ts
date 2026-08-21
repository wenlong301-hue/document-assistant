// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { closeCodeLangPicker, isCodeLangPickerOpen } from "../../utils/codeLangPicker";
import type { CodeBlockViewCtx } from "./types";

export function createEvents(ctx: CodeBlockViewCtx) {
  ctx.stopPointer = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  ctx.onEnterPointer = (event: Event) => {
    if (!ctx.editor.isEditable || ctx.editing) return;
    const target = event.target as Node | null;
    if (target && (ctx.actionBar.contains(target) || ctx.langBar.contains(target) || ctx.deleteHint.contains(target))) return;
    if (target && ctx.expandBar.contains(target)) return;
    if (ctx.isDiagram()) {
      if (target && (ctx.pre.contains(target) || ctx.code.contains(target))) return;
      ctx.stopPointer(event);
      // 图表：点预览先出 20px 条，不直接展开源码
      ctx.armExpandBar();
      return;
    }
    // 普通代码块：点进源码区域即进入编辑态
    if (target && (ctx.pre.contains(target) || ctx.code.contains(target) || ctx.highlightLayer.contains(target))) {
      ctx.enterEdit({ focusSource: false });
    }
  };
  ctx.onExpandBarPointer = (event: Event) => {
    ctx.stopPointer(event);
    // 只认 pointerdown（兼容无 PointerEvent 时的 mousedown）；click 可能因条收起穿透到预览
    if (event.type === "pointerdown") {
      (ctx as { _expandPtr?: number })._expandPtr = Date.now();
    } else if (event.type === "mousedown") {
      const recent = (ctx as { _expandPtr?: number })._expandPtr || 0;
      if (Date.now() - recent < 400) return;
    } else {
      return;
    }
    if (!ctx.editor.isEditable || ctx.editing) return;
    // 图表首次展开不自动 placeCaret：避免与右下角语言选择器抢焦点导致源码壳被收起
    ctx.enterEdit({ focusSource: false });
  };
  ctx.deleteBlock = () => {
    const range = ctx.nodeRange();
    if (!range || !ctx.editor.isEditable) return;
    ctx.langPickerHold = false;
    ctx.clearLangPickerSession();
    if (isCodeLangPickerOpen()) closeCodeLangPicker();
    ctx.editing = false;
    ctx.armed = false;
    ctx.clearArmedSession();
    ctx.clearEditSession();
    ctx.editor.chain().focus().deleteRange({ from: range.pos, to: range.pos + range.size }).run();
  };
  ctx.removeBlock = (event: Event) => {
    ctx.stopPointer(event);
    if (!ctx.editor.isEditable) return;
    ctx.langPickerHold = false;
    ctx.clearLangPickerSession();
    if (isCodeLangPickerOpen()) closeCodeLangPicker();
    const range = ctx.nodeRange();
    if (!range) return;
    ctx.editing = false;
    ctx.armed = false;
    ctx.clearArmedSession();
    ctx.clearEditSession();
    ctx.editor.chain().focus().deleteRange({ from: range.pos, to: range.pos + range.size }).run();
  };
  ctx.onSelectionUpdate = () => {
    const next = ctx.selectionInThisBlock();
    if (next === null) return;
    const wasInside = ctx.selectionInside;
    ctx.selectionInside = next;
    if (ctx.langPickerHold || ctx.langPickerBusy() || isCodeLangPickerOpen()) {
      ctx.syncChrome();
      if (!ctx.isDiagram()) ctx.syncHighlight();
      return;
    }
    // 选区离开代码块：提交退出（语言选择器 / 展开锁定期除外）
    if (!next) {
      if (ctx.editing) {
        if (ctx.isEnteringEdit() || ctx.langPickerHold || ctx.langPickerBusy() || isCodeLangPickerOpen()) return;
        ctx.commitEdit({ keepSelection: true });
        return;
      }
      if (ctx.armed) return;
    }
    // 普通代码块：进入块内选区时自动进入编辑态；图表仍靠预览点击
    if (next && !ctx.editing && ctx.editor.isEditable && !ctx.isDiagram()) {
      ctx.enterEdit({ focusSource: false });
      return;
    }
    if (ctx.isDiagram()) {
      if (ctx.editing) ctx.syncLangPicker();
      else ctx.syncExpandBar();
      return;
    }
    if (ctx.editing) {
      ctx.syncLangPicker();
      ctx.syncHighlight();
      return;
    }
    if (next !== wasInside) ctx.syncChrome();
    else {
      ctx.syncLangPicker();
      ctx.syncHighlight();
    }
  };
  ctx.onDocPointerDown = (event: Event) => {
    if (!ctx.armed || ctx.editing) return;
    const target = event.target as Node | null;
    if (target && ctx.dom.contains(target)) return;
    ctx.disarmExpandBar();
  };
  ctx.onLangTriggerPointer = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    // 首次展开后点语言：先 hold，再开选择器（禁止任何异步 placeCaret/blur commit）
    if (event.type === "pointerdown" || event.type === "mousedown") {
      ctx.cancelPendingSourceFocus();
      ctx.langPickerHold = true;
      ctx.rememberLangPickerSession();
      window.clearTimeout(ctx.blurCommitTimer);
      ctx.lockEnteringEdit(2000);
      try {
        (window as any).__docCodeLangPickerOpen = true;
      } catch { /* ignore */ }
      ctx.openLangPicker();
    }
  };
  ctx.onEditorBlur = () => {
    window.clearTimeout(ctx.blurCommitTimer);
    ctx.blurCommitTimer = window.setTimeout(() => {
      if (ctx.destroyed || !ctx.editing) return;
      if (ctx.langPickerHold || ctx.langPickerBusy() || isCodeLangPickerOpen() || ctx.isEnteringEdit()) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest?.(".doc-code-lang-portal, .doc-code-lang-menu")) return;
      if (active && (ctx.dom.contains(active) || ctx.actionBar.contains(active) || ctx.expandBar.contains(active) || ctx.langBar.contains(active))) return;
      if (!ctx.editor.isFocused) {
        ctx.commitEdit({ keepSelection: true });
      }
    }, 220);
  };
  ctx.onOutsidePointer = (event: Event) => {
    if (ctx.destroyed || !ctx.editing) return;
    if (ctx.langPickerHold || ctx.langPickerBusy() || isCodeLangPickerOpen() || ctx.isEnteringEdit()) return;
    const target = event.target as Element | null;
    if (!target) return;
    // 点语言按钮/底栏：capture 阶段可能早于 hold 置位，绝不能当「外部点击」收起
    if (target.closest?.(".doc-code-lang-trigger, .doc-code-lang, .doc-code-actionbar, .doc-code-lang-portal, .doc-code-lang-menu")) return;
    if (ctx.dom.contains(target)) return;
    ctx.commitEdit({ keepSelection: true });
  };
}

export function bindDomEvents(ctx: CodeBlockViewCtx) {
  ctx.expandBar.addEventListener("pointerdown", ctx.onExpandBarPointer);
  ctx.expandBar.addEventListener("mousedown", ctx.onExpandBarPointer);
  ctx.expandBar.addEventListener("click", ctx.onExpandBarPointer);
  ctx.deleteHint.addEventListener("mousedown", ctx.stopPointer);
  ctx.deleteHint.addEventListener("click", (event) => {
    ctx.stopPointer(event);
    ctx.deleteBlock();
  });
  ctx.langTrigger.addEventListener("pointerdown", ctx.onLangTriggerPointer);
  ctx.langTrigger.addEventListener("mousedown", ctx.onLangTriggerPointer);
  ctx.langTrigger.addEventListener("mouseup", ctx.onLangTriggerPointer);
  ctx.langTrigger.addEventListener("pointerup", ctx.onLangTriggerPointer);
  ctx.langTrigger.addEventListener("click", ctx.onLangTriggerPointer);
  ctx.dom.addEventListener("pointerdown", ctx.onEnterPointer, true);
  ctx.dom.addEventListener("mousedown", ctx.onEnterPointer, true);
  ctx.editHint.addEventListener("click", ctx.onEnterPointer);
  ctx.preview.addEventListener("click", ctx.onEnterPointer);
  document.addEventListener("pointerdown", ctx.onDocPointerDown, true);
  document.addEventListener("pointerdown", ctx.onOutsidePointer, true);
  ctx.editor.on("selectionUpdate", ctx.onSelectionUpdate);
  ctx.editor.on("blur", ctx.onEditorBlur);
  ctx.pre.addEventListener("keydown", (event) => {
    if (!ctx.editing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      ctx.commitEdit();
    }
  });
  ctx.code.addEventListener("input", () => {
    if (ctx.isDiagram() && ctx.editing) ctx.scheduleRender();
  });
  ctx.code.addEventListener("keyup", () => {
    if (ctx.isDiagram() && ctx.editing) ctx.scheduleRender();
  });
}

export function unbindDomEvents(ctx: CodeBlockViewCtx) {
  ctx.editor.off("selectionUpdate", ctx.onSelectionUpdate);
  ctx.editor.off("blur", ctx.onEditorBlur);
  ctx.dom.removeEventListener("pointerdown", ctx.onEnterPointer, true);
  ctx.dom.removeEventListener("mousedown", ctx.onEnterPointer, true);
  document.removeEventListener("pointerdown", ctx.onDocPointerDown, true);
  document.removeEventListener("pointerdown", ctx.onOutsidePointer, true);
  ctx.preview.removeEventListener("click", ctx.onEnterPointer);
  ctx.editHint.removeEventListener("click", ctx.onEnterPointer);
  ctx.expandBar.removeEventListener("pointerdown", ctx.onExpandBarPointer);
  ctx.expandBar.removeEventListener("mousedown", ctx.onExpandBarPointer);
  ctx.expandBar.removeEventListener("click", ctx.onExpandBarPointer);
}
