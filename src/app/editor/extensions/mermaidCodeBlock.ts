// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { mergeAttributes } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import { createMermaidCodeBlockView } from "./mermaidCodeBlockView";

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
    return (props) => createMermaidCodeBlockView(props);
  },
}).configure({
  HTMLAttributes: { class: "doc-code-block" },
});
