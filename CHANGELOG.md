# Changelog

本文档记录文档助手各版本的用户可见变更。  
发版时 GitHub Release 说明会自动截取对应版本章节。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

---

## [0.1.0] - 2026-08-10

### 新增

- 桌面端文档助手：大纲编辑、本地 `.mdoc`、局域网分享、导出 Word / PDF / Markdown
- 推送 `v*` tag 时经 GitHub Actions 构建 **Windows** 与 **macOS** 安装包并上传至 GitHub Releases
- 集成 **electron-updater**，对接 GitHub Releases
- 启动后静默检查更新；帮助页支持手动「检查更新」
- 更新弹窗：稍后再说 / 打开下载页 / 下载更新（含进度）
- Windows / macOS：下载后可「立即安装并重启」

### 修复

- **macOS 应用内更新**：下载完成后**原地覆盖**当前 `.app` 并自动重启，避免打开 dmg/zip 后出现两个应用并存
- 自动替换失败时回退为打开安装包，并提示选择「替换」而非「保留两者」
- 收紧引用块（blockquote）内外间距：编辑器、PDF 导出、**HTML 预览 / 分享页**一致
- 提高弹层（modal）z-index，避免被编辑器工具栏遮挡
- 斜杠菜单在触发字符删除后正确关闭
- Release 产物命名使用 ASCII `DocAssistant-${version}-${os}-${arch}`，避免 GitHub 上文件名乱码

### 文档

- 使用手册、应用内帮助与项目 README
- 说明 macOS / Windows 均可「立即安装并重启」，补充双应用处理 FAQ
- 增加 macOS「应用已损坏」隔离属性（quarantine）处理说明

### 安装包

- Windows：`DocAssistant-0.1.0-win-x64.exe`
- macOS：`DocAssistant-0.1.0-mac-arm64.dmg` / `.zip`

---

## 链接

- [Releases](https://github.com/wenlong301-hue/document-assistant/releases)
- [使用手册](./使用手册.md)
