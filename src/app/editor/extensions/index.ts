// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Extension, mergeAttributes, Node as TiptapNode, ResizableNodeView } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { formatFileSize, mergeHtmlAttrs } from "../utils/html";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "../utils/image";
import { renderMermaidSourceToSvg } from "../utils/mermaid";

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
  const posAfter = $from.after(depth);
  const paragraph = state.schema.nodes.paragraph.create();
  const tr = state.tr.insert(posAfter, paragraph);
  tr.setSelection(state.selection.constructor.near(tr.doc.resolve(posAfter + 1)));
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
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      let currentNode = node;
      let selected = false;
      let renderToken = 0;
      let lastSource = "";
      let debounceTimer = 0;

      const isMermaid = () => String(currentNode.attrs.language || "") === "mermaid";

      const syncChrome = () => {
        const mermaid = isMermaid();
        // 可编辑：选中时编辑源码，未选中时显示预览；只读：始终预览
        const showSource = mermaid ? (editor.isEditable && selected) : true;
        dom.className = mermaid ? `doc-mermaid${showSource ? " is-editing" : ""}` : "doc-code-block-wrap";
        dom.style.position = mermaid ? "relative" : "";
        pre.className = mermaid ? "doc-code-block doc-mermaid-source" : "doc-code-block";
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
          return;
        }
        if (showSource) {
          preview.style.display = "none";
          pre.style.cssText = "";
        } else {
          // 预览态：隐藏源码但保持 contentDOM 挂载，避免 ProseMirror 丢更新
          preview.style.display = "block";
          pre.style.position = "absolute";
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
        if (!isMermaid()) return;
        const trimmed = String(source || "").replace(/\u00a0/g, " ").trimEnd();
        if (!trimmed.trim()) {
          preview.className = "doc-mermaid-preview";
          preview.textContent = "输入 Mermaid 语法后将在此预览";
          lastSource = "";
          return;
        }
        if (trimmed === lastSource && preview.querySelector("svg")) return;
        const token = ++renderToken;
        preview.className = "doc-mermaid-preview";
        preview.textContent = "图表渲染中…";
        void renderMermaidSourceToSvg(trimmed).then((svg) => {
          if (token !== renderToken) return;
          lastSource = trimmed;
          preview.innerHTML = svg;
          const svgEl = preview.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.display = "block";
            svgEl.style.margin = "0 auto";
          }
        }).catch((error) => {
          if (token !== renderToken) return;
          lastSource = "";
          preview.className = "doc-mermaid-preview doc-mermaid-error";
          preview.textContent = `Mermaid 渲染失败：${error instanceof Error ? error.message : "语法错误"}`;
        });
      };

      const scheduleRender = () => {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          renderPreview(code.innerText);
        }, 280);
      };

      preview.className = "doc-mermaid-preview";
      preview.addEventListener("mousedown", (event) => {
        if (!editor.isEditable || !isMermaid()) return;
        event.preventDefault();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos === "number") {
          editor.chain().focus().setNodeSelection(pos).run();
        }
      });
      pre.contentEditable = editor.isEditable ? "true" : "false";
      pre.appendChild(code);
      dom.appendChild(preview);
      dom.appendChild(pre);
      code.textContent = currentNode.textContent;
      syncChrome();
      if (isMermaid()) renderPreview(currentNode.textContent);

      return {
        dom,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          syncChrome();
          if (isMermaid()) scheduleRender();
          else {
            preview.innerHTML = "";
            lastSource = "";
          }
          return true;
        },
        selectNode: () => {
          selected = true;
          syncChrome();
        },
        deselectNode: () => {
          selected = false;
          syncChrome();
          if (isMermaid()) scheduleRender();
        },
        stopEvent: () => false,
        ignoreMutation: (mutation) => {
          if (preview.contains(mutation.target as Node)) return true;
          if (code.contains(mutation.target as Node)) return false;
          return true;
        },
        destroy: () => {
          window.clearTimeout(debounceTimer);
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
        if (this.editor.isActive("codeBlock")) return this.editor.chain().focus().exitCode().run();
        return false;
      },
      Escape: () => {
        if (this.editor.isActive("codeBlock")) return this.editor.chain().focus().exitCode().run();
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
          if (isCurrentCodeLineEmpty(this.editor)) return this.editor.chain().focus().exitCode().run();
          return this.editor.commands.newlineInCode();
        }
        if (this.editor.isActive("blockquote") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().toggleBlockquote().setParagraph().run();
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
          return this.editor.chain().focus().toggleBlockquote().setParagraph().run();
        }
        if (this.editor.isActive("taskItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("taskItem").setParagraph().run();
        }
        if (this.editor.isActive("listItem") && isTiptapBlockEmpty(this.editor)) {
          return this.editor.chain().focus().liftListItem("listItem").setParagraph().run();
        }
        return false;
      },
    };
  },
});

