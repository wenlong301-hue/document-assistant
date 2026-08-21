// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { mergeHtmlAttrs } from "../utils/html";

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
