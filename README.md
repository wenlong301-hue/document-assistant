# 文档助手（Doc Assistant）

本地优先的**多级文档写作工具**：用大纲树管理章节结构，用富文本编辑正文，支持**局域网分享预览**与 **HTML / Markdown / Word / PDF** 导出。

| 项 | 说明 |
|----|------|
| 产品名 | 文档助手 |
| 版本 | 0.1.2 |
| 原生格式 | `.mdoc`（JSON） |
| 桌面端 | Electron（macOS / Windows） |
| Web 端 | Vite + React（浏览器预览，功能子集） |
| 安装包 | [GitHub Releases](https://github.com/wenlong301-hue/document-assistant/releases) |

完整用户说明见 [使用手册.md](./使用手册.md)。应用内顶栏 **帮助** 也可快速查阅。

---

## 功能亮点

- **文档 + 大纲双模式**：列表管理多篇文档，大纲树管理章节（约 6 层）
- **富文本编辑**：标题/字体/列表/任务/表格/链接/图片/视频/附件；支持 `/` 斜杠命令（删掉 `/` 自动关闭）与 Markdown 快捷输入
- **局域网分享**：桌面端开启后，同一 Wi-Fi 用浏览器打开预览（端口 `6535`）；手机支持多级目录抽屉
- **多格式导出**：HTML 预览页、Markdown、Word（.docx）、PDF
- **导入**：`.mdoc` / `.md` / `.txt` / `.docx`
- **本地存储**：桌面写入 `文档/DocAssistant/*.mdoc`；Web 使用 IndexedDB

---

## 界面结构

```
顶栏：文档助手 | 保存 · 导入 · 导出 · 分享 · 删除 · 帮助
左侧：搜索 · 文档/大纲 · 列表或大纲树 · 分享状态
右侧：标题 + 富文本编辑器 + 底栏（保存状态 / 字数 / 大纲）
```

遮罩弹窗（分享/导出/删除/帮助/新建等）层级高于编辑器浮动层（如图片宽度条、斜杠菜单），避免互相遮挡。

---

## 快速开始（用户）

1. 从 [Releases](https://github.com/wenlong301-hue/document-assistant/releases) 下载：
   - macOS：`DocAssistant-*-mac-arm64.dmg`
   - Windows：`DocAssistant-*-win-x64.exe`
2. 安装并打开（当前为**未签名**构建）：
   - **macOS**：拖入「应用程序」后，若提示「无法验证开发者」→ **右键 → 打开**，或在「隐私与安全性」中允许
   - **macOS 若提示「已损坏，无法打开」**：这是隔离属性误报，**不要**移到废纸篓，在终端执行：
     ```bash
     xattr -cr "/Applications/文档助手.app"
     ```
     再打开；详见 [使用手册 §2.2](./使用手册.md#22-macos-安装)
   - **Windows**：SmartScreen 提示时选「仍要运行」
3. **新建文档** → 切到 **大纲** → 写作 → **保存 / 分享 / 导出**

更细的操作步骤、快捷键与 FAQ 见 [使用手册.md](./使用手册.md)。

---

## 开发环境

### 环境要求

- Node.js 20+（推荐）
- npm

### 安装与运行

```bash
npm install

# 开发（Electron + Vite 热更新）
npm run dev
# 或
npm run electron:dev

# 仅构建前端
npm run build

# 本地预览打包结果（不装系统安装包）
npm run electron:preview
```

### 打包

```bash
# 当前平台
npm run electron:build

# 指定平台
npm run electron:mac
npm run electron:win
```

产物目录：`安装包/`（已在 `.gitignore` 中忽略）

产物命名：`DocAssistant-${version}-${os}-${arch}.${ext}`

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron |
| 前端 | React 18、Vite 6、Tailwind CSS 4 |
| 编辑器 | TipTap 3 |
| 导入导出 | mammoth（docx）、html-to-docx、marked/turndown、printToPDF |
| 桌面存储 | 用户文档目录 `DocAssistant/*.mdoc` |
| Web 存储 | IndexedDB（失败可回退 localStorage） |
| 分享 | 本地 HTTP 服务 `0.0.0.0:6535` |

### 目录结构（简要）

```
document-assistant/
├── electron/           # 主进程、preload、开发启动
│   ├── main.cjs
│   ├── preload.cjs
│   └── dev.cjs
├── src/
│   ├── app/
│   │   ├── components/DocumentAssistant.tsx   # 主界面壳
│   │   ├── document/   # 大纲/存储/预览 HTML/弹窗
│   │   └── editor/     # TipTap 编辑器与工具栏
│   └── imports/        # 设计资源 SVG
├── build/              # 图标等
├── .github/workflows/release.yml  # tag 触发自动发版
├── 使用手册.md
└── package.json
```

---

## 桌面端 vs Web 端

| 能力 | 桌面 Electron | Web |
|------|---------------|-----|
| 编辑 / 大纲 | ✅ | ✅ |
| 本地 `.mdoc` 目录 | ✅ | ❌（IndexedDB） |
| 局域网 HTTP 分享 | ✅ | ❌（仅本机预览/下载 HTML） |
| 导出 Word/PDF/MD | 系统另存为 | 浏览器下载；PDF 走打印 |
| 文件关联 `.mdoc` | 视系统 | 无 |

---

## 发布流程（CI）

推送符合 `v*` 的 tag（如 `v0.1.2`）会触发 GitHub Actions：

1. 在 `windows-latest` / `macos-latest` 分别 `npm ci` → 构建 → `electron-builder`
2. 将安装包上传到 GitHub Release「文档助手 {tag}」

Workflow：`.github/workflows/release.yml`

本地发版示例：

```bash
# 先改 package.json version，再提交
git tag -a v0.1.2 -m "v0.1.2"
git push origin v0.1.2
```

---

## 使用与限制摘要

- **分享**：电脑与应用需保持开启；端口 `6535`；同一局域网
- **预览收录**：空内容或「预览时隐藏本层」的节点不会进入分享/导出章节
- **媒体限制**：图片源约 20MB / 嵌入约 4MB；视频 20MB；附件 10MB；不支持 SVG
- **PDF**：不含视频
- **签名**：当前 Release 默认未签名。macOS 首次打开需右键打开/隐私与安全性允许；若提示「已损坏」请用 `xattr -cr "/Applications/文档助手.app"` 清除隔离标记（见使用手册）
- **Web 存储**：大媒体易触发浏览器配额，重要数据请导出备份

---

## 文档

| 文档 | 说明 |
|------|------|
| [使用手册.md](./使用手册.md) | 面向最终用户的完整操作说明 |
| 应用内 **帮助** | 顶栏入口，快速查阅功能与 FAQ |
| [Releases](https://github.com/wenlong301-hue/document-assistant/releases) | 安装包下载 |
| [Issues](https://github.com/wenlong301-hue/document-assistant/issues) | 问题反馈 |

---

## License

Private（`package.json` 中 `"private": true`）。如需开源协议请另行补充。
