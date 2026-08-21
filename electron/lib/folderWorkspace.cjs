'use strict';

const path = require('path');
const fs = require('fs');
const { ensureDir } = require('./markdownExport.cjs');

const FOLDER_SUPPORTED_EXTS = new Set(['.mdoc', '.md', '.txt', '.docx', '.html', '.htm', '.sql']);
const FOLDER_SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', 'dist', 'build', '.next', '.nuxt', '.cache', '.idea', '.vscode', '__pycache__', '.DS_Store', 'Pods', '.venv', 'venv', '.trash', '$RECYCLE.BIN']);

function createFolderWorkspace(deps) {
  const {
    patchDocxText,
    wordHtmlDocument,
    contentHtmlToMarkdown,
    createMarkdownImageWriter,
    toMdocPayload,
    getHtmlToDocx,
    sendToRenderer,
  } = deps;

  let activeFolderWatcher = null;
  let activeFolderPath = null;
  let folderScanDebounceTimer = null;

  async function scanFolder(dir) {
    if (!dir || !fs.existsSync(dir)) return [];
    const results = [];
    const walk = async (current, rel) => {
      let entries;
      try {
        entries = await fs.promises.readdir(current, { withFileTypes: true });
      } catch {
        return;
      }
      await Promise.all(entries.map(async (entry) => {
        const name = String(entry.name || '');
        if (name.startsWith('.')) return;
        const full = path.join(current, entry.name);
        const relPath = rel ? path.join(rel, entry.name) : entry.name;
        if (entry.isDirectory()) {
          if (FOLDER_SKIP_DIRS.has(name.toLowerCase())) return;
          await walk(full, relPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!FOLDER_SUPPORTED_EXTS.has(ext)) return;
          try {
            const stat = await fs.promises.stat(full);
            results.push({ path: full, relPath, name: entry.name, ext, size: stat.size, mtimeMs: stat.mtimeMs });
          } catch {}
        }
      }));
    };
    await walk(dir, '');
    results.sort((a, b) => String(a.relPath).localeCompare(String(b.relPath), 'zh-CN'));
    return results;
  }

  function stopFolderWatcher() {
    if (folderScanDebounceTimer) {
      clearTimeout(folderScanDebounceTimer);
      folderScanDebounceTimer = null;
    }
    if (activeFolderWatcher) {
      try { activeFolderWatcher.close(); } catch {}
      activeFolderWatcher = null;
    }
    activeFolderPath = null;
  }

  function watchFolder(dir) {
    stopFolderWatcher();
    if (!dir || !fs.existsSync(dir)) return;
    activeFolderPath = dir;
    try {
      activeFolderWatcher = fs.watch(dir, { recursive: true }, () => {
        if (folderScanDebounceTimer) clearTimeout(folderScanDebounceTimer);
        folderScanDebounceTimer = setTimeout(async () => {
          folderScanDebounceTimer = null;
          if (!fs.existsSync(dir)) {
            sendToRenderer('folder-changed', { path: dir, files: [], gone: true });
            return;
          }
          sendToRenderer('folder-changed', { path: dir, files: await scanFolder(dir) });
        }, 300);
      });
    } catch (error) {
      console.error('watch folder failed:', error);
    }
  }

  function readFolderFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.docx') {
      try {
        return { ext, base64: fs.readFileSync(filePath).toString('base64') };
      } catch { return null; }
    }
    try {
      return { ext, text: fs.readFileSync(filePath, 'utf-8') };
    } catch { return null; }
  }

  /**
   * L2 项目原文件写回：
   * - 未编辑（sourceDirty === false）：原样写回 base64 / 原文，避免规范化损耗
   * - 已编辑：按扩展名走最优策略（docx patch → rebuild；md turndown；txt/html 文本）
   * L1 .mdoc 始终 JSON 序列化，无损往返
   */
  async function writeFolderFile(filePath, payload) {
    try {
      const rawExt = String(payload?.ext || path.extname(filePath || '') || '').toLowerCase();
      const ext = rawExt.startsWith('.') ? rawExt : `.${rawExt}`;
      ensureDir(path.dirname(filePath));

      // 未编辑：优先原样写回（txt/md/html 用 content；docx 用 sourceBase64）
      if (payload?.sourceDirty === false) {
        if (ext === '.docx' && payload?.sourceBase64) {
          fs.writeFileSync(filePath, Buffer.from(String(payload.sourceBase64), 'base64'));
          return { ok: true, preserved: true };
        }
        if (ext !== '.docx' && ext !== '.mdoc' && typeof payload?.content === 'string') {
          fs.writeFileSync(filePath, payload.content, 'utf-8');
          return { ok: true, preserved: true };
        }
      }

      if (ext === '.docx') {
        if (payload?.sourceBase64 && payload?.sourceDirty === true) {
          try {
            const patched = await patchDocxText(payload.sourceBase64, payload?.html || '');
            fs.writeFileSync(filePath, patched);
            return { ok: true, patched: true };
          } catch (error) {
            console.warn('docx patch failed, fallback to rebuild:', error instanceof Error ? error.message : error);
          }
        }
        // 无原包或 patch 失败：html-to-docx 尽力重建（L3 交换级，可能有损）
        const fullHtml = wordHtmlDocument(payload?.title || '未命名文档', payload?.html || '', payload?.options || {});
        const htmlToDocx = getHtmlToDocx();
        const buffer = await htmlToDocx(fullHtml, null, {
          orientation: 'portrait',
          margins: { top: 720, right: 720, bottom: 720, left: 720 },
        });
        fs.writeFileSync(filePath, buffer);
        return { ok: true, converted: true };
      } else if (ext === '.mdoc') {
        const data = typeof payload?.content === 'string' ? JSON.parse(payload.content) : payload?.content;
        if (!data || typeof data !== 'object') throw new Error('mdoc 内容无效');
        fs.writeFileSync(filePath, JSON.stringify(toMdocPayload(data, data.name), null, 2), 'utf-8');
      } else if (ext === '.md') {
        const markdown = contentHtmlToMarkdown(payload?.html || '', createMarkdownImageWriter(filePath));
        if (!markdown.trim() && fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf-8').trim()) {
          throw new Error('内容为空，已阻止覆盖原 Markdown 文件');
        }
        fs.writeFileSync(filePath, markdown, 'utf-8');
      } else if (ext === '.txt' || ext === '.sql' || ext === '.html' || ext === '.htm') {
        fs.writeFileSync(filePath, String(payload?.content ?? ''), 'utf-8');
      } else {
        fs.writeFileSync(filePath, String(payload?.content ?? ''), 'utf-8');
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '写入失败' };
    }
  }

  function getMarkdownSidecarPath(filePath) {
    const source = String(filePath || '');
    const dir = path.join(path.dirname(source), '.document-assistant');
    return path.join(dir, `${path.basename(source)}.mdoc`);
  }

  return {
    scanFolder,
    stopFolderWatcher,
    watchFolder,
    readFolderFile,
    writeFolderFile,
    getMarkdownSidecarPath,
    getActiveFolderPath: () => activeFolderPath,
  };
}

module.exports = {
  FOLDER_SUPPORTED_EXTS,
  FOLDER_SKIP_DIRS,
  createFolderWorkspace,
};
