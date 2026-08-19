// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Extension, mergeAttributes, Node as TiptapNode, ResizableNodeView } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { formatFileSize, mergeHtmlAttrs } from "../utils/html";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "../utils/image";
import { renderMermaidSourceToSvg } from "../utils/mermaid";

/** Mermaid 编辑会话：按 editor+pos 记录，NodeView 重建后恢复，避免闪回「图表渲染中」 */
const mermaidEditSessions = new WeakMap<object, { pos: number; baseline: string }>();

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
    const language = node.attrs.language;
    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: language === "mermaid" ? "doc-code-block language-mermaid" : "doc-code-block",
        "data-language": language || undefined,
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
      const toolbar = document.createElement("div");
      const cancelBtn = document.createElement("button");
      const confirmBtn = document.createElement("button");
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      let currentNode = node;
      // 编辑态由「确定/取消」显式控制，选区变化不自动退出
      let editing = false;
      let editBaseline = "";
      let renderToken = 0;
      let lastSource = "";
      let debounceTimer = 0;

      const isMermaid = () => String(currentNode.attrs.language || "") === "mermaid";

      const nodeRange = () => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos !== "number") return null;
        return { pos, size: currentNode.nodeSize };
      };

      const readSource = () => String(code.innerText || currentNode.textContent || "").replace(/\u00a0/g, " ");

      const focusAfterNode = () => {
        const range = nodeRange();
        if (!range) return;
        editor.chain().focus().setTextSelection(range.pos + range.size).run();
      };

      const restoreBaseline = () => {
        const range = nodeRange();
        if (!range) return;
        const from = range.pos + 1;
        const to = range.pos + range.size - 1;
        if (from > to) return;
        editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.insertText(editBaseline, from, to);
              dispatch(tr);
            }
            return true;
          })
          .run();
      };

      const syncChrome = () => {
        const mermaid = isMermaid();
        const showSource = mermaid ? (editor.isEditable && editing) : true;
        dom.className = mermaid ? `doc-mermaid${showSource ? " is-editing" : ""}` : "doc-code-block-wrap";
        dom.style.position = mermaid ? "relative" : "";
        pre.className = mermaid ? "doc-code-block doc-mermaid-source" : "doc-code-block";
        toolbar.style.setProperty("display", showSource ? "flex" : "none", "important");
        editHint.style.setProperty("display", mermaid && editor.isEditable && !showSource ? "inline-flex" : "none", "important");
        if (currentNode.attrs.language) {
          const lang = String(currentNode.attrs.language);
          pre.setAttribute("data-language", lang);
          code.className = `language-${lang}`;
          code.setAttribute("data-language", lang);
        } else {
          pre.removeAttribute("data-language");
          code.className = "";
          code.removeAttribute("data-language");
        }
        if (!mermaid) {
          preview.style.display = "none";
          preview.innerHTML = "";
          pre.style.cssText = "";
          toolbar.style.setProperty("display", "none", "important");
          editHint.style.setProperty("display", "none", "important");
          return;
        }
        if (showSource) {
          preview.style.display = "none";
          pre.style.cssText = "";
        } else {
          preview.style.display = "block";
          preview.style.cursor = editor.isEditable ? "pointer" : "default";
          // 预览态隐藏源码但保持 contentDOM 挂载
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
        }
      };

      const renderPreview = (source: string) => {
        if (!isMermaid() || editing) return;
        const trimmed = String(source || "").replace(/\u00a0/g, " ").trimEnd();
        if (!trimmed.trim()) {
          preview.className = "doc-mermaid-preview";
          preview.textContent = "点击编辑 Mermaid 源码";
          lastSource = "";
          return;
        }
        if (trimmed === lastSource && preview.querySelector("svg")) return;
        const token = ++renderToken;
        preview.className = "doc-mermaid-preview";
        preview.textContent = "图表渲染中…";
        void renderMermaidSourceToSvg(trimmed).then((svg) => {
          if (token !== renderToken || editing) return;
          lastSource = trimmed;
          preview.innerHTML = svg;
          const svgEl = preview.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.display = "block";
            svgEl.style.margin = "0 auto";
            svgEl.style.pointerEvents = "none";
          }
        }).catch((error) => {
          if (token !== renderToken || editing) return;
          lastSource = "";
          preview.className = "doc-mermaid-preview doc-mermaid-error";
          preview.textContent = `Mermaid 渲染失败：${error instanceof Error ? error.message : "语法错误"}`;
        });
      };

      const scheduleRender = () => {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          renderPreview(readSource());
        }, 80);
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

      const enterEdit = () => {
        if (!editor.isEditable || !isMermaid()) return;
        if (editing) {
          placeCaretInSource();
          return;
        }
        const range = nodeRange();
        if (!range) return;
        editing = true;
        editBaseline = readSource().trimEnd();
        // 取消进行中的预览渲染，避免异步回调把界面打回预览态
        renderToken += 1;
        window.clearTimeout(debounceTimer);
        mermaidEditSessions.set(editor, { pos: range.pos, baseline: editBaseline });
        syncChrome();
        placeCaretInSource();
        requestAnimationFrame(() => {
          if (!editing) return;
          placeCaretInSource();
        });
      };

      const confirmEdit = () => {
        if (!editing) return;
        editing = false;
        mermaidEditSessions.delete(editor);
        syncChrome();
        scheduleRender();
        focusAfterNode();
      };

      const cancelEdit = () => {
        if (!editing) return;
        const current = readSource().trimEnd();
        if (current !== editBaseline) restoreBaseline();
        editing = false;
        mermaidEditSessions.delete(editor);
        syncChrome();
        if (!(lastSource && preview.querySelector("svg"))) scheduleRender();
        focusAfterNode();
      };

      const stopPointer = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
      };

      const onEnterPointer = (event: Event) => {
        if (!editor.isEditable || !isMermaid() || editing) return;
        const target = event.target as Node | null;
        if (target && (toolbar.contains(target) || pre.contains(target) || code.contains(target))) return;
        stopPointer(event);
        enterEdit();
      };

      editHint.type = "button";
      editHint.className = "doc-mermaid-edit-hint";
      editHint.textContent = "编辑";
      editHint.contentEditable = "false";
      // 捕获阶段拦截，避免 ProseMirror 抢先处理导致无法进入编辑
      dom.addEventListener("pointerdown", onEnterPointer, true);
      dom.addEventListener("mousedown", onEnterPointer, true);
      editHint.addEventListener("click", onEnterPointer);
      preview.addEventListener("click", onEnterPointer);

      cancelBtn.type = "button";
      cancelBtn.className = "doc-mermaid-btn doc-mermaid-btn-cancel";
      cancelBtn.textContent = "取消";
      cancelBtn.addEventListener("mousedown", stopPointer);
      cancelBtn.addEventListener("click", (event) => {
        stopPointer(event);
        cancelEdit();
      });

      confirmBtn.type = "button";
      confirmBtn.className = "doc-mermaid-btn doc-mermaid-btn-confirm";
      confirmBtn.textContent = "确定";
      confirmBtn.addEventListener("mousedown", stopPointer);
      confirmBtn.addEventListener("click", (event) => {
        stopPointer(event);
        confirmEdit();
      });

      toolbar.className = "doc-mermaid-toolbar";
      toolbar.contentEditable = "false";
      toolbar.appendChild(cancelBtn);
      toolbar.appendChild(confirmBtn);

      preview.className = "doc-mermaid-preview";
      preview.contentEditable = "false";

      pre.addEventListener("keydown", (event) => {
        if (!editing || !isMermaid()) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancelEdit();
          return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          confirmEdit();
        }
      });

      // 勿给 pre 设 contentEditable：会与 ProseMirror contentDOM 嵌套冲突，导致粘贴失效
      pre.appendChild(code);
      dom.appendChild(preview);
      dom.appendChild(editHint);
      dom.appendChild(pre);
      dom.appendChild(toolbar);
      code.textContent = currentNode.textContent;

      // NodeView 重建时按位置恢复未结束的编辑会话，避免闪回「图表渲染中」
      const pendingSession = mermaidEditSessions.get(editor);
      const currentPos = typeof getPos === "function" ? getPos() : null;
      if (
        pendingSession
        && editor.isEditable
        && isMermaid()
        && typeof currentPos === "number"
        && pendingSession.pos === currentPos
      ) {
        editing = true;
        editBaseline = pendingSession.baseline;
        syncChrome();
        requestAnimationFrame(() => {
          if (!editing) return;
          placeCaretInSource();
        });
      } else {
        syncChrome();
        if (isMermaid()) renderPreview(currentNode.textContent);
      }

      return {
        dom,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          if (!isMermaid()) {
            editing = false;
            mermaidEditSessions.delete(editor);
          } else if (editing) {
            const range = nodeRange();
            if (range) mermaidEditSessions.set(editor, { pos: range.pos, baseline: editBaseline });
          }
          syncChrome();
          if (isMermaid() && !editing) {
            const src = String(updatedNode.textContent || "").replace(/\u00a0/g, " ").trimEnd();
            if (src !== lastSource) scheduleRender();
          } else if (!isMermaid()) {
            preview.innerHTML = "";
            lastSource = "";
          }
          return true;
        },
        selectNode: () => {
          if (editor.isEditable && isMermaid() && !editing) enterEdit();
        },
        deselectNode: () => {},
        stopEvent: (event) => {
          if (!isMermaid()) return false;
          const target = event.target as Node | null;
          if (target && (toolbar.contains(target) || editHint.contains(target) || preview.contains(target))) return true;
          if (!editing) {
            const type = event.type;
            if (
              type === "mousedown" || type === "mouseup" || type === "click" || type === "dblclick"
              || type === "pointerdown" || type === "pointerup" || type === "touchstart" || type === "touchend"
            ) {
              return true;
            }
          }
          return false;
        },
        ignoreMutation: (mutation) => {
          if (preview.contains(mutation.target as Node)) return true;
          if (toolbar.contains(mutation.target as Node)) return true;
          if (editHint.contains(mutation.target as Node)) return true;
          if (code.contains(mutation.target as Node)) return false;
          return true;
        },
        destroy: () => {
          window.clearTimeout(debounceTimer);
          dom.removeEventListener("pointerdown", onEnterPointer, true);
          dom.removeEventListener("mousedown", onEnterPointer, true);
          preview.removeEventListener("click", onEnterPointer);
          editHint.removeEventListener("click", onEnterPointer);
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
          if (this.editor.getAttributes("codeBlock")?.language === "mermaid") return false;
          return exitCodeBlockCleanly(this.editor);
        }
        return false;
      },
      Escape: () => {
        if (this.editor.isActive("codeBlock")) {
          if (this.editor.getAttributes("codeBlock")?.language === "mermaid") return false;
          return exitCodeBlockCleanly(this.editor);
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
        if (textBefore === "```") {
          return clearTrigger().toggleCodeBlock().run();
        }
        return false;
      },
      Enter: () => {
        if (this.editor.isActive("codeBlock")) {
          if (this.editor.getAttributes("codeBlock")?.language === "mermaid") {
            return this.editor.commands.newlineInCode();
          }
          if (isCurrentCodeLineEmpty(this.editor)) return exitCodeBlockCleanly(this.editor);
          return this.editor.commands.newlineInCode();
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
        if (this.editor.isActive("codeBlock") && this.editor.getAttributes("codeBlock")?.language !== "mermaid") {
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

