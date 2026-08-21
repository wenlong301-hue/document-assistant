# 文档助手 · UI 规范

> 本文档从现有代码提炼，是界面实现的**唯一权威约束**。  
> 修改 / 新增 UI 时必须遵循；AI 改代码前先读本文档。  
> 与代码冲突时：**以本文档「锁定 token」为准**，再逐步把旧代码对齐。

---

## 0. 快速约束（必读）

1. **栈**：React 18 + UnoCSS 工具类 + 少量全局 Less（`src/styles/index.less`）。**不要**引入 Tailwind / Ant Design / MUI 等组件库。
2. **颜色**：业务 UI 使用下方「设计色板」的硬编码 hex（当前项目惯例）。**不要**用 `bg-primary` / `text-muted-foreground` 等 CSS 变量类（已定义但几乎未用，且与真实色不一致）。
3. **字体**：UI 文案 `PingFang SC`；品牌标题 `Alimama FangYuanTi VF`。
4. **默认字号**：界面正文 **14px**；次要说明 12–13px；弹窗标题 16px；编辑器正文 15px / 行高 1.8。
5. **圆角**：控件 6–8px；菜单项 4px；面板 12px；弹窗 16px。
6. **主按钮** = 黑底 `#131212` 白字，**不是**蓝色。蓝色 `#134CFF` 仅作强调（链接、拖拽、进度、品牌装饰）。
7. **危险色**：按钮/Toast 用 `#E53E3E`；菜单危险项用 `#FF4D4F` + 浅红底。
8. **输入聚焦边框** → `#131212`（不是蓝色 ring）。
9. **新弹窗** 对齐：`z-[400]` + `bg-black/20` + `rounded-[16px]` + 宽 400/520 + 阴影见下。
10. **新菜单** 优先复用 `src/app/components/shared/ContextMenu.tsx`，不要再抄一套。
11. **可滚动侧栏** 使用 `scroll-auto-hide` + `useAutoHideScrollbar`。
12. **文案**：产品界面中文；按钮/菜单动词简洁（新建、导出、分享、删除…）。
13. **不要**在组件里新写 scoped Less；样式优先 UnoCSS `className`，动态值再用 `style`。
14. **不要**提交 dark 主题实现（Less 有 dark 变量，产品固定 light）。

---

## 1. 技术与目录

| 层级 | 约定 |
|------|------|
| 入口 | `src/main.tsx`：`virtual:uno.css` → `./styles/index.less` |
| 配置 | `uno.config.ts`（presetUno + attributify） |
| 全局样式 | 仅 `src/styles/index.less`（滚动条、placeholder、prose 空段） |
| 壳 / 状态 | `src/app/components/DocumentAssistant.tsx` |
| 顶栏 | `src/app/components/layout/*` |
| 侧栏 / 树 | `sidebar/`、`outline/`、`file-tree/`、`project/` |
| 弹窗 / 工作区 | `src/app/document/*` |
| 编辑器 | `src/app/editor/*`（TipTap） |
| 共享菜单 | `src/app/components/shared/ContextMenu.tsx` |
| 设计 SVG 路径 | `src/imports/*`（Figma 导出，勿手改 path 语义） |
| 静态图标 | `public/icons/*` + `assetUrl()` |

**组织原则**：按功能目录放组件；**没有**独立 design-system 包。新增通用控件时：

- 菜单 → 扩展 `ContextMenu`
- Toast → 复用 `src/app/editor/ui/Toast.tsx`
- 弹窗 → 复制「规范弹窗结构」并抽公共时再抽，**禁止**各写各的 z-index / 遮罩

---

## 2. 设计色板（锁定）

### 2.1 中性色

| Token | Hex | 用途 |
|-------|-----|------|
| `ink` | `#131212` | 主文字、主按钮底、输入聚焦边、选中文字 |
| `body` | `#303133` | 正文说明（设置、确认文案） |
| `body-secondary` | `#606266` | 次级正文、表单 label |
| `muted` | `#8D8E99` | 次要文字、未选中树节点、图标 idle |
| `placeholder` | `#C0C4CC` | placeholder、主按钮 disabled 底 |
| `border` | `#EBECF0` | 默认边框、分割线、选中行底、按压底 |
| `border-modal` | `#E0E0E0` | 弹窗外框 |
| `bg-page` | `#F7F8FA` | 页面底、次要 hover 底 |
| `bg-row-hover` | `#F5F6F8` | 树/列表 hover（未选中） |
| `bg-selected` / `bg-press` | `#EBECF0` | 选中行、active 按压 |
| `bg-close-press` | `#DDDEE3` | 关闭按钮 active |
| `surface` | `#FFFFFF` | 卡片、弹窗、编辑器面板 |
| `code-bg` | `#F6F7FA` | 代码块/图表源码区背景 |
| `code-border` | `#E8E9EE` | 代码块描边、代码块内分割线 |
| `code-text` | `#3F4046` | 代码块正文 |

### 2.2 语义色

| Token | Hex | 用途 |
|-------|-----|------|
| `accent` | `#134CFF` | 品牌蓝、链接、拖拽 ring、进度条、插画填充 |
| `accent-stroke` | `#0012DD` | 插画描边（更深蓝） |
| `success` | `#15803D` | 成功 Toast、分享开启文案、更新徽章 |
| `success-toggle` | `#2AB673` | 分享开关开启轨 |
| `ink-toggle` | `#131212` | 编辑器底栏「自动保存」开启轨（关闭轨 `#EBECF0`，滑块对侧） |
| `danger` | `#E53E3E` | 危险主按钮、错误 Toast、错误文案 |
| `danger-menu` | `#FF4D4F` | 菜单危险项文字 |
| `danger-hover-bg` | `#FFF1F0` | 危险菜单 hover 底 |
| `danger-active-bg` | `#FFE4E1` | 危险菜单 active 底 |

### 2.3 遮罩与阴影

```
遮罩-标准：  bg-black/20     （多数弹窗）
遮罩-加重：  bg-black/36     （仅设置/添加项目历史用法；新弹窗统一用 /20）

阴影-弹窗：  0 16px 32px -8px rgba(36,36,36,0.12)
阴影-轻确认：0 2px 12px 0 rgba(0,0,0,0.1)
阴影-菜单：  0 12px 16px -4px rgba(36,36,36,0.08)
阴影-设置：  0 8px 32px rgba(0,0,0,0.16)
```

### 2.4 禁止

- 禁止使用 Less 中 `--primary: #030213`、`--destructive: #d4183d` 作为业务色（与真实 UI 不一致）。
- 禁止随意新增第三套灰/蓝；需要新色先改本文档再落代码。
- 十六进制大小写：新代码统一 **大写 6 位**（`#EBECF0`），避免 `#ebecf0` / `#E0E0E0` 混用。

---

## 3. 字体与排版

| 场景 | 字体 | 字号 | 字重 | 行高 |
|------|------|------|------|------|
| 品牌标题「文档助手」 | Alimama FangYuanTi VF SemiBold | 18px | semibold | normal |
| 弹窗标题 | PingFang SC Medium | 16px | medium | 24px |
| 顶栏文档名 | PingFang SC | 20px | medium | — |
| 界面正文 / 按钮 / 列表 | PingFang SC Regular | **14px** | normal / medium | 20px 或 leading-none（按钮） |
| 次要说明 | PingFang SC | 13px | normal | 18px |
| 辅助 / 表头 / 徽章 | PingFang SC | 12px | normal / medium | — |
| 版本号等 | PingFang SC | 10px | normal | — |
| 编辑器正文 | 系统/继承 | **15px** | normal | **1.8** |

**写法约定：**

```tsx
// 推荐：class 指定字体栈
className="font-['PingFang_SC:Regular',sans-serif] text-[14px] text-[#131212]"

// 动态色可 style；避免 class + style 重复写同一 fontFamily
style={{ fontFamily: "PingFang SC, sans-serif" }}
```

品牌标题保留 `fontVariationSettings: '"BEVL" 1'`。

---

## 4. 布局几何（壳层）

产品主界面为 **绝对定位壳**（非 flex 三栏栅格），关键魔数：

| 尺寸 | 值 | 说明 |
|------|-----|------|
| 顶栏高度 | **66px** | `TopBar` `h-[66px]`；编辑区 `top: 66` |
| 顶栏左右 | pl 20 / pr 8 / py 16 | |
| 侧栏宽度 | **276px** | 搜索、模式头、树一致 |
| 侧栏左边距 | 20px | |
| 搜索区 top | 78px | |
| 模式头 top | 122px | |
| 文件树 top | 158px | |
| 大纲列表 top | 210px | |
| 侧栏树 bottom | **40px** | 与底部分享条对齐；`top`+`bottom` 定高，禁止用不可靠的 `maxHeight: calc(100% - N)` |
| 分享条高度 | **40px** | `SidebarShareStatus` 贴底；`z-[2]` + 页底色遮挡，防止树内容透出分割线 |
| 编辑器 inset | left=`sidebar+32`，right=8，top=66，bottom=8 | 圆角 12px 白底 |
| 编辑器标题条 | 高 60，px 24 | |
| 编辑器工具栏 | 高 62 | |
| 编辑器状态栏 | 高 44 | |
| 内容最大宽 | 1248px | 水平 pad 24 |

**间距刻度（优先）：** 4 · **8** · 12 · 16 · **24** · 32。  
控件高度：工具图标 24 · 行高 32/36 · 输入 32/36/40 · 关闭 28。

**圆角：**

| 级别 | 值 | 用途 |
|------|-----|------|
| sm | 4px | 菜单项、工具按钮 |
| md | 6px | 弹窗主/次按钮、部分输入 |
| control | **8px** | 搜索框、列表行、多数按钮、菜单面板 |
| panel | 12px | 编辑器卡片、选择器 |
| modal | **16px** | 弹窗外壳 |

---

## 5. 组件规范

### 5.1 弹窗 Modal

**标准结构（新建弹窗必须照抄）：**

```tsx
<div
  className="fixed inset-0 z-[400] flex items-center justify-center"
  onClick={onClose}
>
  <div className="absolute inset-0 bg-black/20" />
  <div
    className="relative bg-white rounded-[16px] w-[520px] border border-[#E0E0E0]
      shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] overflow-hidden"
    onClick={(e) => e.stopPropagation()}
  >
    {/* header: px-[24px]，标题 16 Medium，关闭 28×28 */}
    {/* body: px-[24px] */}
    {/* footer: flex justify-end gap-[12px]，取消 + 主按钮 */}
  </div>
</div>
```

| 类型 | 宽度 | z-index | 备注 |
|------|------|---------|------|
| 表单/导出/分享 | 520 | 400 | Enter 确认，Esc 关闭 |
| 设置 / 添加项目 | 400 | 400（新代码） | 历史为 100，改造时抬升 |
| 删除确认 | 520 | 400 | 与新建/分享同壳；主文案 + 次要说明排版 |
| 关闭确认 | 520 | **500** | 与分享弹窗同壳；z 最高，盖住其他弹窗 |
| 更新 | 520 | 400 | 与分享弹窗同壳 |
| 帮助 | min(920,94vw)×min(720,88vh) | 400 | 双栏 |
| 编辑器浮层（链接） | 360 | 300 | 无全屏遮罩时可 portal |

**关闭按钮：**

```tsx
<button
  type="button"
  className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0
    bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#DDDEE3]
    transition-colors cursor-pointer outline-none appearance-none"
>
  {/* 16×16 X，strokeWidth 1.2 */}
</button>
```

**行为：** 点击遮罩关闭（确认类可例外）；内容区 `stopPropagation`；支持 Esc；表单支持 Enter 提交。

### 5.2 按钮

无统一 `Button` 组件；**新代码按下列变体写**，高度优先 **32**，圆角优先 **6**（与较新的 NewDoc/Export 一致）。

**主按钮 Primary**

```tsx
className="h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px]
  font-normal leading-none inline-flex items-center justify-center cursor-pointer
  hover:opacity-90 active:opacity-80 transition-opacity
  disabled:bg-[#C0C4CC] disabled:cursor-not-allowed disabled:opacity-100"
```

**次按钮 Secondary（取消）**

```tsx
className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white
  text-[#131212] text-[14px] font-normal leading-none inline-flex items-center justify-center
  cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors"
```

**顶栏幽灵按钮**：白底 + 边框 `#EBECF0`，hover `#F7F8FA`；可带 `active:scale-95`。

**危险实心**：`bg-[#E53E3E] text-white hover:opacity-90`。

**工具栏图标钮**：`size-[24px] rounded-[4px] hover:bg-[#EBECF0]`；选中 `bg-[#EBECF0]`；`focus-visible:outline-2 outline-[#134CFF]`。

**禁用 chrome**（顶栏保存等）：`opacity-40 cursor-not-allowed`。

### 5.3 输入框

```tsx
// 标准搜索 / 文本
className="h-[32px] rounded-[8px] border border-solid border-[#EBECF0] bg-white
  text-[14px] text-[#131212] outline-none
  focus:border-[#131212] placeholder:text-[#C0C4CC] transition-colors"

// 弹窗内较高输入
// h-[36px] 或 h-[40px]，px-[12px]/[16px]，圆角 6–8，聚焦边框同样 #131212
```

左侧图标搜索：左 padding `pl-[32px]`，图标 16 绝对定位。

### 5.4 上下文菜单

**必须**使用 `ContextMenuPanel` + `ContextMenuItem`：

| 项 | 值 |
|----|-----|
| 面板 | 白底、`border-[#EBECF0]`、`rounded-[8px]`、`p-[8px]`、`gap-[4px]`，默认宽 158 |
| 阴影 | `0px 12px 16px -4px rgba(36,36,36,0.08)` |
| 项高 | 32px，`px-[12px]`，`gap-[8px]`，`rounded-[4px]`，字 14 |
| 默认 hover | `#F7F8FA`；active `#EBECF0` |
| 危险项 | 字 `#FF4D4F`，hover 底 `#FFF1F0` |
| 图标槽 | 16×16 |
| 关闭 | mousedown outside + Escape |

### 5.5 Toast

`src/app/editor/ui/Toast.tsx`（全应用复用）：

```
位置：fixed top-16 left-1/2 -translate-x-1/2 z-[300]
样式：白字 14，px-16 py-8，rounded-8，shadow-lg，pointer-events-none
颜色：success #15803D | error #E53E3E | info #131212
时长：2500ms 自动消失
```

### 5.6 列表 / 树节点

| 状态 | 背景 | 文字/图标 |
|------|------|-----------|
| 默认 | 透明 | `#8D8E99` |
| Hover | `#F5F6F8` | `#131212` |
| 选中 | `#EBECF0` | `#131212` |
| 拖拽目标 | `ring-[1.5px] ring-inset ring-[#134CFF]` | — |

- 行高 **36px**，圆角 **8px**，字 **14px**，truncate。
- 缩进：`paddingLeft = 8 + depth * 16`。
- 「更多 / 拖拽柄」：仅 `selected || hovered` 时可见。

### 5.7 空状态

- 居中插画（SVG 组件或 `public` 图）+ `text-[14px] text-[#8D8E99]`。
- 可操作词用 `font-semibold text-[#131212]` 强调（如「添加项目」）。
- 文案示例：`暂无文件`、`无匹配结果`、`暂无标题`。

### 5.8 图标

| 来源 | 用法 |
|------|------|
| `public/icons/*.svg` | `assetUrl("icons/...")` |
| `src/imports/*/svg-*.ts` | Figma path，按现有 Icon 组件渲染 |
| 内联 SVG | 默认 16×16，`strokeWidth="1.2"`，`strokeLinecap="round"`，色随文字 |

图标色：idle `#8D8E99`，active/selected `#131212`。  
工具栏 hit area 常 24，内部 icon 约 16–20 viewBox。

---

## 6. 交互约定

| 场景 | 行为 |
|------|------|
| Hover 面 | 按钮/菜单 `#F7F8FA`；树行 `#F5F6F8` |
| Press | `#EBECF0` 或 `#DDDEE3`；主按钮改 opacity |
| 选中 | 底 `#EBECF0` + 字 `#131212` |
| 禁用 | `opacity-40/50/60` + `cursor-not-allowed`；主按钮禁用改底色 `#C0C4CC` |
| 过渡 | `transition-colors duration-150` 默认；开关可 300ms |
| 滚动条 | 全局 6px；侧栏用 `.scroll-auto-hide`，悬停/滚动时显示 thumb |
| 层级 | 见下表，**新增层只能插入空档，勿随意 z-50/z-100 打架** |

**Z-index 阶梯：**

```
1–2     编辑器面板内部
50      ContextMenu 默认
200     文件树右键（历史）
260     编辑器工具栏
280     取色/表格浮层/斜杠菜单
290     tooltip
300     Toast、链接弹层
400     标准对话框
500     关闭确认（最高）
```

---

## 7. 样式写法约定

| 方式 | 何时用 |
|------|--------|
| UnoCSS `className` | **默认**，布局/色/间距/圆角 |
| `style={{}}` | 动态 left/top、树缩进、运行时色、分享开关 |
| 组件内 `<style>` | 仅编辑器 prose / 表格等复杂选择器（已有模式） |
| Less | **仅**全局 `index.less`；禁止新建组件 less |
| CSS 变量 Uno theme | 暂不扩展业务依赖 |

**class 习惯：**

- 任意值：`text-[14px]`、`h-[32px]`、`rounded-[8px]`、`bg-[#131212]`
- 布局：`flex items-center gap-[8px]`、`truncate`、`min-w-0`
- 按钮去默认：`border-0 p-0 outline-none appearance-none cursor-pointer`
- 快捷：`size-full`（uno shortcut）

---

## 8. 文案与产品语气

- 界面语言：**简体中文**。
- 按钮：动宾或单字动词（保存、导入、导出、分享、删除、取消、确定、新建…）。
- 确认删除：说明不可恢复后果，主操作危险色。
- 空状态：短句 + 指向明确操作。
- 不要英文 UI 混排（代码、路径、扩展名除外：`.mdoc` / `.md`）。

---

## 9. 编辑器相关（摘要）

- 引擎：TipTap 3；工具栏、斜杠命令、Markdown 快捷输入保持现有扩展。
- 正文：15px / 1.8；预览 class `prose-preview` / `doc-tiptap-content`。
- 空段落保留高度（全局 Less 已处理），勿删相关规则。
- 调色板色表见 `src/app/editor/constants.ts`（内容色，**不是** chrome UI 色）。
- **图表代码块（mermaid / sequence / flow）交互**：
  1. 默认：仅渲染预览图（`is-preview`），不展开源码。
  2. 点击预览区域 → 在预览**上方**出现高 **20px** 的下拉条（`doc-diagram-expand-bar` / `is-armed`），条上为语言名 + 下拉箭头；**不要**直接展开源码。
  3. 再点击该 20px 条 → 源码区高度过渡展开进入编辑（`is-editing`，约 280ms；`prefers-reduced-motion` 时无动画）。
  4. 失焦 / 选区离开 / Esc → 源码区高度过渡收起，退出编辑并收起武装条，回到预览。
  5. 普通非图表代码块仍为点进即编辑，不受此两步交互影响。

---

## 10. AI / 开发检查清单

改 UI 或新增界面时自检：

- [ ] 颜色是否落在第 2 节色板内？
- [ ] 主操作是否为黑底 `#131212`（而非蓝底）？
- [ ] 字号是否为 12/13/14/16 体系？字体是否 PingFang SC？
- [ ] 弹窗是否 z-400 + black/20 + rounded-16 + 规范阴影？
- [ ] 菜单是否复用 ContextMenu？
- [ ] 列表选中/hover 是否符合第 5.6 节？
- [ ] 危险操作颜色是否正确分流（按钮 vs 菜单）？
- [ ] 是否避免引入新 UI 库 / 新全局 CSS 框架？
- [ ] 滚动容器是否需要 `scroll-auto-hide`？
- [ ] 中文文案是否简洁一致？

---

## 11. 已知历史债（改到再对齐，勿扩散）

1. `SettingsModal` / `AddProjectModal`：z-index 100、遮罩 black/36 → 新代码用 400 + /20。
2. 按钮高度/圆角：`h-32 rounded-6` 与 `h-34/36 rounded-8` 并存 → **新代码统一 h-32 rounded-6**。
3. 危险色 `#E53E3E` / `#FF4D4F` / token `#d4183d` 三套 → 按第 2.2 节分流。
4. hex 大小写混用 → 新代码统一大写。
5. CSS 变量主题与真实 hex 不一致 → 未完成 token 迁移前禁止用变量类。
6. `DocumentAssistant.tsx` / `RichEditorTiptap.tsx` 体量过大 → 新功能优先拆到子组件，勿继续堆巨型文件。
7. Figma 半像素 padding（`py-[9.5px]`）→ 新代码用整数。

---

## 12. 变更流程

1. 需要新颜色 / 新层级 / 新控件范式 → **先改本文档**，再写代码。
2. 大范围视觉统一 → 优先抽 `Button` / `Modal` 公共组件，并回写本节。
3. 版本记录：视觉规范变更可在 `CHANGELOG.md` 记一条「UI 规范」。

---

**维护说明：** 本文档描述的是 2026-08 代码库中的**实际高频用法**，不是理想设计系统。目标是约束一致性；与设计稿冲突时以产品已上线交互为准，并更新本文档。
