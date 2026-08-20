// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Extension, mergeAttributes, Node as TiptapNode, ResizableNodeView } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextSelection } from "@tiptap/pm/state";
import { isInTable, moveCellForward, nextCell, selectionCell } from "@tiptap/pm/tables";
import { formatFileSize, mergeHtmlAttrs } from "../utils/html";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "../utils/image";
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

/** 代码块编辑会话（图表/普通）：按 editor+pos 记录，NodeView 重建后恢复 */
const codeBlockEditSessions = new WeakMap<object, {
  pos: number;
  diagram: boolean;
}>();

/** 图表预览武装态：NodeView 重建后恢复 20px 下拉条 */
const codeBlockArmedSessions = new WeakMap<object, { pos: number }>();

/** 当前编辑中的代码块控制器：失焦/Esc 时提交并退出编辑 */
const codeBlockEditControllers = new WeakMap<object, Set<{
  commit: () => void;
  isActive: () => boolean;
  hasSelection: () => boolean;
}>>();

const pickActiveCodeBlockController = (editor: any) => {
  const set = codeBlockEditControllers.get(editor);
  if (!set || set.size === 0) return null;
  let fallback: { commit: () => void; isActive: () => boolean; hasSelection: () => boolean } | null = null;
  for (const ctrl of set) {
    if (!ctrl.isActive()) continue;
    if (ctrl.hasSelection()) return ctrl;
    if (!fallback) fallback = ctrl;
  }
  return fallback;
};

/** 提交当前代码块编辑并退出编辑态（保留已改内容） */
export const commitActiveCodeBlockEdit = (editor: any) => {
  const ctrl = pickActiveCodeBlockController(editor);
  if (!ctrl) return false;
  ctrl.commit();
  return true;
};

export const ResizableImage = Image.extend({
  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") {
      return null;
    }
    const { directions, minWidth, minHeight } = this.options.resize;
    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");
      el.draggable = false;
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value != null && key !== "width" && key !== "height") {
          el.setAttribute(key, String(value));
        }
      });
      if (mergedAttributes.src != null) el.src = mergedAttributes.src;
      const attrW = Number(node.attrs.width);
      const attrH = Number(node.attrs.height);
      if (Number.isFinite(attrW) && attrW > 0) el.style.width = `${attrW}px`;
      if (Number.isFinite(attrH) && attrH > 0) el.style.height = `${attrH}px`;
      else if (Number.isFinite(attrW) && attrW > 0) el.style.height = "auto";

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          const sized = fitImageSize(width, height, el.naturalWidth, el.naturalHeight, imageRatioLockedRef.current);
          el.style.width = `${sized.width}px`;
          el.style.height = imageRatioLockedRef.current ? "auto" : `${sized.height}px`;
          syncContainerToImage(nodeView.dom);
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          const sized = fitImageSize(width, height, el.naturalWidth, el.naturalHeight, imageRatioLockedRef.current);
          const attrs = imageRatioLockedRef.current
            ? { width: sized.width, height: null as number | null }
            : { width: sized.width, height: sized.height };
          el.style.width = `${sized.width}px`;
          el.style.height = imageRatioLockedRef.current ? "auto" : `${sized.height}px`;
          syncContainerToImage(nodeView.dom);
          this.editor.chain().setNodeSelection(pos).updateAttributes(this.name, attrs).run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          const w = Number(updatedNode.attrs.width);
          const h = Number(updatedNode.attrs.height);
          if (Number.isFinite(w) && w > 0) {
            el.style.width = `${w}px`;
            el.style.height = Number.isFinite(h) && h > 0 ? `${h}px` : "auto";
          } else {
            el.style.width = "";
            el.style.height = "";
          }
          syncContainerToImage(nodeView.dom);
          return true;
        },
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          // Aspect lock is applied in onResize/onCommit via imageRatioLockedRef (dynamic).
          preserveAspectRatio: false,
        },
      });

      syncContainerToImage(nodeView.dom);

      const reveal = () => {
        nodeView.dom.style.visibility = "";
        nodeView.dom.style.pointerEvents = "";
        syncContainerToImage(nodeView.dom);
      };
      nodeView.dom.style.visibility = "hidden";
      nodeView.dom.style.pointerEvents = "none";
      if (el.complete && el.naturalWidth > 0) {
        reveal();
      } else {
        el.addEventListener("load", reveal, { once: true });
        el.addEventListener("error", reveal, { once: true });
      }
      return nodeView;
    };
  },
});


export const isTiptapBlockEmpty = (editor: any) => {
  const parentText = editor.state.selection.$from.parent.textContent ?? "";
  return parentText.replace(/\u00a0/g, "").trim().length === 0;
};

export const isCurrentCodeLineEmpty = (editor: any) => {
  const { $from } = editor.state.selection;
  const textBefore = editor.state.doc.textBetween($from.start(), editor.state.selection.from, "\n", "\n");
  const currentLine = textBefore.split("\n").pop() ?? "";
  return currentLine.replace(/\u00a0/g, "").trim().length === 0;
};

/** 空行回车退出代码块：去掉尾部空行，再在块后插入正文（与引用一致，不残留空行） */
export const exitCodeBlockCleanly = (editor: any) => editor.chain().focus().command(({ state, dispatch }: any) => {
  const { $from } = state.selection;
  if ($from.parent.type.name !== "codeBlock") return false;
  const posBefore = $from.before($from.depth);
  const posAfter = $from.after($from.depth);
  const codeNode = $from.parent;
  const raw = String(codeNode.textContent || "").replace(/\u00a0/g, " ");
  const trimmed = raw.replace(/\n+$/, "");
  const paragraph = state.schema.nodes.paragraph.create();
  const codeType = codeNode.type;
  let tr = state.tr;
  if (!trimmed) {
    // 整块为空：直接换成正文，不留空代码块
    tr = tr.replaceWith(posBefore, posAfter, paragraph);
    tr.setSelection(state.selection.constructor.near(tr.doc.resolve(posBefore + 1)));
  } else {
    const nextCode = codeType.create(codeNode.attrs, trimmed ? state.schema.text(trimmed) : undefined);
    tr = tr.replaceWith(posBefore, posAfter, nextCode);
    const insertAt = tr.mapping.map(posAfter);
    tr = tr.insert(insertAt, paragraph);
    tr.setSelection(state.selection.constructor.near(tr.doc.resolve(insertAt + 1)));
  }
  dispatch?.(tr);
  return true;
}).run();

export const insertParagraphAfterAncestor = (editor: any, ancestorName: string) => editor.chain().focus().command(({ state, dispatch }: any) => {
  const { $from } = state.selection;
  let depth = -1;
  for (let d = $from.depth; d > 0; d -= 1) {
    if ($from.node(d).type.name === ancestorName) {
      depth = d;
      break;
    }
  }
  if (depth < 0) return false;
  const ancestor = $from.node(depth);
  const posBefore = $from.before(depth);
  const posAfter = $from.after(depth);
  const emptyFrom = $from.before($from.depth);
  const emptyTo = $from.after($from.depth);
  const paragraph = state.schema.nodes.paragraph.create();
  let tr = state.tr;
  // 语雀式：空行回车直接退出块，不在块内残留空段落
  if (ancestorName === "blockquote") {
    if (ancestor.childCount <= 1) {
      tr = tr.replaceWith(posBefore, posAfter, paragraph);
      tr.setSelection(state.selection.constructor.near(tr.doc.resolve(posBefore + 1)));
    } else {
      tr = tr.delete(emptyFrom, emptyTo);
      const insertAt = tr.mapping.map(posAfter);
      tr = tr.insert(insertAt, paragraph);
      tr.setSelection(state.selection.constructor.near(tr.doc.resolve(insertAt + 1)));
    }
    dispatch?.(tr);
    return true;
  }
  tr = tr.insert(posAfter, paragraph);
  tr.setSelection(state.selection.constructor.near(tr.doc.resolve(posAfter + 1)));
  dispatch?.(tr);
  return true;
}).run();

/** Typora 式：表格内 Enter → 同列下一行；末行则跳出表格 */
export const moveToNextTableRowOrExit = (editor: any) => editor.chain().focus().command(({ state, dispatch }: any) => {
  if (!isInTable(state)) return false;
  let $cell;
  try {
    $cell = selectionCell(state);
  } catch {
    return false;
  }
  if (!$cell) return false;
  const $next = nextCell($cell, "vert", 1);
  if ($next) {
    if (dispatch) {
      dispatch(state.tr.setSelection(TextSelection.between($next, moveCellForward($next))).scrollIntoView());
    }
    return true;
  }
  let tableDepth = -1;
  for (let d = $cell.depth; d > 0; d -= 1) {
    if ($cell.node(d).type.spec.tableRole === "table") {
      tableDepth = d;
      break;
    }
  }
  if (tableDepth < 0) return false;
  const posAfter = $cell.after(tableDepth);
  const paragraph = state.schema.nodes.paragraph.create();
  let tr = state.tr;
  const nodeAfter = state.doc.nodeAt(posAfter);
  if (!nodeAfter || nodeAfter.type.name !== "paragraph") {
    tr = tr.insert(posAfter, paragraph);
  }
  tr = tr.setSelection(TextSelection.near(tr.doc.resolve(posAfter + 1))).scrollIntoView();
  dispatch?.(tr);
  return true;
}).run();

/** 引用块内空段落 Backspace：仅一段则退出为正文；多段则只删空行 */
export const backspaceEmptyBlockquote = (editor: any) => editor.chain().focus().command(({ state, dispatch }: any) => {
  const { $from } = state.selection;
  let depth = -1;
  for (let d = $from.depth; d > 0; d -= 1) {
    if ($from.node(d).type.name === "blockquote") {
      depth = d;
      break;
    }
  }
  if (depth < 0) return false;
  const ancestor = $from.node(depth);
  const posBefore = $from.before(depth);
  const posAfter = $from.after(depth);
  const emptyFrom = $from.before($from.depth);
  const emptyTo = $from.after($from.depth);
  const paragraph = state.schema.nodes.paragraph.create();
  let tr = state.tr;
  if (ancestor.childCount <= 1) {
    tr = tr.replaceWith(posBefore, posAfter, paragraph);
    tr.setSelection(state.selection.constructor.near(tr.doc.resolve(posBefore + 1)));
  } else {
    const selAt = emptyFrom > posBefore + 1 ? emptyFrom - 1 : emptyTo;
    tr = tr.delete(emptyFrom, emptyTo);
    tr.setSelection(state.selection.constructor.near(tr.doc.resolve(tr.mapping.map(selAt))));
  }
  dispatch?.(tr);
  return true;
}).run();


export const VideoNode = TiptapNode.create({
  name: "video",
  group: "block",
  inline: false,
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      poster: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", {
      ...HTMLAttributes,
      controls: "true",
      class: "doc-video",
      style: "display:block;max-width:100%;margin:12px 0;border-radius:8px;background:#000",
    }];
  },
});

export const AttachmentNode = TiptapNode.create({
  name: "attachment",
  group: "block",
  inline: false,
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (element) => element.getAttribute("href") },
      fileName: { default: "附件", parseHTML: (element) => element.getAttribute("data-file-name") },
      fileSize: { default: 0, parseHTML: (element) => Number(element.getAttribute("data-file-size") || 0) },
      fileType: { default: "application/octet-stream", parseHTML: (element) => element.getAttribute("data-file-type") },
    };
  },
  parseHTML() {
    return [{ tag: "a[data-attachment][href]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const fileName = String(HTMLAttributes.fileName || HTMLAttributes["data-file-name"] || "附件");
    const fileSize = Number(HTMLAttributes.fileSize || HTMLAttributes["data-file-size"] || 0);
    return ["a", {
      href: HTMLAttributes.src,
      download: fileName,
      "data-attachment": "true",
      "data-file-name": fileName,
      "data-file-size": String(fileSize),
      "data-file-type": String(HTMLAttributes.fileType || "application/octet-stream"),
      class: "doc-attachment",
      title: `下载 ${fileName}`,
    }, `${fileName} · ${formatFileSize(fileSize)}`];
  },
});

export const BlockAnchorExtension = Extension.create({
  name: "blockAnchor",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading", "blockquote", "codeBlock"],
      attributes: {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("id"),
          renderHTML: (attributes) => attributes.id ? { id: attributes.id } : {},
        },
      },
    }];
  },
});

const tableRowHeightAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute("data-row-height") || element.style.height || null,
  renderHTML: (attributes: { rowHeight?: string | null }) => {
    if (!attributes.rowHeight) return {};
    return {
      "data-row-height": attributes.rowHeight,
      style: `height:${attributes.rowHeight};min-height:${attributes.rowHeight}`,
    };
  },
};

export const TableCellWithRowHeight = TableCell.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      rowHeight: tableRowHeightAttribute,
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeHtmlAttrs(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

export const TableHeaderWithRowHeight = TableHeader.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      rowHeight: tableRowHeightAttribute,
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["th", mergeHtmlAttrs(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

const INDENT_TYPES = ["paragraph", "heading"] as const;
const INDENT_STEP_PX = 24;
const INDENT_MAX = 8;

export const IndentExtension = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: [...INDENT_TYPES],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const data = Number(element.getAttribute("data-indent") || 0);
              if (Number.isFinite(data) && data > 0) return Math.min(INDENT_MAX, Math.max(0, Math.round(data)));
              const margin = element.style.marginLeft || "";
              const px = Number.parseFloat(margin);
              if (Number.isFinite(px) && px > 0) return Math.min(INDENT_MAX, Math.max(0, Math.round(px / INDENT_STEP_PX)));
              return 0;
            },
            renderHTML: (attributes) => {
              const level = Number(attributes.indent) || 0;
              if (!level) return {};
              return {
                "data-indent": String(level),
                style: `margin-left: ${level * INDENT_STEP_PX}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }) => {
        const { $from, from, to } = state.selection;
        let changed = false;
        const applyAt = (pos: number, node: any) => {
          if (!INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) return;
          const current = Number(node.attrs.indent) || 0;
          const next = Math.min(INDENT_MAX, current + 1);
          if (next === current) return;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        };
        if (from === to) {
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) {
              applyAt($from.before(depth), node);
              break;
            }
          }
        } else {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) applyAt(pos, node);
          });
        }
        if (changed && dispatch) dispatch(tr);
        return changed;
      },
      outdent: () => ({ tr, state, dispatch }) => {
        const { $from, from, to } = state.selection;
        let changed = false;
        const applyAt = (pos: number, node: any) => {
          if (!INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) return;
          const current = Number(node.attrs.indent) || 0;
          const next = Math.max(0, current - 1);
          if (next === current) return;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        };
        if (from === to) {
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) {
              applyAt($from.before(depth), node);
              break;
            }
          }
        } else {
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (INDENT_TYPES.includes(node.type.name as (typeof INDENT_TYPES)[number])) applyAt(pos, node);
          });
        }
        if (changed && dispatch) dispatch(tr);
        return changed;
      },
    } as any;
  },
});

export const MermaidCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: null,
        parseHTML: (element) => {
          const dataLang = element.getAttribute("data-language")
            || element.querySelector?.("code")?.getAttribute("data-language");
          if (dataLang) return dataLang;
          const classNames = [
            ...Array.from(element.classList || []),
            ...Array.from(element.querySelector?.("code")?.classList || []),
          ].map(String);
          const hit = classNames.find((name) => name.startsWith("language-"));
          return hit ? hit.replace(/^language-/, "") : null;
        },
        rendered: false,
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const language = node.attrs.language ? String(node.attrs.language) : "";
    const preClass = language ? `doc-code-block language-${language}` : "doc-code-block";
    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: preClass,
        ...(language ? { "data-language": language } : {}),
      }),
      [
        "code",
        language ? { class: `language-${language}`, "data-language": language } : {},
        0,
      ],
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      const preview = document.createElement("div");
      const editHint = document.createElement("button");
      const deleteHint = document.createElement("button");
      const expandBar = document.createElement("button");
      const expandBarLabel = document.createElement("span");
      const expandBarChevron = document.createElement("span");
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

      const hideSourceOffscreen = () => {
        pre.style.position = "absolute";
        pre.style.left = "0";
        pre.style.top = "0";
        pre.style.width = "1px";
        pre.style.height = "1px";
        pre.style.opacity = "0";
        pre.style.overflow = "hidden";
        pre.style.pointerEvents = "none";
        pre.style.margin = "0";
        pre.style.padding = "0";
        pre.style.border = "0";
      };

      const showSourceVisible = () => {
        pre.style.cssText = "position:relative";
      };

      const syncExpandBar = () => {
        const diagram = isDiagram();
        const show = diagram && editor.isEditable && !editing && armed;
        expandBarLabel.textContent = codeLanguageLabel(currentNode.attrs.language);
        expandBar.style.setProperty("display", show ? "flex" : "none", "important");
        if (show) dom.classList.add("is-armed");
        else dom.classList.remove("is-armed");
      };

      const syncChrome = () => {
        const diagram = isDiagram();
        const showSource = diagram ? (editor.isEditable && editing) : true;
        const inside = selectionInThisBlock();
        if (inside !== null) selectionInside = inside;
        const busy = langPickerBusy();
        // 普通代码块：编辑态才显示底栏（语言）
        const plainEditing = !diagram && editor.isEditable && editing;
        if (diagram) {
          const modeClass = showSource ? " is-editing" : " is-preview";
          const armedClass = !showSource && armed ? " is-armed" : "";
          dom.className = `doc-code-block-wrap doc-diagram${modeClass}${armedClass}`;
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
          showSourceVisible();
          syncHighlight();
          return;
        }
        highlightLayer.style.display = "none";
        highlightLayer.innerHTML = "";
        code.style.color = "";
        code.style.caretColor = "";
        preview.style.display = "block";
        preview.style.cursor = editor.isEditable && !showSource ? "pointer" : "default";
        if (showSource) {
          showSourceVisible();
          scheduleRender();
        } else {
          hideSourceOffscreen();
          scheduleRender();
        }
      };

      const renderPreview = (source: string) => {
        const kind = diagramKind();
        if (!kind) return;
        const trimmed = String(source || "").replace(/\u00a0/g, " ").trimEnd();
        if (!trimmed.trim()) {
          preview.className = "doc-diagram-preview";
          preview.textContent = editing ? "输入图表源码以预览" : "点击编辑图表";
          lastSource = "";
          return;
        }
        if (trimmed === lastSource && preview.querySelector("svg")) return;
        const token = ++renderToken;
        preview.className = "doc-diagram-preview";
        if (!preview.querySelector("svg")) preview.textContent = "图表渲染中…";
        const label = kind === "flow" ? "Flowchart" : kind === "sequence" ? "Sequence" : "Mermaid";
        void renderDiagramSourceToHtml(kind, trimmed).then((html) => {
          if (token !== renderToken || !isDiagram()) return;
          lastSource = trimmed;
          preview.innerHTML = html;
          preview.querySelectorAll("svg").forEach((svgEl) => {
            svgEl.removeAttribute("height");
            (svgEl as SVGElement).style.maxWidth = "100%";
            (svgEl as SVGElement).style.height = "auto";
            (svgEl as SVGElement).style.display = "block";
            (svgEl as SVGElement).style.margin = "0 auto";
            (svgEl as SVGElement).style.pointerEvents = "none";
          });
        }).catch((error) => {
          if (token !== renderToken || !isDiagram()) return;
          lastSource = "";
          preview.className = "doc-diagram-preview doc-diagram-error";
          preview.textContent = `${label} 渲染失败：${error instanceof Error ? error.message : "语法错误"}`;
        });
      };

      const scheduleRender = () => {
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
          syncChrome();
          return;
        }
        const range = nodeRange();
        if (!range) return;
        editing = true;
        armed = false;
        clearArmedSession();
        if (isDiagram()) {
          // 取消进行中的预览渲染，避免异步回调把界面打回预览态
          renderToken += 1;
          window.clearTimeout(debounceTimer);
        }
        rememberEditSession();
        syncChrome();
        if (opts?.focusSource !== false) {
          placeCaretInSource();
          requestAnimationFrame(() => {
            if (!editing) return;
            placeCaretInSource();
          });
        }
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
        if (!editor.isEditable || !isDiagram() || editing) return;
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
        editing = false;
        armed = false;
        clearArmedSession();
        if (langPickerBusy()) closeCodeLangPicker();
        clearEditSession();
        if (!opts?.keepSelection) focusAfterNode();
        syncChrome();
        if (isDiagram()) scheduleRender();
        else syncHighlight();
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
      expandBar.style.setProperty("display", "none", "important");
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
          if (!editing) return;
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
      // 普通：源码 → 底栏；图表：展开条 → 预览；编辑：源码 → 底栏 → 预览
      dom.appendChild(pre);
      dom.appendChild(actionBar);
      dom.appendChild(expandBar);
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
        selectionInside = selectionInThisBlock() ?? true;
        syncChrome();
        requestAnimationFrame(() => {
          if (!editing) return;
          placeCaretInSource();
        });
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
        if (isDiagram()) renderPreview(currentNode.textContent);
        else syncHighlight();
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
          if (editing) commitEdit({ keepSelection: true });
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
          if (preview.contains(mutation.target as Node)) return true;
          if (actionBar.contains(mutation.target as Node)) return true;
          if (expandBar.contains(mutation.target as Node)) return true;
          if (editHint.contains(mutation.target as Node)) return true;
          if (deleteHint.contains(mutation.target as Node)) return true;
          if (langBar.contains(mutation.target as Node)) return true;
          if (highlightLayer.contains(mutation.target as Node)) return true;
          if (code.contains(mutation.target as Node)) return false;
          return true;
        },
        destroy: () => {
          // 不在此关闭共享语言选择器：聚焦输入会触发 NodeView 重建，菜单需靠 rebind 存活
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
  },
}).configure({
  HTMLAttributes: { class: "doc-code-block" },
});

export const TyporaKeymap = Extension.create({
  name: "typoraKeymap",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": () => this.editor.chain().focus().toggleBlockquote().run(),
      "Mod-Enter": () => {
        if (this.editor.isActive("codeBlock")) {
          return commitActiveCodeBlockEdit(this.editor);
        }
        // Typora：表格内 ⌘/Ctrl+Enter 在下方插入一行并移到同列新行
        if (this.editor.isActive("table")) {
          if (!this.editor.can().addRowAfter()) return false;
          return this.editor.chain().focus().addRowAfter().command(({ state, dispatch }: any) => {
            try {
              const $cell = selectionCell(state);
              const $next = nextCell($cell, "vert", 1);
              if (!$next) return true;
              if (dispatch) {
                dispatch(state.tr.setSelection(TextSelection.between($next, moveCellForward($next))).scrollIntoView());
              }
              return true;
            } catch {
              return true;
            }
          }).run();
        }
        return false;
      },
      "Shift-Enter": () => {
        // Typora：表格内 Shift+Enter 为单元格内换行（hardBreak）
        if (this.editor.isActive("table")) {
          return this.editor.commands.setHardBreak();
        }
        return false;
      },
      Escape: () => {
        if (this.editor.isActive("codeBlock")) {
          return commitActiveCodeBlockEdit(this.editor);
        }
        return false;
      },
      Tab: () => {
        if (this.editor.isActive("listItem")) return this.editor.chain().focus().sinkListItem("listItem").run();
        if (this.editor.isActive("taskItem")) return this.editor.chain().focus().sinkListItem("taskItem").run();
        return this.editor.commands.indent();
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) return this.editor.chain().focus().liftListItem("listItem").run();
        if (this.editor.isActive("taskItem")) return this.editor.chain().focus().liftListItem("taskItem").run();
        return this.editor.commands.outdent();
      },
      Space: () => {
        const { $from } = this.editor.state.selection;
        const start = $from.start();
        const from = this.editor.state.selection.from;
        const textBefore = this.editor.state.doc.textBetween(start, from, "\n", "\n");
        const clearTrigger = () => this.editor.chain().focus().deleteRange({ from: start, to: from });
        if (/^#{1,6}$/.test(textBefore)) {
          return clearTrigger().toggleHeading({ level: textBefore.length as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }
        if (textBefore === ">") {
          return clearTrigger().toggleBlockquote().run();
        }
        if (/^\d+\.$/.test(textBefore)) {
          return clearTrigger().toggleOrderedList().run();
        }
        if (/^[-*+]$/.test(textBefore)) {
          return clearTrigger().toggleBulletList().run();
        }
        if (textBefore === "```mermaid") {
          return clearTrigger().toggleCodeBlock({ language: "mermaid" }).run();
        }
        if (textBefore === "```sequence") {
          return clearTrigger().toggleCodeBlock({ language: "sequence" }).run();
        }
        if (textBefore === "```flow") {
          return clearTrigger().toggleCodeBlock({ language: "flow" }).run();
        }
        if (textBefore === "```") {
          return clearTrigger().toggleCodeBlock().run();
        }
        return false;
      },
      Enter: () => {
        if (this.editor.isActive("codeBlock")) {
          return this.editor.commands.newlineInCode();
        }
        // Typora：表格内 Enter → 同列下一行；末行则跳出表格
        if (this.editor.isActive("table")) {
          return moveToNextTableRowOrExit(this.editor);
        }
        if (this.editor.isActive("blockquote") && isTiptapBlockEmpty(this.editor)) {
          return insertParagraphAfterAncestor(this.editor, "blockquote");
        }
        if (this.editor.isActive("taskItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("taskItem").setParagraph().run();
        }
        if (this.editor.isActive("listItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("listItem").setParagraph().run();
        }
        return false;
      },
      Backspace: () => {
        if (this.editor.isActive("blockquote") && isTiptapBlockEmpty(this.editor)) {
          return backspaceEmptyBlockquote(this.editor);
        }
        if (this.editor.isActive("taskItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("taskItem").setParagraph().run();
        }
        if (this.editor.isActive("listItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("listItem").setParagraph().run();
        }
        const { state } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty) return false;
        // 空段落紧贴 Mermaid/代码块：删除该空行（默认 join 常会失败）
        if ($from.parent.type.name === "paragraph" && $from.parent.content.size === 0) {
          const from = $from.before();
          const to = $from.after();
          const next = state.doc.nodeAt(to);
          if (next?.type.name === "codeBlock") {
            return this.editor.chain().focus().deleteRange({ from, to }).setTextSelection(from).run();
          }
        }
        // 空代码块 Backspace：直接退出为正文（与引用一致）
        if (this.editor.isActive("codeBlock")) {
          const codeText = String($from.parent.textContent || "").replace(/\u00a0/g, "").replace(/\n/g, "");
          if (codeText.trim().length === 0) {
            return exitCodeBlockCleanly(this.editor);
          }
        }
        // 代码块开头 Backspace：若上一块是空段落则删掉空段落
        if (this.editor.isActive("codeBlock") && $from.parentOffset === 0) {
          const codePos = $from.before($from.depth);
          if (codePos > 0) {
            const prev = state.doc.resolve(codePos).nodeBefore;
            if (prev?.type.name === "paragraph" && prev.content.size === 0) {
              const from = codePos - prev.nodeSize;
              return this.editor.chain().focus().deleteRange({ from, to: codePos }).setTextSelection(from).run();
            }
          }
        }
        return false;
      },
      Delete: () => {
        const { state } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty) return false;
        if ($from.parent.type.name === "paragraph" && $from.parent.content.size === 0) {
          const from = $from.before();
          const to = $from.after();
          const next = state.doc.nodeAt(to);
          if (next?.type.name === "codeBlock") {
            return this.editor.chain().focus().deleteRange({ from, to }).setTextSelection(from).run();
          }
        }
        return false;
      },
    };
  },
});

