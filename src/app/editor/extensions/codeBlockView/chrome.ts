// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { TextSelection } from "@tiptap/pm/state";
import { codeLanguageLabel, isDiagramLanguage } from "../../utils/codeLanguages";
import {
  isCodeLangPickerFor,
  openCodeLangPicker,
  rebindCodeLangPickerAnchor,
  syncCodeLangTrigger,
} from "../../utils/codeLangPicker";
import { toDiagramKind } from "../../utils/diagrams";
import { highlightCodeToHtml } from "../../utils/highlight";
import { codeBlockEditSessions } from "../codeBlockSessions";
import type { CodeBlockViewCtx } from "./types";

export function createChrome(ctx: CodeBlockViewCtx) {
  ctx.isDiagram = () => isDiagramLanguage(ctx.currentNode.attrs.language);
  ctx.isCommittedDiagram = () => isDiagramLanguage(ctx.currentNode.attrs.language);
  ctx.diagramKind = () => toDiagramKind(ctx.currentNode.attrs.language);
  ctx.langId = () => String(ctx.currentNode.attrs.language || "").toLowerCase();
  ctx.langPickerBusy = () => isCodeLangPickerFor(ctx.editor, ctx.getPos);
  ctx.nodeRange = () => {
    const pos = typeof ctx.getPos === "function" ? ctx.getPos() : null;
    if (typeof pos !== "number") return null;
    return { pos, size: ctx.currentNode.nodeSize };
  };
  ctx.readSource = () => String(ctx.code.innerText || ctx.currentNode.textContent || "").replace(/\u00a0/g, " ");
  ctx.focusAfterNode = () => {
    const range = ctx.nodeRange();
    if (!range) return;
    try {
      ctx.editor.chain().focus().command(({ state, dispatch }) => {
        const after = range.pos + range.size;
        const $after = state.doc.resolve(Math.min(after, state.doc.content.size));
        // 若块后无处落点（文档末尾），插入空段落再聚焦
        if (after >= state.doc.content.size) {
          const paragraph = state.schema.nodes.paragraph.create();
          let tr = state.tr.insert(after, paragraph);
          tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
          dispatch?.(tr);
          return true;
        }
        let sel = TextSelection.near($after, 1);
        if (sel.$from.parent.type.name === "codeBlock") {
          const paragraph = state.schema.nodes.paragraph.create();
          let tr = state.tr.insert(after, paragraph);
          tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
          dispatch?.(tr);
          return true;
        }
        if (dispatch) dispatch(state.tr.setSelection(sel));
        return true;
      }).run();
    } catch {
      try { ctx.editor.commands.focus(); } catch { /* ignore */ }
    }
  };
  ctx.selectionInThisBlock = (): boolean | null => {
    try {
      const range = ctx.nodeRange();
      if (!range) return null;
      const { from, to } = ctx.editor.state.selection;
      // 节点占 [pos, pos+size)；块后光标 from===pos+size 不算块内
      return from < range.pos + range.size && to > range.pos;
    } catch {
      return null;
    }
  };
  ctx.rememberEditSession = () => {
    const range = ctx.nodeRange();
    if (!range) return;
    codeBlockEditSessions.set(ctx.editor, {
      pos: range.pos,
      diagram: ctx.isCommittedDiagram(),
      sourceOpen: ctx.sourceOpen,
    });
  };
  ctx.clearEditSession = () => {
    codeBlockEditSessions.delete(ctx.editor);
  };
  ctx.buildLangPickerSession = () => ({
    editor: ctx.editor,
    getPos: ctx.getPos,
    getAnchor: () => ctx.langTrigger,
    // 输入过程不刷新预览；仅回车/点选 apply 后切换
    onBeforeApply: (nextId: string | null) => {
      const wasDiagram = ctx.isCommittedDiagram();
      const nextIsDiagram = isDiagramLanguage(nextId);
      if (wasDiagram && !nextIsDiagram) {
        // 图表 → 普通/未知语言：不渲染预览，只显示源码
        if (!ctx.editing) {
          ctx.editing = true;
        }
        ctx.renderToken += 1;
        window.clearTimeout(ctx.debounceTimer);
        ctx.stopSourceAnim();
        ctx.sourceCollapsing = false;
        ctx.sourceOpen = true;
        ctx.resetSourceShellStyle();
        ctx.preview.style.display = "none";
        ctx.preview.innerHTML = "";
        ctx.lastSource = "";
        ctx.rememberEditSession();
      } else if (!wasDiagram && nextIsDiagram) {
        if (!ctx.editing) {
          ctx.editing = true;
        }
        ctx.renderToken += 1;
        window.clearTimeout(ctx.debounceTimer);
        ctx.lastSource = "";
        ctx.rememberEditSession();
      } else if (wasDiagram && nextIsDiagram) {
        ctx.renderToken += 1;
        window.clearTimeout(ctx.debounceTimer);
        ctx.lastSource = "";
        if (ctx.editing) ctx.rememberEditSession();
      } else if (ctx.editing) {
        ctx.rememberEditSession();
      }
    },
    onAfterApply: () => {
      requestAnimationFrame(() => {
        ctx.syncChrome();
        if (ctx.isDiagram()) ctx.scheduleRender();
        else ctx.syncHighlight();
      });
    },
  });
  ctx.openLangPicker = () => {
    if (!ctx.editor.isEditable) return;
    if (!ctx.editing) ctx.enterEdit({ focusSource: false });
    ctx.dom.classList.add("is-lang-open");
    openCodeLangPicker(ctx.buildLangPickerSession());
    ctx.syncChrome();
  };
  ctx.syncLangPicker = () => {
    const diagram = ctx.isDiagram();
    const busy = ctx.langPickerBusy();
    const plainEditing = !diagram && ctx.editor.isEditable && ctx.editing;
    const show = diagram ? ctx.editing : plainEditing || busy;
    syncCodeLangTrigger(ctx.langTrigger, ctx.currentNode.attrs.language);
    ctx.langBar.style.display = show ? "flex" : "none";
    if (busy) {
      ctx.dom.classList.add("is-lang-open");
      rebindCodeLangPickerAnchor(ctx.buildLangPickerSession());
    } else {
      ctx.dom.classList.remove("is-lang-open");
    }
  };
  ctx.syncHighlight = () => {
    if (ctx.isDiagram()) {
      ctx.highlightLayer.style.display = "none";
      ctx.highlightLayer.innerHTML = "";
      ctx.code.style.color = "";
      ctx.code.style.caretColor = "";
      return;
    }
    const lang = ctx.langId();
    const inside = ctx.selectionInThisBlock();
    if (inside !== null) ctx.selectionInside = inside;
    const shouldHighlight = Boolean(lang) && !ctx.selectionInside;
    if (!shouldHighlight) {
      ctx.highlightLayer.style.display = "none";
      ctx.code.style.color = "";
      ctx.code.style.caretColor = "";
      return;
    }
    const source = ctx.readSource();
    ctx.highlightLayer.innerHTML = highlightCodeToHtml(source, lang);
    ctx.highlightLayer.style.display = "block";
    ctx.code.style.color = "transparent";
    ctx.code.style.caretColor = "#3F4046";
  };
  ctx.syncExpandBar = () => {
    const diagram = ctx.isDiagram();
    const show = diagram && ctx.editor.isEditable && !ctx.editing && ctx.armed;
    ctx.expandBarLabel.textContent = codeLanguageLabel(ctx.currentNode.attrs.language);
    ctx.expandBar.setAttribute("aria-hidden", show ? "false" : "true");
    ctx.expandBar.tabIndex = show ? 0 : -1;
    if (show) ctx.dom.classList.add("is-armed");
    else ctx.dom.classList.remove("is-armed");
  };
  ctx.syncChrome = () => {
    const diagram = ctx.isDiagram();
    const showSource = diagram ? (ctx.editor.isEditable && (ctx.editing || ctx.sourceCollapsing)) : true;
    const inside = ctx.selectionInThisBlock();
    if (inside !== null) ctx.selectionInside = inside;
    const busy = ctx.langPickerBusy();
    // 普通代码块：编辑态才显示底栏（语言）
    const plainEditing = !diagram && ctx.editor.isEditable && ctx.editing;
    if (diagram) {
      const modeClass = showSource ? " is-editing" : " is-preview";
      const armedClass = !showSource && ctx.armed ? " is-armed" : "";
      const openClass = showSource && ctx.sourceOpen ? " is-source-open" : "";
      ctx.dom.className = `doc-code-block-wrap doc-diagram${modeClass}${armedClass}${openClass}`;
    } else {
      ctx.armed = false;
      ctx.dom.className = `doc-code-block-wrap${plainEditing ? " is-plain-editing" : ""}`;
    }
    if (busy) ctx.dom.classList.add("is-lang-open");
    ctx.dom.style.position = "relative";
    ctx.pre.className = diagram ? "doc-code-block doc-diagram-source" : "doc-code-block";
    const showActionBar = (diagram && showSource) || plainEditing || (!diagram && busy);
    ctx.actionBar.style.setProperty("display", showActionBar ? "flex" : "none", "important");
    ctx.editHint.style.setProperty("display", "none", "important");
    // 失焦态右上角「删除」（普通未编辑 / 图表预览）
    const showDelete = ctx.editor.isEditable && !showActionBar && (!diagram || !showSource);
    ctx.deleteHint.style.setProperty("display", showDelete ? "inline-flex" : "none", "important");
    const langAttr = ctx.currentNode.attrs.language;
    if (langAttr) {
      const lang = String(langAttr);
      ctx.pre.setAttribute("data-language", lang);
      ctx.code.className = `language-${lang}`;
      ctx.code.setAttribute("data-language", lang);
    } else {
      ctx.pre.removeAttribute("data-language");
      ctx.code.className = "";
      ctx.code.removeAttribute("data-language");
    }
    if (ctx.langBar.parentElement !== ctx.actionBar) ctx.actionBar.appendChild(ctx.langBar);
    ctx.syncLangPicker();
    ctx.syncExpandBar();
    if (!diagram) {
      ctx.stopSourceAnim();
      ctx.sourceCollapsing = false;
      ctx.sourceOpen = true;
      ctx.resetSourceShellStyle();
      ctx.preview.style.display = "none";
      ctx.preview.innerHTML = "";
      ctx.lastSource = "";
      ctx.syncHighlight();
      return;
    }
    ctx.highlightLayer.style.display = "none";
    ctx.highlightLayer.innerHTML = "";
    ctx.code.style.color = "";
    ctx.code.style.caretColor = "";
    ctx.preview.style.display = "block";
    ctx.preview.style.cursor = ctx.editor.isEditable && !showSource ? "pointer" : "default";
    // 仅在缺预览时渲染；武装/展开 chrome 切换不得触发重载
    if (!ctx.previewIsFresh()) ctx.scheduleRender();
  };
}
