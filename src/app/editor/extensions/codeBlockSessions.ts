/** 代码块编辑会话（图表/普通）：按 editor+pos 记录，NodeView 重建后恢复 */
export const codeBlockEditSessions = new WeakMap<object, {
  pos: number;
  diagram: boolean;
}>();

/** 图表预览武装态：NodeView 重建后恢复 20px 下拉条 */
export const codeBlockArmedSessions = new WeakMap<object, { pos: number }>();

/** 图表预览缓存：NodeView 重建后立刻还原 SVG，避免展开时重新加载 */
export const codeBlockPreviewCache = new WeakMap<object, Map<number, { source: string; html: string }>>();

export type CodeBlockEditController = {
  commit: () => void;
  isActive: () => boolean;
  hasSelection: () => boolean;
};

/** 当前编辑中的代码块控制器：失焦/Esc 时提交并退出编辑 */
export const codeBlockEditControllers = new WeakMap<object, Set<CodeBlockEditController>>();

const pickActiveCodeBlockController = (editor: any) => {
  const set = codeBlockEditControllers.get(editor);
  if (!set || set.size === 0) return null;
  let fallback: CodeBlockEditController | null = null;
  for (const ctrl of set) {
    if (!ctrl.isActive()) continue;
    if (ctrl.hasSelection()) return ctrl;
    if (!fallback) fallback = ctrl;
  }
  return fallback;
};

/** 提交当前代码块编辑并退出编辑态（保留已改内容） */
export const commitActiveCodeBlockEdit = (editor: any) => {
  const ctrl = pickActiveCodeBlockController(editor);
  if (!ctrl) return false;
  ctrl.commit();
  return true;
};
