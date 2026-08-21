// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { TextSelection } from "@tiptap/pm/state";
import { codeLanguageLabel, isDiagramLanguage } from "../utils/codeLanguages";
import {
  closeCodeLangPicker,
  isCodeLangPickerFor,
  openCodeLangPicker,
  rebindCodeLangPickerAnchor,
  syncCodeLangTrigger,
} from "../utils/codeLangPicker";
import { renderDiagramSourceToHtml, toDiagramKind } from "../utils/diagrams";
import { highlightCodeToHtml } from "../utils/highlight";
import {
  codeBlockArmedSessions,
  codeBlockEditControllers,
  codeBlockEditSessions,
  codeBlockPreviewCache,
} from "./codeBlockSessions";

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
  let currentNode = node;
  // 编辑态：进入后实时写入文档；失焦/离开块时自动保存并退出
  let editing = false;
  // 图表预览态：点击预览先「武装」出 20px 下拉条，再点条才展开源码
  let armed = false;
  let renderToken = 0;
  let lastSource = "";
  let debounceTimer = 0;
  let selectionInside = false;
  /** 点条进入编辑后短暂加锁，避免 deselect/selectionUpdate/blur 立刻 commit 收回 */
  let editLockUntil = 0;
  const SOURCE_EXPAND_MS = 280;
  let sourceAnimToken = 0;
  let sourceAnimTimer = 0;
  /** 收起过程中保持 is-editing chrome，避免 syncChrome 把高度瞬间归零 */
  let sourceCollapsing = false;
  /** 源码区已完全展开。false 时 CSS 为 height:0；动画用 inline 像素高度 */
  let sourceOpen = false;
  let pendingFocusAfterExpand = false;
  const lockEnteringEdit = () => {
    editLockUntil = Date.now() + SOURCE_EXPAND_MS + 80;
  };
  const isEnteringEdit = () => Date.now() < editLockUntil;
  const prefersReducedMotion = () =>
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  const afterPaint = (fn: () => void) => {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  };
  const resetSourceShellStyle = () => {
    sourceShell.style.transition = "";
    sourceShell.style.height = "";
  };
  const stopSourceAnim = () => {
    sourceAnimToken += 1;
    window.clearTimeout(sourceAnimTimer);
    sourceCollapsing = false;
  };
  const waitHeightTransition = (token: number, onDone: () => void) => {
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      sourceShell.removeEventListener("transitionend", onEnd);
      window.clearTimeout(sourceAnimTimer);
      if (token !== sourceAnimToken) return;
      onDone();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== sourceShell || event.propertyName !== "height") return;
      finish();
    };
    sourceShell.addEventListener("transitionend", onEnd);
    sourceAnimTimer = window.setTimeout(finish, SOURCE_EXPAND_MS + 80);
  };
  const finishExpandOpen = () => {
    sourceOpen = true;
    resetSourceShellStyle();
    rememberEditSession();
    syncChrome();
    if (pendingFocusAfterExpand) {
      pendingFocusAfterExpand = false;
      placeCaretInSource();
    }
  };
  const expandSourceShell = () => {
    if (prefersReducedMotion()) {
      finishExpandOpen();
      return;
    }
    const token = ++sourceAnimToken;
    window.clearTimeout(sourceAnimTimer);
    sourceOpen = false;
    sourceShell.style.transition = "none";
    sourceShell.style.height = "0px";
    syncChrome();
    afterPaint(() => {
      if (token !== sourceAnimToken || !editing) return;
      sourceShell.style.transition = "none";
      sourceShell.style.height = "auto";
      const to = Math.max(sourceShell.scrollHeight, sourceInner.scrollHeight, 1);
      sourceShell.style.height = "0px";
      void sourceShell.offsetHeight;
      sourceShell.style.transition = `height ${SOURCE_EXPAND_MS}ms ease`;
      sourceShell.style.height = `${to}px`;
      waitHeightTransition(token, () => {
        if (!editing) return;
        finishExpandOpen();
      });
    });
  };
  const collapseSourceShell = (after: () => void) => {
    const finish = () => {
      sourceCollapsing = false;
      sourceOpen = false;
      sourceShell.style.transition = "none";
      sourceShell.style.height = "0px";
      after();
      resetSourceShellStyle();
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    const from = sourceShell.getBoundingClientRect().height || sourceInner.scrollHeight;
    if (from <= 0.5) {
      finish();
      return;
    }
    sourceCollapsing = true;
    sourceOpen = true;
    const token = ++sourceAnimToken;
    window.clearTimeout(sourceAnimTimer);
    sourceShell.style.transition = "none";
    sourceShell.style.height = `${from}px`;
    syncChrome();
    afterPaint(() => {
      if (token !== sourceAnimToken) return;
      sourceShell.style.transition = `height ${SOURCE_EXPAND_MS}ms ease`;
      sourceShell.style.height = "0px";
      waitHeightTransition(token, finish);
    });
  };
  const isDiagram = () => isDiagramLanguage(currentNode.attrs.language);
  const isCommittedDiagram = () => isDiagramLanguage(currentNode.attrs.language);
  const diagramKind = () => toDiagramKind(currentNode.attrs.language);
  const langId = () => String(currentNode.attrs.language || "").toLowerCase();
  const langPickerBusy = () => isCodeLangPickerFor(editor, getPos);

  const nodeRange = () => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (typeof pos !== "number") return null;
    return { pos, size: currentNode.nodeSize };
  };

  const readSource = () => String(code.innerText || currentNode.textContent || "").replace(/\u00a0/g, " ");

  const focusAfterNode = () => {
    const range = nodeRange();
    if (!range) return;
    try {
      editor.chain().focus().command(({ state, dispatch }) => {
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
      try { editor.commands.focus(); } catch { /* ignore */ }
    }
  };

  /** true=在块内，false=明确在块外，null=位置未知（勿当离开） */
  const selectionInThisBlock = (): boolean | null => {
    try {
      const range = nodeRange();
      if (!range) return null;
      const { from, to } = editor.state.selection;
      // 节点占 [pos, pos+size)；块后光标 from===pos+size 不算块内
      return from < range.pos + range.size && to > range.pos;
    } catch {
      return null;
    }
  };

  const rememberEditSession = () => {
    const range = nodeRange();
    if (!range) return;
    codeBlockEditSessions.set(editor, {
      pos: range.pos,
      diagram: isCommittedDiagram(),
      sourceOpen,
    });
  };

  const clearEditSession = () => {
    codeBlockEditSessions.delete(editor);
  };

  const buildLangPickerSession = () => ({
    editor,
    getPos,
    getAnchor: () => langTrigger,
    // 输入过程不刷新预览；仅回车/点选 apply 后切换
    onBeforeApply: (nextId: string | null) => {
      const wasDiagram = isCommittedDiagram();
      const nextIsDiagram = isDiagramLanguage(nextId);
      if (wasDiagram && !nextIsDiagram) {
        // 图表 → 普通：保持编辑态，会话标记为普通
        if (!editing) {
          editing = true;
        }
        renderToken += 1;
        window.clearTimeout(debounceTimer);
        preview.style.display = "none";
        preview.innerHTML = "";
        lastSource = "";
        rememberEditSession();
      } else if (!wasDiagram && nextIsDiagram) {
        if (!editing) {
          editing = true;
        }
        renderToken += 1;
        window.clearTimeout(debounceTimer);
        lastSource = "";
        rememberEditSession();
      } else if (wasDiagram && nextIsDiagram) {
        renderToken += 1;
        window.clearTimeout(debounceTimer);
        lastSource = "";
        if (editing) rememberEditSession();
      } else if (editing) {
        rememberEditSession();
      }
    },
    onAfterApply: () => {
      requestAnimationFrame(() => {
        syncChrome();
        if (isDiagram()) scheduleRender();
        else syncHighlight();
      });
    },
  });

  const openLangPicker = () => {
    if (!editor.isEditable) return;
    if (!editing) enterEdit({ focusSource: false });
    dom.classList.add("is-lang-open");
    openCodeLangPicker(buildLangPickerSession());
    syncChrome();
  };

  const syncLangPicker = () => {
    const diagram = isDiagram();
    const busy = langPickerBusy();
    const plainEditing = !diagram && editor.isEditable && editing;
    const show = diagram ? editing : plainEditing || busy;
    syncCodeLangTrigger(langTrigger, currentNode.attrs.language);
    langBar.style.display = show ? "flex" : "none";
    if (busy) {
      dom.classList.add("is-lang-open");
      rebindCodeLangPickerAnchor(buildLangPickerSession());
    } else {
      dom.classList.remove("is-lang-open");
    }
  };

  const syncHighlight = () => {
    if (isDiagram()) {
      highlightLayer.style.display = "none";
      highlightLayer.innerHTML = "";
      code.style.color = "";
      code.style.caretColor = "";
      return;
    }
    const lang = langId();
    const inside = selectionInThisBlock();
    if (inside !== null) selectionInside = inside;
    const shouldHighlight = Boolean(lang) && !selectionInside;
    if (!shouldHighlight) {
      highlightLayer.style.display = "none";
      code.style.color = "";
      code.style.caretColor = "";
      return;
    }
    const source = readSource();
    highlightLayer.innerHTML = highlightCodeToHtml(source, lang);
    highlightLayer.style.display = "block";
    code.style.color = "transparent";
    code.style.caretColor = "#3F4046";
  };

  const syncExpandBar = () => {
    const diagram = isDiagram();
    const show = diagram && editor.isEditable && !editing && armed;
    expandBarLabel.textContent = codeLanguageLabel(currentNode.attrs.language);
    expandBar.setAttribute("aria-hidden", show ? "false" : "true");
    expandBar.tabIndex = show ? 0 : -1;
    if (show) dom.classList.add("is-armed");
    else dom.classList.remove("is-armed");
  };

  const syncChrome = () => {
    const diagram = isDiagram();
    const showSource = diagram ? (editor.isEditable && (editing || sourceCollapsing)) : true;
    const inside = selectionInThisBlock();
    if (inside !== null) selectionInside = inside;
    const busy = langPickerBusy();
    // 普通代码块：编辑态才显示底栏（语言）
    const plainEditing = !diagram && editor.isEditable && editing;
    if (diagram) {
      const modeClass = showSource ? " is-editing" : " is-preview";
      const armedClass = !showSource && armed ? " is-armed" : "";
      const openClass = showSource && sourceOpen ? " is-source-open" : "";
      dom.className = `doc-code-block-wrap doc-diagram${modeClass}${armedClass}${openClass}`;
    } else {
      armed = false;
      dom.className = `doc-code-block-wrap${plainEditing ? " is-plain-editing" : ""}`;
    }
    if (busy) dom.classList.add("is-lang-open");
    dom.style.position = "relative";
    pre.className = diagram ? "doc-code-block doc-diagram-source" : "doc-code-block";
    const showActionBar = (diagram && showSource) || plainEditing || (!diagram && busy);
    actionBar.style.setProperty("display", showActionBar ? "flex" : "none", "important");
    editHint.style.setProperty("display", "none", "important");
    // 失焦态右上角「删除」（普通未编辑 / 图表预览）
    const showDelete = editor.isEditable && !showActionBar && (!diagram || !showSource);
    deleteHint.style.setProperty("display", showDelete ? "inline-flex" : "none", "important");
    const langAttr = currentNode.attrs.language;
    if (langAttr) {
      const lang = String(langAttr);
      pre.setAttribute("data-language", lang);
      code.className = `language-${lang}`;
      code.setAttribute("data-language", lang);
    } else {
      pre.removeAttribute("data-language");
      code.className = "";
      code.removeAttribute("data-language");
    }
    if (langBar.parentElement !== actionBar) actionBar.appendChild(langBar);
    syncLangPicker();
    syncExpandBar();
    if (!diagram) {
      preview.style.display = "none";
      preview.innerHTML = "";
      lastSource = "";
      syncHighlight();
      return;
    }
    highlightLayer.style.display = "none";
    highlightLayer.innerHTML = "";
    code.style.color = "";
    code.style.caretColor = "";
    preview.style.display = "block";
    preview.style.cursor = editor.isEditable && !showSource ? "pointer" : "default";
    // 仅在缺预览时渲染；武装/展开 chrome 切换不得触发重载
    if (!previewIsFresh()) scheduleRender();
  };

  const normalizePreviewSource = (source: string) =>
    String(source || "").replace(/\u00a0/g, " ").trimEnd();

  const previewCacheKey = () => {
    const range = nodeRange();
    return range ? range.pos : null;
  };

  const writePreviewCache = (source: string, html: string) => {
    const pos = previewCacheKey();
    if (pos === null) return;
    let map = codeBlockPreviewCache.get(editor);
    if (!map) {
      map = new Map();
      codeBlockPreviewCache.set(editor, map);
    }
    map.set(pos, { source, html });
  };

  const readPreviewCache = (source: string) => {
    const pos = previewCacheKey();
    if (pos === null) return null;
    const hit = codeBlockPreviewCache.get(editor)?.get(pos);
    if (!hit || hit.source !== source || !hit.html) return null;
    return hit;
  };

  const applyPreviewHtml = (html: string) => {
    preview.className = "doc-diagram-preview";
    preview.innerHTML = html;
    preview.querySelectorAll("svg").forEach((svgEl) => {
      svgEl.removeAttribute("height");
      (svgEl as SVGElement).style.maxWidth = "100%";
      (svgEl as SVGElement).style.height = "auto";
      (svgEl as SVGElement).style.display = "block";
      (svgEl as SVGElement).style.margin = "0 auto";
      (svgEl as SVGElement).style.pointerEvents = "none";
    });
  };

  const previewIsFresh = (source?: string) => {
    const trimmed = normalizePreviewSource(source ?? readSource());
    return Boolean(trimmed) && trimmed === lastSource && Boolean(preview.querySelector("svg"));
  };

  const restorePreviewFromCache = () => {
    const trimmed = normalizePreviewSource(readSource());
    if (!trimmed.trim()) return false;
    if (previewIsFresh(trimmed)) return true;
    const hit = readPreviewCache(trimmed);
    if (!hit) return false;
    lastSource = trimmed;
    applyPreviewHtml(hit.html);
    return true;
  };

  const renderPreview = (source: string) => {
    const kind = diagramKind();
    if (!kind) return;
    const trimmed = normalizePreviewSource(source);
    if (!trimmed.trim()) {
      preview.className = "doc-diagram-preview";
      preview.textContent = editing ? "输入图表源码以预览" : "点击编辑图表";
      lastSource = "";
      return;
    }
    if (previewIsFresh(trimmed)) return;
    const cached = readPreviewCache(trimmed);
    if (cached) {
      lastSource = trimmed;
      applyPreviewHtml(cached.html);
      return;
    }
    const token = ++renderToken;
    preview.className = "doc-diagram-preview";
    if (!preview.querySelector("svg")) preview.textContent = "图表渲染中…";
    const label = kind === "flow" ? "Flowchart" : kind === "sequence" ? "Sequence" : "Mermaid";
    void renderDiagramSourceToHtml(kind, trimmed).then((html) => {
      if (token !== renderToken || !isDiagram()) return;
      lastSource = trimmed;
      applyPreviewHtml(html);
      writePreviewCache(trimmed, html);
    }).catch((error) => {
      if (token !== renderToken || !isDiagram()) return;
      lastSource = "";
      preview.className = "doc-diagram-preview doc-diagram-error";
      preview.textContent = `${label} 渲染失败：${error instanceof Error ? error.message : "语法错误"}`;
    });
  };

  const scheduleRender = () => {
    // 源码未变且已有 SVG：跳过，避免点展开条时底部图表闪烁重载
    if (previewIsFresh() || restorePreviewFromCache()) return;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      renderPreview(readSource());
    }, 160);
  };

  const placeCaretInSource = () => {
    const range = nodeRange();
    if (!range) return;
    const end = Math.max(range.pos + 1, range.pos + range.size - 1);
    try {
      editor.chain().focus().setTextSelection(end).run();
    } catch {
      try { editor.commands.focus(); } catch { /* ignore */ }
    }
  };

  const enterEdit = (opts?: { focusSource?: boolean }) => {
    if (!editor.isEditable) return;
    if (editing) {
      if (opts?.focusSource !== false) placeCaretInSource();
      return;
    }
    const range = nodeRange();
    if (!range) return;
    const shouldAnimateExpand = isDiagram();
    sourceCollapsing = false;
    sourceOpen = !shouldAnimateExpand;
    pendingFocusAfterExpand = shouldAnimateExpand && opts?.focusSource !== false;
    editing = true;
    armed = false;
    clearArmedSession();
    if (isDiagram()) {
      // 取消进行中的预览渲染，避免异步回调把界面打回预览态
      renderToken += 1;
      window.clearTimeout(debounceTimer);
    }
    rememberEditSession();
    // 先切 is-editing 但保持 height:0；展开完成后再落点，避免 NodeView 重建跳过动画
    lockEnteringEdit();
    syncChrome();
    if (shouldAnimateExpand) expandSourceShell();
    else if (opts?.focusSource !== false) placeCaretInSource();
  };

  const rememberArmedSession = () => {
    const range = nodeRange();
    if (!range) return;
    codeBlockArmedSessions.set(editor, { pos: range.pos });
  };

  const clearArmedSession = () => {
    codeBlockArmedSessions.delete(editor);
  };

  /** 图表预览：显示 20px 下拉条，不进入源码编辑 */
  const armExpandBar = () => {
    if (!editor.isEditable || !isDiagram() || editing || sourceCollapsing) return;
    if (armed) {
      rememberArmedSession();
      syncExpandBar();
      return;
    }
    armed = true;
    rememberArmedSession();
    syncChrome();
  };

  const disarmExpandBar = () => {
    if (!armed) return;
    armed = false;
    clearArmedSession();
    syncChrome();
  };

  /** 保存当前内容并退出编辑；keepSelection=true 时不挪动光标（失焦到正文时用） */
  const commitEdit = (opts?: { keepSelection?: boolean }) => {
    if (!editing) {
      disarmExpandBar();
      return;
    }
    if (isEnteringEdit()) return;
    const wasDiagram = isDiagram();
    if (wasDiagram) sourceCollapsing = true;
    editing = false;
    armed = false;
    editLockUntil = 0;
    clearArmedSession();
    if (langPickerBusy()) closeCodeLangPicker();
    clearEditSession();
    if (!opts?.keepSelection) focusAfterNode();
    const finishChrome = () => {
      sourceCollapsing = false;
      syncChrome();
      if (wasDiagram) scheduleRender();
      else syncHighlight();
    };
    if (wasDiagram) collapseSourceShell(finishChrome);
    else finishChrome();
  };

  const stopPointer = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onEnterPointer = (event: Event) => {
    if (!editor.isEditable || editing) return;
    const target = event.target as Node | null;
    if (target && (actionBar.contains(target) || langBar.contains(target) || deleteHint.contains(target))) return;
    if (target && expandBar.contains(target)) return;
    if (isDiagram()) {
      if (target && (pre.contains(target) || code.contains(target))) return;
      stopPointer(event);
      // 图表：点预览先出 20px 条，不直接展开源码
      armExpandBar();
      return;
    }
    // 普通代码块：点进源码区域即进入编辑态
    if (target && (pre.contains(target) || code.contains(target) || highlightLayer.contains(target))) {
      enterEdit({ focusSource: false });
    }
  };

  const onExpandBarPointer = (event: Event) => {
    stopPointer(event);
    if (event.type !== "mousedown") return;
    if (!editor.isEditable || editing) return;
    enterEdit();
  };

  const deleteBlock = () => {
    const range = nodeRange();
    if (!range || !editor.isEditable) return;
    if (langPickerBusy()) closeCodeLangPicker();
    editing = false;
    armed = false;
    clearArmedSession();
    clearEditSession();
    editor.chain().focus().deleteRange({ from: range.pos, to: range.pos + range.size }).run();
  };

  const removeBlock = (event: Event) => {
    stopPointer(event);
    if (!editor.isEditable) return;
    if (langPickerBusy()) closeCodeLangPicker();
    const range = nodeRange();
    if (!range) return;
    editing = false;
    armed = false;
    clearArmedSession();
    clearEditSession();
    editor.chain().focus().deleteRange({ from: range.pos, to: range.pos + range.size }).run();
  };

  const onSelectionUpdate = () => {
    const next = selectionInThisBlock();
    if (next === null) return;
    const wasInside = selectionInside;
    selectionInside = next;
    // 选区离开代码块：编辑中则提交；武装条改由外部点击收起，避免点预览瞬间误关
    if (!next) {
      if (editing) {
        if (isEnteringEdit()) return;
        commitEdit({ keepSelection: true });
        return;
      }
      if (armed) return;
    }
    if (langPickerBusy()) {
      syncChrome();
      if (!isDiagram()) syncHighlight();
      return;
    }
    // 普通代码块：进入块内选区时自动进入编辑态；图表仍靠预览点击
    if (next && !editing && editor.isEditable && !isDiagram()) {
      enterEdit({ focusSource: false });
      return;
    }
    if (isDiagram()) {
      if (editing) syncLangPicker();
      else syncExpandBar();
      return;
    }
    if (editing) {
      syncLangPicker();
      syncHighlight();
      return;
    }
    if (next !== wasInside) syncChrome();
    else {
      syncLangPicker();
      syncHighlight();
    }
  };

  const onDocPointerDown = (event: Event) => {
    if (!armed || editing) return;
    const target = event.target as Node | null;
    if (target && dom.contains(target)) return;
    disarmExpandBar();
  };

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
  expandBar.addEventListener("mousedown", onExpandBarPointer);
  expandBar.addEventListener("click", onExpandBarPointer);

  deleteHint.type = "button";
  deleteHint.className = "doc-code-delete-hint";
  deleteHint.textContent = "删除";
  deleteHint.contentEditable = "false";
  deleteHint.addEventListener("mousedown", stopPointer);
  deleteHint.addEventListener("click", (event) => {
    stopPointer(event);
    deleteBlock();
  });

  actionBar.className = "doc-code-actionbar";
  actionBar.contentEditable = "false";
  // 仅语言选择：靠右（原左侧为确定/取消）
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
  syncCodeLangTrigger(langTrigger, currentNode.attrs.language);
  // preventDefault：避免按钮抢焦点导致语言输入框立刻 blur 关闭
  langTrigger.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openLangPicker();
  });
  langTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  langBar.appendChild(langTrigger);
  actionBar.appendChild(langBar);

  // 捕获阶段拦截，避免 ProseMirror 抢先处理导致无法进入编辑
  dom.addEventListener("pointerdown", onEnterPointer, true);
  dom.addEventListener("mousedown", onEnterPointer, true);
  editHint.addEventListener("click", onEnterPointer);
  preview.addEventListener("click", onEnterPointer);
  document.addEventListener("pointerdown", onDocPointerDown, true);
  let blurCommitTimer = 0;
  const onEditorBlur = () => {
    // 点到编辑器外：自动保存并退出（语言选择器 portal 除外）
    // 武装条不在此收起：点预览常带 preventDefault，易误触发 blur；改由 document pointerdown 收起
    window.clearTimeout(blurCommitTimer);
    blurCommitTimer = window.setTimeout(() => {
      if (!editing || isEnteringEdit()) return;
      if (langPickerBusy()) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest?.(".doc-code-lang-portal, .doc-code-lang-menu")) return;
      if (active && (dom.contains(active) || actionBar.contains(active) || expandBar.contains(active))) return;
      if (!editor.isFocused) {
        commitEdit({ keepSelection: true });
      }
    }, 120);
  };

  // 仅 selectionUpdate 检测「离开块」；勿绑 transaction，否则输入时会误判退出
  editor.on("selectionUpdate", onSelectionUpdate);
  editor.on("blur", onEditorBlur);

  pre.addEventListener("keydown", (event) => {
    if (!editing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      commitEdit();
    }
  });

  code.addEventListener("input", () => {
    if (isDiagram() && editing) scheduleRender();
  });
  code.addEventListener("keyup", () => {
    if (isDiagram() && editing) scheduleRender();
  });

  // 勿给 pre 设 contentEditable：会与 ProseMirror contentDOM 嵌套冲突，导致粘贴失效
  pre.appendChild(highlightLayer);
  pre.appendChild(code);
  sourceInner.className = "doc-diagram-source-inner";
  sourceInner.appendChild(pre);
  sourceInner.appendChild(actionBar);
  sourceShell.className = "doc-diagram-source-shell";
  sourceShell.appendChild(sourceInner);
  // 普通：源码壳；图表预览：展开条 → 源码壳(折叠) → 预览；编辑：源码壳展开
  dom.appendChild(expandBar);
  dom.appendChild(sourceShell);
  dom.appendChild(preview);
  dom.appendChild(editHint);
  dom.appendChild(deleteHint);
  code.textContent = currentNode.textContent;

  // NodeView 重建时按位置恢复未结束的编辑会话 / 武装条
  const pendingSession = codeBlockEditSessions.get(editor);
  const pendingArmed = codeBlockArmedSessions.get(editor);
  const currentPos = typeof getPos === "function" ? getPos() : null;
  if (
    pendingSession
    && editor.isEditable
    && typeof currentPos === "number"
    && pendingSession.pos === currentPos
  ) {
    editing = true;
    armed = false;
    sourceOpen = pendingSession.sourceOpen !== false;
    selectionInside = selectionInThisBlock() ?? true;
    if (isDiagram() && !sourceOpen) {
      pendingFocusAfterExpand = true;
      lockEnteringEdit();
      syncChrome();
      expandSourceShell();
    } else {
      sourceOpen = true;
      syncChrome();
      requestAnimationFrame(() => {
        if (!editing) return;
        placeCaretInSource();
      });
    }
  } else {
    selectionInside = selectionInThisBlock() ?? false;
    if (
      pendingArmed
      && editor.isEditable
      && typeof currentPos === "number"
      && pendingArmed.pos === currentPos
      && isDiagram()
    ) {
      armed = true;
    }
    if (selectionInside && editor.isEditable && !isDiagram()) {
      editing = true;
      rememberEditSession();
    }
    syncChrome();
    if (isDiagram()) {
      if (!restorePreviewFromCache()) renderPreview(currentNode.textContent);
    } else syncHighlight();
  }
  if (langPickerBusy()) rebindCodeLangPickerAnchor(buildLangPickerSession());

  const editController = {
    commit: () => { if (editing) commitEdit(); },
    isActive: () => editing,
    hasSelection: () => Boolean(selectionInThisBlock()) || langPickerBusy(),
  };
  {
    let set = codeBlockEditControllers.get(editor);
    if (!set) {
      set = new Set();
      codeBlockEditControllers.set(editor, set);
    }
    set.add(editController);
  }

  return {
    dom,
    contentDOM: code,
    update: (updatedNode) => {
      if (updatedNode.type !== currentNode.type) return false;
      currentNode = updatedNode;
      if (editing) rememberEditSession();
      else if (armed) rememberArmedSession();
      syncChrome();
      if (langPickerBusy()) rebindCodeLangPickerAnchor(buildLangPickerSession());
      if (isDiagram()) {
        const src = String(updatedNode.textContent || "").replace(/\u00a0/g, " ").trimEnd();
        if (src !== lastSource) scheduleRender();
      } else {
        preview.innerHTML = "";
        lastSource = "";
        syncHighlight();
      }
      return true;
    },
    selectNode: () => {
      if (editor.isEditable && !editing) {
        // 图表：节点选中只武装下拉条；普通代码块直接进编辑
        if (isDiagram()) armExpandBar();
        else enterEdit();
      } else if (!isDiagram()) syncHighlight();
    },
    deselectNode: () => {
      if (editing) {
        if (isEnteringEdit()) return;
        commitEdit({ keepSelection: true });
      }
      // 武装条不在此收起：点预览后选区常立刻离开节点，会误关；改由外部 pointerdown 收起
      else if (!isDiagram()) syncHighlight();
    },
    stopEvent: (event) => {
      const target = event.target as Node | null;
      if (target && (langBar.contains(target) || deleteHint.contains(target) || actionBar.contains(target) || expandBar.contains(target))) return true;
      if (isDiagram()) {
        if (target && (editHint.contains(target) || preview.contains(target))) return true;
        if (!editing) {
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
      // 不在此关闭共享语言选择器：聚焦输入会触发 NodeView 重建，菜单需靠 rebind 存活
      stopSourceAnim();
      window.clearTimeout(debounceTimer);
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("blur", onEditorBlur);
      window.clearTimeout(blurCommitTimer);
      dom.removeEventListener("pointerdown", onEnterPointer, true);
      dom.removeEventListener("mousedown", onEnterPointer, true);
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      preview.removeEventListener("click", onEnterPointer);
      editHint.removeEventListener("click", onEnterPointer);
      expandBar.removeEventListener("mousedown", onExpandBarPointer);
      expandBar.removeEventListener("click", onExpandBarPointer);
      codeBlockEditControllers.get(editor)?.delete(editController);
      renderToken += 1;
    },
  };
};
