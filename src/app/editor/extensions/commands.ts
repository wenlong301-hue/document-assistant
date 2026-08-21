// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { TextSelection } from "@tiptap/pm/state";
import { isInTable, moveCellForward, nextCell, selectionCell } from "@tiptap/pm/tables";

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
