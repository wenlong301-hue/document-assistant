// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { moveCellForward, nextCell, selectionCell } from "@tiptap/pm/tables";
import { commitActiveCodeBlockEdit } from "./codeBlockSessions";
import {
  backspaceEmptyBlockquote,
  exitCodeBlockCleanly,
  insertParagraphAfterAncestor,
  isTiptapBlockEmpty,
  moveToNextTableRowOrExit,
} from "./commands";

export const TyporaKeymap = Extension.create({
  name: "typoraKeymap",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": () => this.editor.chain().focus().toggleBlockquote().run(),
      "Mod-Enter": () => {
        if (this.editor.isActive("codeBlock")) {
          return commitActiveCodeBlockEdit(this.editor);
        }
        // Typora：表格内 ⌘/Ctrl+Enter 在下方插入一行并移到同列新行
        if (this.editor.isActive("table")) {
          if (!this.editor.can().addRowAfter()) return false;
          return this.editor.chain().focus().addRowAfter().command(({ state, dispatch }: any) => {
            try {
              const $cell = selectionCell(state);
              const $next = nextCell($cell, "vert", 1);
              if (!$next) return true;
              if (dispatch) {
                dispatch(state.tr.setSelection(TextSelection.between($next, moveCellForward($next))).scrollIntoView());
              }
              return true;
            } catch {
              return true;
            }
          }).run();
        }
        return false;
      },
      "Shift-Enter": () => {
        // Typora：表格内 Shift+Enter 为单元格内换行（hardBreak）
        if (this.editor.isActive("table")) {
          return this.editor.commands.setHardBreak();
        }
        return false;
      },
      Escape: () => {
        if (this.editor.isActive("codeBlock")) {
          return commitActiveCodeBlockEdit(this.editor);
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
        if (textBefore === "```sequence") {
          return clearTrigger().toggleCodeBlock({ language: "sequence" }).run();
        }
        if (textBefore === "```flow") {
          return clearTrigger().toggleCodeBlock({ language: "flow" }).run();
        }
        if (textBefore === "```") {
          return clearTrigger().toggleCodeBlock().run();
        }
        return false;
      },
      Enter: () => {
        if (this.editor.isActive("codeBlock")) {
          return this.editor.commands.newlineInCode();
        }
        // Typora：表格内 Enter → 同列下一行；末行则跳出表格
        if (this.editor.isActive("table")) {
          return moveToNextTableRowOrExit(this.editor);
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
        if (this.editor.isActive("codeBlock")) {
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
