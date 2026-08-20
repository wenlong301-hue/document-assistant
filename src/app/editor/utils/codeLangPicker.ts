import { TextSelection } from "@tiptap/pm/state";
import { CODE_LANGUAGE_OPTIONS, codeLanguageLabel } from "./codeLanguages";

export type CodeLangPickerSession = {
  editor: any;
  getPos: () => number | undefined | null;
  getAnchor: () => HTMLElement | null;
  /** 选语言后回调（用于图表编辑态等本地状态） */
  onBeforeApply?: (nextId: string | null, prevId: string) => void;
  onAfterApply?: (nextId: string | null) => void;
  /** 关闭选择器（Esc / 点外 / 已 apply） */
  onDraftEnd?: () => void;
};

type SharedPicker = {
  portal: HTMLDivElement;
  input: HTMLInputElement;
  menu: HTMLDivElement;
  list: HTMLDivElement;
  empty: HTMLDivElement;
  session: CodeLangPickerSession | null;
  open: boolean;
};

let shared: SharedPicker | null = null;
let suppressOutsideCloseUntil = 0;
/** 当前键盘高亮项在「可见列表」中的下标；-1 表示无 */
let highlightIndex = -1;

const stop = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
};

/** 回车且列表无匹配时：精确命中用选项 id，否则原样应用输入（支持自定义类型） */
const resolveLangInput = (raw: string) => {
  const q = String(raw || "").trim().toLowerCase();
  if (!q || q === "纯文本" || q === "plaintext" || q === "plain text" || q === "text") return "";
  const byId = CODE_LANGUAGE_OPTIONS.find((opt) => opt.id.toLowerCase() === q);
  if (byId) return byId.id;
  const byLabel = CODE_LANGUAGE_OPTIONS.find((opt) => opt.label.toLowerCase() === q);
  if (byLabel) return byLabel.id;
  return q;
};

const currentLangId = (session: CodeLangPickerSession | null) => {
  if (!session) return "";
  try {
    const pos = session.getPos();
    if (typeof pos !== "number") return "";
    const node = session.editor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== "codeBlock") return "";
    return String(node.attrs.language || "").toLowerCase();
  } catch {
    return "";
  }
};

const visibleItems = (picker: SharedPicker) =>
  Array.from(picker.list.querySelectorAll(".doc-code-lang-item")).filter(
    (el) => (el as HTMLElement).style.display !== "none"
  ) as HTMLElement[];

const syncHighlight = (picker: SharedPicker) => {
  const items = visibleItems(picker);
  if (!items.length) {
    highlightIndex = -1;
    picker.list.querySelectorAll(".doc-code-lang-item").forEach((el) => el.classList.remove("is-active"));
    return;
  }
  if (highlightIndex < 0) highlightIndex = 0;
  if (highlightIndex >= items.length) highlightIndex = items.length - 1;
  picker.list.querySelectorAll(".doc-code-lang-item").forEach((el) => el.classList.remove("is-active"));
  const active = items[highlightIndex];
  active.classList.add("is-active");
  try {
    active.scrollIntoView({ block: "nearest" });
  } catch {
    /* ignore */
  }
};

const filterMenu = (picker: SharedPicker, query: string, opts?: { preferLang?: string }) => {
  const q = String(query || "").trim().toLowerCase();
  let visible = 0;
  picker.list.querySelectorAll(".doc-code-lang-item").forEach((el) => {
    const item = el as HTMLElement;
    const id = (item.dataset.langId || "").toLowerCase();
    const label = (item.dataset.langLabel || item.textContent || "").toLowerCase();
    const match = !q || id.includes(q) || label.includes(q);
    item.style.display = match ? "flex" : "none";
    if (match) visible += 1;
  });
  picker.empty.style.display = visible ? "none" : "flex";
  const items = visibleItems(picker);
  if (!items.length) {
    highlightIndex = -1;
  } else if (opts?.preferLang != null) {
    const prefer = String(opts.preferLang || "").toLowerCase();
    const idx = items.findIndex((el) => (el.dataset.langId || "").toLowerCase() === prefer);
    highlightIndex = idx >= 0 ? idx : 0;
  } else if (highlightIndex < 0 || highlightIndex >= items.length) {
    highlightIndex = 0;
  }
  syncHighlight(picker);
};

const moveHighlight = (picker: SharedPicker, delta: number) => {
  const items = visibleItems(picker);
  if (!items.length) {
    highlightIndex = -1;
    syncHighlight(picker);
    return;
  }
  const next = highlightIndex < 0 ? 0 : highlightIndex + delta;
  highlightIndex = ((next % items.length) + items.length) % items.length;
  syncHighlight(picker);
};

const positionPicker = (picker: SharedPicker) => {
  const anchor = picker.session?.getAnchor?.() || null;
  if (!anchor || !anchor.isConnected) return;
  const rect = anchor.getBoundingClientRect();
  const portalWidth = Math.max(120, Math.round(rect.width));
  const menuWidth = 168;
  const gap = 4;
  const maxH = Math.min(260, Math.max(120, window.innerHeight - 24));
  picker.portal.style.width = `${portalWidth}px`;
  picker.portal.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - portalWidth - 8)}px`;
  picker.portal.style.top = `${rect.top}px`;
  picker.portal.style.height = `${Math.max(28, Math.round(rect.height))}px`;

  picker.menu.style.width = `${menuWidth}px`;
  picker.menu.style.maxHeight = `${maxH}px`;
  const spaceAbove = rect.top - 12;
  const spaceBelow = window.innerHeight - rect.bottom - 12;
  const openUp = spaceAbove >= Math.min(180, maxH) || spaceAbove >= spaceBelow;
  let left = rect.left;
  left = Math.min(Math.max(8, left), window.innerWidth - menuWidth - 8);
  picker.menu.style.left = `${left}px`;
  if (openUp) {
    const height = Math.min(maxH, Math.max(120, spaceAbove));
    picker.menu.style.maxHeight = `${height}px`;
    picker.menu.style.top = "auto";
    picker.menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
  } else {
    const height = Math.min(maxH, Math.max(120, spaceBelow));
    picker.menu.style.maxHeight = `${height}px`;
    picker.menu.style.bottom = "auto";
    picker.menu.style.top = `${rect.bottom + gap}px`;
  }
};

const applyLanguage = (nextId: string) => {
  const picker = shared;
  if (!picker?.session) return;
  const session = picker.session;
  const editor = session.editor;
  const next = nextId || null;
  const prev = currentLangId(session);
  try {
    session.onBeforeApply?.(next, prev);
  } catch {
    /* ignore */
  }
  const pos = session.getPos();
  if (typeof pos === "number") {
    editor
      .chain()
      .command(({ tr, dispatch, state }: any) => {
        const node = state.doc.nodeAt(pos);
        if (!node || node.type.name !== "codeBlock") return false;
        if (dispatch) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, language: next });
          const inside = Math.min(pos + 1, pos + node.nodeSize - 1);
          tr.setSelection(TextSelection.create(tr.doc, inside));
          dispatch(tr);
        }
        return true;
      })
      .focus()
      .run();
  } else {
    editor.chain().focus().updateAttributes("codeBlock", { language: next }).run();
  }
  closeCodeLangPicker();
  try {
    session.onAfterApply?.(next);
  } catch {
    /* ignore */
  }
};

const ensureShared = (): SharedPicker => {
  if (shared) return shared;
  const portal = document.createElement("div");
  const input = document.createElement("input");
  const menu = document.createElement("div");
  const list = document.createElement("div");
  const empty = document.createElement("div");

  portal.className = "doc-code-lang-portal";
  portal.style.display = "none";
  portal.contentEditable = "false";
  input.type = "text";
  input.className = "doc-code-lang-input";
  input.placeholder = "选择语言";
  input.autocomplete = "off";
  input.spellcheck = false;
  menu.className = "doc-code-lang-menu";
  menu.contentEditable = "false";
  menu.style.display = "none";
  list.className = "doc-code-lang-list";
  list.contentEditable = "false";
  empty.className = "doc-code-lang-empty";
  empty.textContent = "无匹配语言";
  empty.style.display = "none";

  CODE_LANGUAGE_OPTIONS.forEach((opt) => {
    const item = document.createElement("div");
    item.className = "doc-code-lang-item";
    item.dataset.langId = opt.id;
    item.dataset.langLabel = opt.label;
    item.textContent = opt.label;
    item.addEventListener("mousedown", (event) => {
      stop(event);
      applyLanguage(opt.id);
    });
    item.addEventListener("mouseenter", () => {
      if (!shared?.open) return;
      const items = visibleItems(shared);
      const idx = items.indexOf(item);
      if (idx < 0) return;
      highlightIndex = idx;
      syncHighlight(shared);
    });
    item.addEventListener("click", stop);
    list.appendChild(item);
  });
  menu.appendChild(list);
  menu.appendChild(empty);
  portal.appendChild(input);
  document.body.appendChild(portal);
  document.body.appendChild(menu);

  input.addEventListener("mousedown", (event) => event.stopPropagation());
  // 输入仅模糊过滤下拉；语言仅在回车或点选后生效
  input.addEventListener("input", () => {
    if (!shared?.open) return;
    highlightIndex = 0;
    filterMenu(shared, input.value);
  });
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (!shared) return;
    if (event.key === "Escape") {
      event.preventDefault();
      const ed = shared.session?.editor;
      closeCodeLangPicker();
      try { ed?.commands?.focus?.(); } catch { /* ignore */ }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(shared, 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(shared, -1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const items = visibleItems(shared);
      if (items.length > 0) {
        const idx = highlightIndex >= 0 && highlightIndex < items.length ? highlightIndex : 0;
        applyLanguage(items[idx].dataset.langId || "");
      } else {
        // 列表无匹配：仍应用输入内容（自定义类型）
        applyLanguage(resolveLangInput(input.value));
      }
    }
  });
  // 失焦不自动提交：避免输入到一半点开别处就改语言；仅回车 / 点选菜单生效
  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!shared?.open) return;
      if (Date.now() < suppressOutsideCloseUntil) return;
      const active = document.activeElement;
      if (active === input) return;
      if (active && (menu.contains(active) || portal.contains(active))) return;
      const anchor = shared.session?.getAnchor?.();
      if (anchor && active && (anchor === active || anchor.contains(active))) return;
      closeCodeLangPicker();
    }, 120);
  });

  const onDocPointerDown = (event: Event) => {
    if (!shared?.open) return;
    if (Date.now() < suppressOutsideCloseUntil) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (portal.contains(target) || menu.contains(target)) return;
    const anchor = shared.session?.getAnchor?.();
    if (anchor && (anchor === target || anchor.contains(target))) return;
    closeCodeLangPicker();
  };
  const onReposition = () => {
    if (shared?.open) positionPicker(shared);
  };
  document.addEventListener("mousedown", onDocPointerDown, true);
  window.addEventListener("resize", onReposition);
  window.addEventListener("scroll", onReposition, true);

  shared = { portal, input, menu, list, empty, session: null, open: false };
  return shared;
};

export const isCodeLangPickerOpen = () => Boolean(shared?.open);

export const isCodeLangPickerFor = (editor: any, getPos: () => number | undefined | null) => {
  if (!shared?.open || !shared.session) return false;
  if (shared.session.editor !== editor) return false;
  try {
    return shared.session.getPos() === getPos();
  } catch {
    return false;
  }
};

export const rebindCodeLangPickerAnchor = (session: CodeLangPickerSession) => {
  if (!shared?.open || !shared.session) return;
  if (shared.session.editor !== session.editor) return;
  try {
    if (shared.session.getPos() !== session.getPos()) return;
  } catch {
    return;
  }
  shared.session = session;
  positionPicker(shared);
};

export const openCodeLangPicker = (session: CodeLangPickerSession) => {
  const picker = ensureShared();
  // 吞掉打开当次 pointer 的 outside-close，避免 mousedown 捕获阶段误关
  suppressOutsideCloseUntil = Date.now() + 300;
  picker.session = session;
  picker.open = true;
  const lang = currentLangId(session);
  picker.input.value = lang ? codeLanguageLabel(lang) : "";
  picker.portal.style.display = "block";
  picker.menu.style.display = "flex";
  positionPicker(picker);
  filterMenu(picker, picker.input.value, { preferLang: lang });
  // 延迟聚焦：等当前 pointer 序列结束，避免与编辑器焦点切换打架
  window.setTimeout(() => {
    if (!shared?.open || shared.session !== session) return;
    try {
      picker.input.focus({ preventScroll: true });
      picker.input.select();
    } catch {
      try { picker.input.focus(); } catch { /* ignore */ }
    }
  }, 0);
};

export const closeCodeLangPicker = () => {
  if (!shared) return;
  const session = shared.session;
  const editor = session?.editor;
  shared.open = false;
  shared.session = null;
  shared.portal.style.display = "none";
  shared.menu.style.display = "none";
  shared.input.value = "";
  highlightIndex = -1;
  filterMenu(shared, "");
  try {
    session?.onDraftEnd?.();
  } catch {
    /* ignore */
  }
  // 通知 NodeView 刷新操作栏 / is-lang-open（关闭不一定伴随 transaction）
  try {
    editor?.view?.dispatch?.(editor.state.tr.setMeta("codeLangPicker", "close"));
  } catch {
    /* ignore */
  }
};

export const syncCodeLangTrigger = (trigger: HTMLElement, language?: string | null) => {
  const label = language ? codeLanguageLabel(language) : "选择语言";
  trigger.textContent = label;
  trigger.title = label;
  trigger.classList.toggle("is-placeholder", !language);
};
