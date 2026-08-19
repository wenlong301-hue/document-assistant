# Agent 约束（文档助手）

修改本仓库 UI / 前端时，**必须先读并遵守** [UI规范.md](./UI规范.md)。

## 硬性规则（摘要）

1. 技术栈：React + UnoCSS + 全局 `src/styles/index.less`。禁止引入 Ant Design / MUI / Tailwind 等。
2. 颜色用规范色板硬编码 hex（如 `#131212`、`#EBECF0`、`#8D8E99`、`#F7F8FA`、`#134CFF`）。不要用 `bg-primary` 等未落地的 CSS 变量类。
3. 主按钮 = 黑底白字 `#131212`，不是蓝色。蓝 `#134CFF` 仅强调（链接、拖拽、进度）。
4. 字体：UI 用 PingFang SC；正文字号默认 14px；弹窗标题 16px；编辑器正文 15px/1.8。
5. 新弹窗：`z-[400]` + `bg-black/20` + `rounded-[16px]` + 宽 520（含删除确认）+ 阴影 `0 16px 32px -8px rgba(36,36,36,0.12)`。
6. 新菜单：复用 `src/app/components/shared/ContextMenu.tsx`。
7. Toast：复用 `src/app/editor/ui/Toast.tsx`。
8. 列表/树：行高 36、圆角 8；hover `#F5F6F8`；选中 `#EBECF0`；idle 字色 `#8D8E99`。
9. 危险：按钮/Toast `#E53E3E`；菜单项 `#FF4D4F` + `#FFF1F0` hover。
10. 输入聚焦边框 `#131212`（非蓝 ring）。
11. 侧栏滚动：`scroll-auto-hide` + `useAutoHideScrollbar`。
12. 界面中文；不扩散历史债（错误 z-index、半像素 padding、新 UI 库）。
13. 需要新色/新层级/新控件范式：先更新 `UI规范.md` 再写代码。

完整色板、尺寸、组件模板与检查清单见 **UI规范.md**。
