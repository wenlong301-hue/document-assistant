# 文档助手（Doc Assistant）

文档助手是一款本地优先的多级文档写作、整理和分享工具。它把一篇长文拆成可管理的大纲节点，每个节点都有独立正文，适合编写产品说明、操作手册、技术方案、会议纪要、知识库和项目文档。

应用支持桌面端 Electron 运行，核心数据保存在本机；也支持浏览器 Web 端作为功能子集使用。桌面端可打开普通本地文件夹作为项目，管理 `.mdoc`、`.md`、`.html`、`.htm`、`.txt`、`.docx`、`.sql` 等文档文件，并提供局域网只读分享、HTML / Markdown / Word / PDF 导出和 GitHub Releases 自动更新。

| 项 | 说明 |
|----|------|
| 产品名 | 文档助手 |
| 当前版本 | 0.1.14 |
| 原生格式 | `.mdoc`（JSON，保存大纲树与各节点 HTML 正文） |
| 桌面端 | Electron，支持 macOS / Windows |
| Web 端 | Vite + React，支持编辑与导出功能子集 |
| 安装包 | [GitHub Releases](https://github.com/wenlong301-hue/document-assistant/releases) |
| 使用说明 | [使用手册.md](./使用手册.md) |

---

## 功能概览

- **多级大纲写作**：用大纲树组织章节，支持新增、重命名、克隆、删除、展开收起、拖拽排序和预览隐藏。
- **富文本编辑器**：基于 TipTap，支持标题、字体、字号、颜色、高亮、列表、任务、引用、代码块、链接、图片、视频、附件和表格。
- **Markdown 快捷输入**：支持 `#`、`>`、`1.`、`-`、``` ``` 等常见 Markdown 行首快捷转换。
- **斜杠命令**：在空行输入 `/` 快速插入标题、列表、引用、代码块、链接、媒体、附件和表格。
- **本地文件夹项目**：可打开任意本地文件夹，以文件树形式管理支持的文档文件，项目文件直接读写原路径。
- **Markdown 原文件编辑**：从文件夹打开 `.md` 时显示 Markdown 内容，保存时写回同一个 `.md` 文件，不再创建隐藏 `.mdoc` 副本。
- **文档预览保护**：文档模式下可预览已打开文件内容；保存 Markdown 时若转换结果为空，会阻止覆盖已有内容。
- **HTML 往返导入**：文档助手导出的 HTML 内嵌文档状态，再导入时可恢复大纲树与节点正文。
- **局域网分享**：桌面端开启 `6535` 端口，同一 Wi-Fi 下可用电脑或手机浏览器只读预览。
- **多格式导出**：支持 HTML、Markdown、Word `.docx`、PDF。
- **本地存储与自动保存**：桌面端默认写入用户文档目录 `DocAssistant/*.mdoc`；Web 端写入 IndexedDB。
- **自动更新**：桌面端启动后静默检查 GitHub Releases；帮助页支持手动检查、下载和安装更新。

---

## 典型使用场景

- 编写产品用户手册、上线说明、FAQ 和培训资料。
- 按章节维护技术方案、接口说明、架构文档和项目交付文档。
- 将一个本地资料文件夹作为项目，集中浏览和编辑 `.mdoc`、`.md`、`.html`、`.docx`、`.sql` 等文件。
- 临时开启局域网分享，让同事或手机端快速预览当前文档。
- 将大纲化内容导出为 HTML 离线页、Markdown、Word 或 PDF。

---

## 快速开始（用户）

1. 从 [Releases](https://github.com/wenlong301-hue/document-assistant/releases) 下载安装包。
2. 安装并打开应用。
3. 新建文档，进入大纲树，开始编写内容。
4. 需要管理已有资料时，进入项目视图并打开本地文件夹。
5. 需要分享时，选中文件或文档，点击顶栏 **分享**。
6. 需要分发时，点击顶栏 **导出**，选择 HTML / Markdown / Word / PDF。

macOS 当前为未签名构建，若提示无法验证开发者，请右键打开；若提示应用已损坏，请执行：

```bash
xattr -cr "/Applications/文档助手.app"
```

详细安装、操作和 FAQ 见 [使用手册.md](./使用手册.md)。

---

## 文件与存储策略（产品 A：三层格式）

```text
L1 权威存储（对内，无损）
   .mdoc = 大纲树 + 节点 HTML + 元数据

L2 项目原文件（打开什么存什么）
   .md / .txt / .html / .docx / .sql
   - 未编辑：原样字节/原文写回
   - 已编辑：按扩展名最优策略写回（可能有损）

L3 导出交换（尽力而为，可能有损）
   HTML / Markdown / Word / PDF
```

### L1 · `.mdoc` 原生文档（推荐精编）

`.mdoc` 是文档助手的权威格式，本质是 JSON，包含：

- 文档名称
- 大纲树结构
- 每个节点的正文 HTML
- 更新时间

它最适合在文档助手中往返编辑，也最能完整保留大纲与富文本内容。默认库与「另存」均以 `.mdoc` 为主。

### L2 · 项目文件直接保存

本地文件夹项目中的文件遵循“打开什么文件，就保存回什么文件”：

- 打开 `.mdoc`：读取并保存同一个 `.mdoc` 原文件（L1 无损）。
- 打开 `.md` / `.txt` / `.html` / `.htm` / `.docx` / `.sql`：
  - **未编辑**：原样写回，不做规范化。
  - **已编辑**：按该格式最优策略写回（如 docx 优先 patch 原包，md 经 HTML→Markdown，txt 保留空格与换行风格）。

应用不再为项目中的 `.md` 或 `.mdoc` 创建同名隐藏副本，也不再因为文件名相同去读取默认库中的另一个版本。只有在应用内新建、未绑定项目路径的文档，才会保存到默认库。

为避免误操作导致 Markdown 被清空，`.md` 写回前会检查转换结果；如果结果为空且原文件已有内容，会阻止覆盖并提示保存失败。

### L3 · 导出交换

顶栏「导出」生成 HTML / Markdown / Word / PDF，用于预览、二次编辑或分发。跨格式转换**可能丢失**复杂排版、连续空格、主题字体等；需要无损往返请用 `.mdoc`。

### 桌面端默认库

桌面端默认文档库位于用户文档目录：

```text
~/Documents/DocAssistant/*.mdoc
```

---

## 界面结构

```text
  顶栏：文档助手 | 保存 · 导入 · 导出 · 分享 · 删除 · 帮助 · 更多（另存为 .mdoc）
左侧：搜索 · 文件树/大纲树 · 文档列表/项目文件树/大纲树 · 分享状态
右侧：标题 + 格式徽章 + 富文本编辑器

快捷键：Ctrl/Cmd+S 保存 · Ctrl/Cmd+Shift+S 另存为 .mdoc（并自动打开新文件）
```

---

## 支持格式

| 格式 | 层级 | 读取 | 编辑保存 | 导出 | 说明 |
|------|------|------|----------|------|------|
| `.mdoc` | L1 | 支持 | 写回 `.mdoc` | 支持 | 权威格式，推荐长期精编 |
| `.md` | L2 | 支持 | 未编辑原样 / 已编辑再生成 | 支持 | 项目原文件轻编辑 |
| `.html` / `.htm` | L2 | 支持 | 未编辑原样 / 已编辑写预览 HTML | 支持 | 文档助手导出的 HTML 可恢复大纲 |
| `.txt` | L2 | 支持 | 未编辑原样 / 已编辑保真纯文本 | 可导出其它格式 | 空格与换行尽量保留 |
| `.sql` | L2 | 支持 | 未编辑原样 / 已编辑保真纯文本 | 可导出其它格式 | 以代码块展示，空格与换行尽量保留 |
| `.docx` | L2 | 支持 | 未编辑原样 / 已编辑 patch 或重建 | 支持 | 复杂排版尽量保留，非保证 |
| `.pdf` | L3 | 不作为源文件编辑 | 不适用 | 支持导出 | 仅输出格式 |

---

## 桌面端 vs Web 端

| 能力 | 桌面 Electron | Web 浏览器 |
|------|---------------|------------|
| 大纲编辑 | 支持 | 支持 |
| 富文本编辑 | 支持 | 支持 |
| 本地 `.mdoc` 文件库 | 支持 | 不支持，使用 IndexedDB |
| 打开本地文件夹项目 | 支持 | 不支持 |
| 项目文件原路径保存 | 支持 | 不适用 |
| 局域网 HTTP 分享 | 支持，端口 `6535` | 不支持 |
| 导出 HTML / MD / Word / PDF | 支持系统另存为 | 支持浏览器下载，PDF 走打印 |
| 自动更新 | 支持 GitHub Releases | 不支持 |

---

## 开发环境

### 环境要求

- Node.js 20+
- npm

### 安装与运行

```bash
npm install

# Electron + Vite 开发
npm run dev

# 仅构建前端
npm run build

# 构建后用 Electron 预览
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

打包产物输出到 `安装包/`。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron |
| 前端 | React 18、Vite 6、UnoCSS |
| 编辑器 | TipTap 3 |
| Markdown | marked、turndown |
| Word 导入 | mammoth |
| Word 导出 | html-to-docx |
| PDF 导出 | Electron `printToPDF` |
| HTML 清理 | DOMPurify |
| 分享服务 | Node HTTP server |
| 更新 | electron-updater + GitHub Releases |

---

## 目录结构

```text
document-assistant/
├── electron/
│   ├── main.cjs              # Electron 主进程、文件 IO、分享服务、导入导出
│   ├── preload.cjs           # 安全暴露 IPC API
│   └── dev.cjs               # 开发启动脚本
├── src/
│   ├── app/
│   │   ├── components/        # 主界面、文件树、项目视图
│   │   ├── document/          # 文档模型、大纲、预览 HTML、弹窗
│   │   └── editor/            # TipTap 编辑器、扩展、工具栏
│   ├── imports/              # 设计导入资源
│   └── styles/               # 全局样式、字体、主题
├── public/                   # 图标与静态资源
├── build/                    # 应用图标
├── README.md
├── CHANGELOG.md
├── 使用手册.md
└── package.json
```

---

## 发布流程

推送符合 `v*` 的 tag 会触发 GitHub Actions 发版流程。

```bash
npm run build
git tag -a v0.1.2 -m "v0.1.2"
git push origin v0.1.2
```

Release 说明会从 [CHANGELOG.md](./CHANGELOG.md) 截取对应版本章节。

---

## 使用限制

- 当前安装包未签名，macOS / Windows 首次打开可能有系统安全提示。
- 局域网分享要求电脑和访问设备在同一网络，且应用保持运行。
- 分享端口固定为 `6535`，端口被占用时需关闭占用程序后重试。
- 图片、视频、附件以内嵌方式保存，过大媒体会显著增大 `.mdoc` 体积。
- PDF 导出不包含视频。
- Markdown 导入会转换为编辑器可显示的内容；项目中的 `.md` 保存时写回原文件，并带空内容覆盖保护。

---

## 文档链接

| 文档 | 说明 |
|------|------|
| [使用手册.md](./使用手册.md) | 面向最终用户的完整操作说明 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本变更记录 |
| [Releases](https://github.com/wenlong301-hue/document-assistant/releases) | 安装包下载 |
| [Issues](https://github.com/wenlong301-hue/document-assistant/issues) | 问题反馈 |

---

## License

Private（`package.json` 中 `"private": true`）。
