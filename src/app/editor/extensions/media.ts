// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Node as TiptapNode } from "@tiptap/core";
import { formatFileSize } from "../utils/html";

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
