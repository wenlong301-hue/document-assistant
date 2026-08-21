export const applyTextAlignCommand = (activeEditor: any, align: "left" | "center" | "right" | "justify") => {
  if (activeEditor.chain().focus().setTextAlign(align).run()) return true;
  const { state, view } = activeEditor;
  const { $from, from, to } = state.selection;
  const types = new Set(["paragraph", "heading"]);
  const tr = state.tr;
  let changed = false;
  const applyAt = (pos: number, node: any) => {
    if (!types.has(node.type.name)) return;
    if (node.attrs?.textAlign === align) return;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: align });
    changed = true;
  };
  if (from === to) {
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (types.has(node.type.name)) {
        applyAt($from.before(depth), node);
        break;
      }
    }
  } else {
    state.doc.nodesBetween(from, to, (node: any, pos: number) => {
      applyAt(pos, node);
    });
  }
  if (!changed) {
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (types.has(node.type.name)) {
        applyAt($from.before(depth), node);
        break;
      }
    }
  }
  if (changed) {
    view.dispatch(tr);
    activeEditor.commands.focus();
    return true;
  }
  return false;
};

export const applyIndentCommand = (activeEditor: any, dir: 1 | -1) => {
  if (activeEditor.isActive("taskItem")) {
    return dir > 0
      ? activeEditor.chain().focus().sinkListItem("taskItem").run()
      : activeEditor.chain().focus().liftListItem("taskItem").run();
  }
  if (activeEditor.isActive("listItem")) {
    return dir > 0
      ? activeEditor.chain().focus().sinkListItem("listItem").run()
      : activeEditor.chain().focus().liftListItem("listItem").run();
  }
  return dir > 0
    ? activeEditor.chain().focus().indent().run()
    : activeEditor.chain().focus().outdent().run();
};

export const applyTableAlignCommand = (activeEditor: any, align: "left" | "center" | "right") => {
  const { state, view } = activeEditor;
  const { selection } = state;
  const types = new Set(["paragraph", "heading"]);
  const tr = state.tr;
  let changed = false;

  const applyTextAt = (pos: number, node: any) => {
    if (!types.has(node.type.name) || node.attrs?.textAlign === align) return;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: align });
    changed = true;
  };

  const applyCellAt = (pos: number, node: any) => {
    if (!(node.type.name === "tableCell" || node.type.name === "tableHeader")) return;
    if (node.attrs?.align === align) return;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, align });
    changed = true;
  };

  if (typeof selection.forEachCell === "function") {
    selection.forEachCell((cell: any, cellPos: number) => {
      applyCellAt(cellPos, cell);
      cell.forEach((child: any, offset: number) => applyTextAt(cellPos + 1 + offset, child));
    });
  } else {
    const { from, to, $from } = selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        applyCellAt($from.before(depth), node);
        break;
      }
    }
    if (from === to) {
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth);
        if (types.has(node.type.name)) {
          applyTextAt($from.before(depth), node);
          break;
        }
      }
    } else {
      state.doc.nodesBetween(from, to, (node: any, pos: number) => applyTextAt(pos, node));
    }
  }

  if (!changed) return false;
  view.dispatch(tr);
  activeEditor.commands.focus();
  return true;
};
