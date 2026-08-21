// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Extension } from "@tiptap/core";

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
