// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Extension } from "@tiptap/core";

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
