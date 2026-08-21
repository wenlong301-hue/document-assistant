import React from "react";
import editorSvg from "../../../imports/首页大纲模式根节点未编写内容-1/svg-208e2u96ym";
import { InlineIconSvg } from "../ui/InlineIconSvg";
import type { SlashItem } from "./types";

export const buildSlashItems = (ctx: {
  runEditorCommand: (command: (activeEditor: any) => boolean | void) => boolean;
  openLinkDialog: () => void;
  openImagePicker: () => void;
  openVideoPicker: () => void;
  openAttachmentPicker: () => void;
  openTableDialog: () => void;
}): SlashItem[] => [
  { label: "一级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H1</span>, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 1 }).run()) },
  { label: "二级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H2</span>, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 2 }).run()) },
  { label: "三级标题", icon: <span className="text-[11px] font-semibold text-[#131212]">H3</span>, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 3 }).run()) },
  { label: "正文", icon: <span className="text-[11px] font-semibold text-[#131212]">T</span>, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().setParagraph().run()) },
  { label: "有序列表", icon: <InlineIconSvg path={editorSvg.p31fc8400} />, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleOrderedList().run()) },
  { label: "无序列表", icon: <InlineIconSvg path={editorSvg.p1ddeb0c0} />, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBulletList().run()) },
  { label: "任务列表", icon: <InlineIconSvg path={editorSvg.p30909380} />, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleTaskList().run()) },
  { label: "引用块", icon: <InlineIconSvg path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill />, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBlockquote().run()) },
  { label: "代码块", icon: <InlineIconSvg path={editorSvg.p36d5aa00} />, action: () => ctx.runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleCodeBlock().run()) },
  { label: "链接", icon: <InlineIconSvg path={editorSvg.pda5c3c0} />, action: () => ctx.openLinkDialog() },
  { label: "图片", icon: <InlineIconSvg path={editorSvg.p2a7b5cf0} isFill fill="#131212" />, action: ctx.openImagePicker, kind: "file" },
  { label: "视频", icon: <InlineIconSvg path={editorSvg.p1a4aa900} />, action: ctx.openVideoPicker, kind: "file" },
  { label: "附件", icon: <InlineIconSvg path={editorSvg.p149b2100} />, action: ctx.openAttachmentPicker, kind: "file" },
  { label: "表格", icon: <InlineIconSvg path={editorSvg.p808b680} />, action: ctx.openTableDialog },
];
