// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, FontSize, LineHeight, TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  AttachmentNode,
  BlockAnchorExtension,
  IndentExtension,
  MermaidCodeBlock,
  ResizableImage,
  TableCellWithRowHeight,
  TableHeaderWithRowHeight,
  TyporaKeymap,
  VideoNode,
} from "../extensions";

export const createEditorExtensions = () => [
  StarterKit.configure({
    link: false,
    codeBlock: false,
    blockquote: {
      HTMLAttributes: { class: "doc-blockquote" },
    },
    bulletList: {
      keepMarks: true,
      HTMLAttributes: { class: "doc-list doc-bullet-list" },
    },
    orderedList: {
      keepMarks: true,
      HTMLAttributes: { class: "doc-list doc-ordered-list" },
    },
  }),
  MermaidCodeBlock,
  TyporaKeymap,
  TextStyle,
  Color,
  BackgroundColor,
  FontFamily,
  FontSize,
  LineHeight,
  IndentExtension,
  TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "codeBlock") return "";
      return "输入 / 呼出命令，或直接开始写作";
    },
    showOnlyWhenEditable: true,
    showOnlyCurrent: true,
    includeChildren: false,
    emptyNodeClass: "is-empty",
    emptyEditorClass: "is-editor-empty",
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: { class: "doc-link", target: "_blank", rel: "noreferrer" },
  }),
  BlockAnchorExtension,
  VideoNode,
  AttachmentNode,
  ResizableImage.configure({
    allowBase64: true,
    HTMLAttributes: { class: "doc-image" },
    resize: { enabled: true, alwaysPreserveAspectRatio: false, minWidth: 48, minHeight: 48 },
  }),
  Table.configure({
    resizable: true,
    cellMinWidth: 96,
    handleWidth: 6,
    lastColumnResizable: false,
    HTMLAttributes: { class: "doc-table" },
  }),
  TableRow,
  TableHeaderWithRowHeight,
  TableCellWithRowHeight,
  TaskList.configure({ HTMLAttributes: { class: "doc-task-list" } }),
  TaskItem.configure({ nested: true, HTMLAttributes: { class: "doc-task-item" } }),
];

export const createEditorContentAttributes = (fontSize?: string, lineHeight?: string) => ({
  class: "doc-tiptap-content ProseMirror h-full min-h-0 w-full max-w-full overflow-y-auto overflow-x-auto overscroll-contain px-[8px] pt-[24px] pb-[12px] outline-none box-border",
  style: `font-size:${fontSize || "15px"};line-height:${lineHeight || "1.8"};font-family:PingFang SC, sans-serif;`,
});
