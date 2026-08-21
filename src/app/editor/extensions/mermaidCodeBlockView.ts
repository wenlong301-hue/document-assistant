// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import {
  rebindCodeLangPickerAnchor,
  syncCodeLangTrigger,
} from "../utils/codeLangPicker";
import {
  codeBlockArmedSessions,
  codeBlockEditControllers,
  codeBlockEditSessions,
} from "./codeBlockSessions";
import { createChrome } from "./codeBlockView/chrome";
import { bindDomEvents, createEvents, unbindDomEvents } from "./codeBlockView/events";
import { createEditLifecycle } from "./codeBlockView/editLifecycle";
import { createPreview } from "./codeBlockView/preview";
import { createSourceShellAnim } from "./codeBlockView/sourceShellAnim";
import type { CodeBlockViewCtx } from "./codeBlockView/types";

export const createMermaidCodeBlockView = ({ node, editor, getPos }: any) => {
  const dom = document.createElement("div");
  const preview = document.createElement("div");
  const editHint = document.createElement("button");
  const deleteHint = document.createElement("button");
  const expandBar = document.createElement("button");
  const expandBarLabel = document.createElement("span");
  const expandBarChevron = document.createElement("span");
  const sourceShell = document.createElement("div");
  const sourceInner = document.createElement("div");
  const actionBar = document.createElement("div");
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  const highlightLayer = document.createElement("div");
  const langBar = document.createElement("div");
  const langTrigger = document.createElement("button");

  const ctx = {
    node,
    editor,
    getPos,
    dom,
    preview,
    editHint,
    deleteHint,
    expandBar,
    expandBarLabel,
    expandBarChevron,
    sourceShell,
    sourceInner,
    actionBar,
    pre,
    code,
    highlightLayer,
    langBar,
    langTrigger,
    currentNode: node,
    editing: false,
    armed: false,
    renderToken: 0,
    lastSource: "",
    debounceTimer: 0,
    selectionInside: false,
    editLockUntil: 0,
    SOURCE_EXPAND_MS: 280,
    sourceAnimToken: 0,
    sourceAnimTimer: 0,
    sourceCollapsing: false,
    sourceOpen: false,
    pendingFocusAfterExpand: false,
    blurCommitTimer: 0,
  } as CodeBlockViewCtx;

  createSourceShellAnim(ctx);
  createChrome(ctx);
  createPreview(ctx);
  createEditLifecycle(ctx);
  createEvents(ctx);

  preview.className = "doc-diagram-preview";
  preview.contentEditable = "false";

  editHint.type = "button";
  editHint.className = "doc-diagram-edit-hint";
  editHint.textContent = "编辑";
  editHint.contentEditable = "false";

  expandBar.type = "button";
  expandBar.className = "doc-diagram-expand-bar";
  expandBar.contentEditable = "false";
  expandBar.setAttribute("aria-label", "展开源码");
  expandBarLabel.className = "doc-diagram-expand-label";
  expandBarChevron.className = "doc-diagram-expand-chevron";
  expandBarChevron.setAttribute("aria-hidden", "true");
  expandBar.appendChild(expandBarLabel);
  expandBar.appendChild(expandBarChevron);

  deleteHint.type = "button";
  deleteHint.className = "doc-code-delete-hint";
  deleteHint.textContent = "删除";
  deleteHint.contentEditable = "false";

  actionBar.className = "doc-code-actionbar";
  actionBar.contentEditable = "false";
  actionBar.style.justifyContent = "flex-end";

  highlightLayer.className = "doc-code-highlight";
  highlightLayer.contentEditable = "false";
  highlightLayer.style.display = "none";

  langBar.className = "doc-code-lang";
  langBar.contentEditable = "false";
  langBar.style.display = "none";
  langTrigger.type = "button";
  langTrigger.className = "doc-code-lang-trigger";
  langTrigger.contentEditable = "false";
  syncCodeLangTrigger(langTrigger, ctx.currentNode.attrs.language);
  langTrigger.tabIndex = -1;

  langBar.appendChild(langTrigger);
  actionBar.appendChild(langBar);

  bindDomEvents(ctx);

  pre.appendChild(highlightLayer);
  pre.appendChild(code);
  sourceInner.className = "doc-diagram-source-inner";
  sourceInner.appendChild(pre);
  sourceInner.appendChild(actionBar);
  sourceShell.className = "doc-diagram-source-shell";
  sourceShell.appendChild(sourceInner);
  dom.appendChild(expandBar);
  dom.appendChild(sourceShell);
  dom.appendChild(preview);
  dom.appendChild(editHint);
  dom.appendChild(deleteHint);
  code.textContent = ctx.currentNode.textContent;

  const pendingSession = codeBlockEditSessions.get(editor);
  const pendingArmed = codeBlockArmedSessions.get(editor);
  const currentPos = typeof getPos === "function" ? getPos() : null;
  if (
    pendingSession
    && editor.isEditable
    && typeof currentPos === "number"
    && pendingSession.pos === currentPos
  ) {
    ctx.editing = true;
    ctx.armed = false;
    ctx.sourceOpen = pendingSession.sourceOpen !== false;
    ctx.selectionInside = ctx.selectionInThisBlock() ?? true;
    if (ctx.isDiagram() && !ctx.sourceOpen) {
      ctx.pendingFocusAfterExpand = true;
      ctx.lockEnteringEdit();
      ctx.syncChrome();
      ctx.expandSourceShell();
    } else {
      ctx.sourceOpen = true;
      ctx.syncChrome();
      requestAnimationFrame(() => {
        if (!ctx.editing || ctx.langPickerBusy()) return;
        ctx.placeCaretInSource();
      });
    }
  } else {
    ctx.selectionInside = ctx.selectionInThisBlock() ?? false;
    if (
      pendingArmed
      && editor.isEditable
      && typeof currentPos === "number"
      && pendingArmed.pos === currentPos
      && ctx.isDiagram()
    ) {
      ctx.armed = true;
    }
    if (ctx.selectionInside && editor.isEditable && !ctx.isDiagram()) {
      ctx.editing = true;
      ctx.rememberEditSession();
    }
    ctx.syncChrome();
    if (ctx.isDiagram()) {
      if (!ctx.restorePreviewFromCache()) ctx.renderPreview(ctx.currentNode.textContent);
    } else ctx.syncHighlight();
  }
  if (ctx.langPickerBusy()) rebindCodeLangPickerAnchor(ctx.buildLangPickerSession());

  ctx.editController = {
    commit: () => { if (ctx.editing) ctx.commitEdit(); },
    isActive: () => ctx.editing,
    hasSelection: () => Boolean(ctx.selectionInThisBlock()) || ctx.langPickerBusy(),
  };
  {
    let set = codeBlockEditControllers.get(editor);
    if (!set) {
      set = new Set();
      codeBlockEditControllers.set(editor, set);
    }
    set.add(ctx.editController);
  }

  return {
    dom,
    contentDOM: code,
    update: (updatedNode) => {
      if (updatedNode.type !== ctx.currentNode.type) return false;
      ctx.currentNode = updatedNode;
      if (ctx.editing) ctx.rememberEditSession();
      else if (ctx.armed) ctx.rememberArmedSession();
      ctx.syncChrome();
      if (ctx.langPickerBusy()) rebindCodeLangPickerAnchor(ctx.buildLangPickerSession());
      if (ctx.isDiagram()) {
        const src = String(updatedNode.textContent || "").replace(/\u00a0/g, " ").trimEnd();
        if (src !== ctx.lastSource) ctx.scheduleRender();
      } else {
        preview.innerHTML = "";
        ctx.lastSource = "";
        ctx.syncHighlight();
      }
      return true;
    },
    selectNode: () => {
      if (editor.isEditable && !ctx.editing) {
        if (ctx.isDiagram()) ctx.armExpandBar();
        else ctx.enterEdit();
      } else if (!ctx.isDiagram()) ctx.syncHighlight();
    },
    deselectNode: () => {
      if (ctx.langPickerBusy()) return;
      if (ctx.editing) {
        if (ctx.isEnteringEdit()) return;
        ctx.commitEdit({ keepSelection: true });
      } else if (!ctx.isDiagram()) ctx.syncHighlight();
    },
    stopEvent: (event) => {
      if (ctx.langPickerBusy()) {
        const type = event.type;
        if (type === "keydown" || type === "keyup" || type === "keypress" || type === "beforeinput" || type === "input" || type === "textInput") return true;
      }
      const target = event.target as Node | null;
      if (target && (langBar.contains(target) || deleteHint.contains(target) || actionBar.contains(target) || expandBar.contains(target))) return true;
      if (ctx.isDiagram()) {
        if (target && (editHint.contains(target) || preview.contains(target))) return true;
        if (!ctx.editing) {
          const type = event.type;
          if (
            type === "mousedown" || type === "mouseup" || type === "click" || type === "dblclick"
            || type === "pointerdown" || type === "pointerup" || type === "touchstart" || type === "touchend"
          ) {
            return true;
          }
        }
      }
      return false;
    },
    ignoreMutation: (mutation) => {
      const target = mutation.target as Node;
      if (target === sourceShell || target === sourceInner) return true;
      if (preview.contains(target)) return true;
      if (actionBar.contains(target)) return true;
      if (expandBar.contains(target)) return true;
      if (editHint.contains(target)) return true;
      if (deleteHint.contains(target)) return true;
      if (langBar.contains(target)) return true;
      if (highlightLayer.contains(target)) return true;
      if (code.contains(target)) return false;
      return true;
    },
    destroy: () => {
      ctx.stopSourceAnim();
      window.clearTimeout(ctx.debounceTimer);
      unbindDomEvents(ctx);
      window.clearTimeout(ctx.blurCommitTimer);
      codeBlockEditControllers.get(editor)?.delete(ctx.editController);
      ctx.renderToken += 1;
    },
  };
};
