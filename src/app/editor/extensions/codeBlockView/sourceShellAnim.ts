// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { isDiagramLanguage } from "../../utils/codeLanguages";
import type { CodeBlockViewCtx } from "./types";

export function createSourceShellAnim(ctx: CodeBlockViewCtx) {
  ctx.lockEnteringEdit = (extraMs = 0) => {
    ctx.editLockUntil = Date.now() + ctx.SOURCE_EXPAND_MS + 80 + extraMs;
  };
  ctx.prefersReducedMotion = () =>
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  ctx.afterPaint = (fn: () => void) => {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  };
  ctx.resetSourceShellStyle = () => {
    ctx.sourceShell.style.transition = "";
    ctx.sourceShell.style.height = "";
  };
  ctx.stopSourceAnim = () => {
    ctx.sourceAnimToken += 1;
    window.clearTimeout(ctx.sourceAnimTimer);
    ctx.sourceCollapsing = false;
  };
  ctx.waitHeightTransition = (token: number, onDone: () => void) => {
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      ctx.sourceShell.removeEventListener("transitionend", onEnd);
      window.clearTimeout(ctx.sourceAnimTimer);
      if (token !== ctx.sourceAnimToken) return;
      onDone();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== ctx.sourceShell || event.propertyName !== "height") return;
      finish();
    };
    ctx.sourceShell.addEventListener("transitionend", onEnd);
    ctx.sourceAnimTimer = window.setTimeout(finish, ctx.SOURCE_EXPAND_MS + 80);
  };
  ctx.finishExpandOpen = () => {
    const shouldFocus = ctx.pendingFocusAfterExpand;
    // 先落点再清 pendingFocus：focus 可能先抛出「选区仍在块外」的 selectionUpdate
    ctx.lockEnteringEdit(shouldFocus ? 320 : 80);
    ctx.sourceOpen = true;
    ctx.resetSourceShellStyle();
    ctx.rememberEditSession();
    ctx.syncChrome();
    if (!shouldFocus) return;
    ctx.afterPaint(() => {
      if (!ctx.editing) return;
      ctx.lockEnteringEdit(320);
      if (!ctx.langPickerBusy()) ctx.placeCaretInSource();
      ctx.pendingFocusAfterExpand = false;
      ctx.lockEnteringEdit(320);
    });
  };
  ctx.expandSourceShell = () => {
    if (ctx.prefersReducedMotion()) {
      ctx.finishExpandOpen();
      return;
    }
    const token = ++ctx.sourceAnimToken;
    window.clearTimeout(ctx.sourceAnimTimer);
    ctx.sourceOpen = false;
    ctx.sourceShell.style.transition = "none";
    ctx.sourceShell.style.height = "0px";
    ctx.syncChrome();
    ctx.afterPaint(() => {
      if (token !== ctx.sourceAnimToken || !ctx.editing) return;
      ctx.sourceShell.style.transition = "none";
      ctx.sourceShell.style.height = "auto";
      const to = Math.max(ctx.sourceShell.scrollHeight, ctx.sourceInner.scrollHeight, 1);
      ctx.sourceShell.style.height = "0px";
      void ctx.sourceShell.offsetHeight;
      ctx.sourceShell.style.transition = `height ${ctx.SOURCE_EXPAND_MS}ms ease`;
      ctx.sourceShell.style.height = `${to}px`;
      ctx.waitHeightTransition(token, () => {
        if (!ctx.editing) return;
        ctx.finishExpandOpen();
      });
    });
  };
  ctx.collapseSourceShell = (after: () => void) => {
    const finish = () => {
      ctx.sourceCollapsing = false;
      ctx.sourceOpen = false;
      ctx.sourceShell.style.transition = "none";
      ctx.sourceShell.style.height = "0px";
      after();
      ctx.resetSourceShellStyle();
    };
    if (ctx.prefersReducedMotion()) {
      finish();
      return;
    }
    const from = ctx.sourceShell.getBoundingClientRect().height || ctx.sourceInner.scrollHeight;
    if (from <= 0.5) {
      finish();
      return;
    }
    ctx.sourceCollapsing = true;
    ctx.sourceOpen = true;
    const token = ++ctx.sourceAnimToken;
    window.clearTimeout(ctx.sourceAnimTimer);
    ctx.sourceShell.style.transition = "none";
    ctx.sourceShell.style.height = `${from}px`;
    ctx.syncChrome();
    ctx.afterPaint(() => {
      if (token !== ctx.sourceAnimToken) return;
      ctx.sourceShell.style.transition = `height ${ctx.SOURCE_EXPAND_MS}ms ease`;
      ctx.sourceShell.style.height = "0px";
      ctx.waitHeightTransition(token, finish);
    });
  };
  /** 展开动画中、待落点、或锁定期：禁止 selection/blur 立刻 commit 收回 */
  ctx.isEnteringEdit = () => {
    if (Date.now() < ctx.editLockUntil || ctx.pendingFocusAfterExpand) return true;
    if (!ctx.editing || !isDiagramLanguage(ctx.currentNode.attrs.language)) return false;
    // 源码壳尚未完全打开，或收起动画中：禁止误 commit
    if (!ctx.sourceOpen || ctx.sourceCollapsing) return true;
    return false;
  };
}
