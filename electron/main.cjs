const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const htmlToDocx = require('html-to-docx');
const TurndownService = require('turndown');
const { autoUpdater } = require('electron-updater');

const execFileAsync = promisify(execFile);

let mainWindow;
let tray = null;
let shareServer = null;
let activeShareDocId = null;
let activeShareHtml = null;
let updateCheckInFlight = false;
let lastDownloadedUpdatePath = null;
let closeBehavior = 'ask'; // 'ask', 'tray', 'quit'
const RELEASE_PAGE_URL = 'https://github.com/wenlong301-hue/document-assistant/releases/latest';
const DOCS_DIR = path.join(app.getPath('documents'), 'DocAssistant');
const RECENT_FILE = path.join(DOCS_DIR, 'recent.json');
const SETTINGS_FILE = path.join(DOCS_DIR, 'settings.json');

function getMacAppBundlePath() {
  // process.execPath ≈ /Applications/文档助手.app/Contents/MacOS/文档助手
  const match = String(process.execPath || '').match(/^(.*\.app)(?=\/Contents\/MacOS\/)/);
  return match ? match[1] : null;
}

function findAppBundleInDir(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name.endsWith('.app')) return full;
      if (entry.isDirectory() && !entry.name.startsWith('.')) stack.push(full);
    }
  }
  return null;
}

async function clearMacQuarantine(targetPath) {
  try {
    await execFileAsync('xattr', ['-cr', targetPath]);
  } catch {
    // 未签名包常见，忽略
  }
}

async function extractMacUpdatePackage(packagePath, destDir) {
  ensureDir(destDir);
  const lower = String(packagePath || '').toLowerCase();
  if (lower.endsWith('.zip')) {
    await execFileAsync('ditto', ['-x', '-k', packagePath, destDir]);
    return findAppBundleInDir(destDir);
  }
  if (lower.endsWith('.dmg')) {
    const mountRoot = path.join(destDir, 'mount');
    ensureDir(mountRoot);
    let mountPoint = null;
    try {
      const { stdout } = await execFileAsync('hdiutil', [
        'attach', packagePath, '-nobrowse', '-readonly', '-mountroot', mountRoot,
      ]);
      const line = String(stdout || '').split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';
      const parts = line.split(/\t+/);
      mountPoint = parts[parts.length - 1] || findAppBundleInDir(mountRoot)?.replace(/\/[^/]+\.app$/, '') || null;
      if (!mountPoint || !fs.existsSync(mountPoint)) {
        mountPoint = fs.readdirSync(mountRoot).map((n) => path.join(mountRoot, n)).find((p) => fs.statSync(p).isDirectory()) || null;
      }
      if (!mountPoint) throw new Error('无法挂载更新 DMG');
      const appInDmg = findAppBundleInDir(mountPoint);
      if (!appInDmg) throw new Error('DMG 中未找到应用');
      const copied = path.join(destDir, path.basename(appInDmg));
      await execFileAsync('ditto', [appInDmg, copied]);
      return copied;
    } finally {
      if (mountPoint) {
        try { await execFileAsync('hdiutil', ['detach', mountPoint, '-quiet']); } catch {}
      }
    }
  }
  throw new Error('不支持的更新包格式，请使用 zip 或 dmg');
}

/**
 * macOS 原地替换当前 .app，避免「打开安装包」拖入后出现双应用（旧版与新版并存）。
 * 退出后由后台脚本覆盖并重新打开。
 */
async function installMacUpdateInPlace(packagePath) {
  const currentApp = getMacAppBundlePath();
  if (!currentApp) {
    throw new Error('无法定位当前应用安装路径，请从「应用程序」文件夹启动后再更新');
  }
  if (!packagePath || !fs.existsSync(packagePath)) {
    throw new Error('更新包不存在，请重新下载');
  }

  const workDir = path.join(os.tmpdir(), `doc-assistant-update-${Date.now()}`);
  ensureDir(workDir);
  const newApp = await extractMacUpdatePackage(packagePath, workDir);
  if (!newApp || !fs.existsSync(newApp)) {
    throw new Error('更新包中未找到 .app');
  }
  await clearMacQuarantine(newApp);

  const scriptPath = path.join(os.tmpdir(), `doc-assistant-replace-${Date.now()}.sh`);
  const script = `#!/bin/bash
set -e
APP_PATH=${JSON.stringify(currentApp)}
NEW_APP=${JSON.stringify(newApp)}
WORK_DIR=${JSON.stringify(workDir)}
# 等待当前进程完全退出
for i in $(seq 1 60); do
  if ! pgrep -f "$APP_PATH/Contents/MacOS/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
# 覆盖安装到原路径（同名替换，不会生成「文档助手 2」）
rm -rf "$APP_PATH"
ditto "$NEW_APP" "$APP_PATH"
xattr -cr "$APP_PATH" 2>/dev/null || true
open "$APP_PATH"
rm -rf "$WORK_DIR"
rm -f ${JSON.stringify(scriptPath)}
`;
  fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  const child = spawn('/bin/bash', [scriptPath], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  setTimeout(() => {
    app.quit();
  }, 200);
  return { ok: true, mode: 'replace-in-place', appPath: currentApp };
}

function readAppSettings() {
  ensureDir(DOCS_DIR);
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { fontSize: '15px', lineHeight: '1.8', theme: 'light' };
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return { fontSize: '15px', lineHeight: '1.8', theme: 'light' };
  }
}

function writeAppSettings(settings) {
  ensureDir(DOCS_DIR);
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  return true;
}

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  // 公开仓库的 GitHub Releases；不自动上传，仅用于检查/下载
  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'wenlong301-hue',
      repo: 'document-assistant',
    });
  } catch (error) {
    console.error('autoUpdater setFeedURL failed:', error);
  }

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update-checking', { currentVersion: app.getVersion() });
  });

  autoUpdater.on('update-available', (info) => {
    updateCheckInFlight = false;
    sendToRenderer('update-available', {
      version: info?.version || '',
      releaseDate: info?.releaseDate || '',
      currentVersion: app.getVersion(),
      platform: process.platform,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    updateCheckInFlight = false;
    sendToRenderer('update-not-available', {
      version: info?.version || app.getVersion(),
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-download-progress', {
      percent: Number(progress?.percent || 0),
      transferred: Number(progress?.transferred || 0),
      total: Number(progress?.total || 0),
      bytesPerSecond: Number(progress?.bytesPerSecond || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    lastDownloadedUpdatePath = info?.downloadedFile || lastDownloadedUpdatePath || null;
    sendToRenderer('update-downloaded', {
      version: info?.version || '',
      filePath: lastDownloadedUpdatePath,
      platform: process.platform,
    });
  });

  autoUpdater.on('error', (error) => {
    updateCheckInFlight = false;
    sendToRenderer('update-error', {
      message: error instanceof Error ? error.message : String(error || '检查更新失败'),
    });
  });
}

async function checkForAppUpdates({ silent = true } = {}) {
  if (updateCheckInFlight) {
    return { status: 'busy', currentVersion: app.getVersion() };
  }
  // 开发模式不检查，避免干扰本地调试
  if (!app.isPackaged) {
    sendToRenderer('update-not-available', {
      version: app.getVersion(),
      currentVersion: app.getVersion(),
      reason: 'dev',
    });
    return { status: 'dev', currentVersion: app.getVersion() };
  }
  updateCheckInFlight = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      status: 'checking',
      silent,
      currentVersion: app.getVersion(),
      updateInfo: result?.updateInfo ? { version: result.updateInfo.version } : null,
    };
  } catch (error) {
    updateCheckInFlight = false;
    const message = error instanceof Error ? error.message : String(error || '检查更新失败');
    if (!silent) sendToRenderer('update-error', { message });
    return { status: 'error', message, currentVersion: app.getVersion() };
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFileName(name) {
  return String(name || '文档').replace(/[\\/:*?"<>|]/g, '_').trim() || '文档';
}

function normalizeExportPayload(payloadOrContent, defaultName) {
  if (payloadOrContent && typeof payloadOrContent === 'object' && !Buffer.isBuffer(payloadOrContent)) {
    const title = payloadOrContent.title || path.basename(payloadOrContent.defaultName || defaultName || 'document', path.extname(payloadOrContent.defaultName || defaultName || ''));
    return {
      title,
      content: payloadOrContent.content || '',
      defaultName: payloadOrContent.defaultName || defaultName || title,
      options: payloadOrContent.options || {},
    };
  }
  const title = path.basename(defaultName || 'document', path.extname(defaultName || ''));
  return { title, content: payloadOrContent || '', defaultName: defaultName || title, options: {} };
}

function exportResultFromError(error) {
  return { canceled: false, error: error instanceof Error ? error.message : '导出失败' };
}

function markdownImageExtension(mime) {
  const normalized = String(mime || '').toLowerCase();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/svg+xml') return 'svg';
  const match = normalized.match(/^image\/([a-z0-9.+-]+)$/);
  return match ? match[1].replace(/\+xml$/, '') : 'png';
}

function createMarkdownImageWriter(mdPath) {
  const base = path.basename(mdPath, path.extname(mdPath));
  const folder = `${base}_assets`;
  const dir = path.join(path.dirname(mdPath), folder);
  let index = 1;
  return (src) => {
    const match = String(src || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return null;
    const fileName = `image-${index++}.${markdownImageExtension(match[1])}`;
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(match[2], 'base64'));
    return encodeURI(`${folder}/${fileName}`);
  };
}

function contentHtmlToMarkdown(content, imageWriter) {
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  turndown.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td', 'video']);
  turndown.addRule('safeImage', {
    filter: 'img',
    replacement: (_content, node) => {
      const src = node.getAttribute('src') || '';
      const alt = String(node.getAttribute('alt') || '图片').replace(/[\r\n\]]/g, ' ');
      if (src.startsWith('data:')) {
        const relative = imageWriter ? imageWriter(src) : null;
        return relative ? `\n\n![${alt}](${relative})\n\n` : `\n\n![${alt}](${src})\n\n`;
      }
      return `\n\n![${alt}](${src})\n\n`;
    },
  });
  return turndown.turndown(content || '').trim() + '\n';
}

function cleanExportHtml(content) {
  return String(content || '')
    .replace(/<p>(\s*<br\s*\/?>\s*)+<\/p>/gi, '')
    .replace(/<p>(&nbsp;|\s)*<\/p>/gi, '')
    .replace(/<p><\/p>/gi, '');
}

function headingsToWordParagraphs(html) {
  const sizes = { 1: 22, 2: 18, 3: 15, 4: 14, 5: 14, 6: 14 };
  return String(html || '')
    .replace(/<h([1-6])(\s[^>]*)?>/gi, (_full, level) => `<p style="font-size:${sizes[level] || 14}px;font-weight:700;margin-top:6px!important;margin-bottom:3px!important;line-height:1.3">`)
    .replace(/<\/h[1-6]>/gi, '</p>');
}

function prepareImageTagsForWord(html) {
  return String(html || '').replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    const hasStyle = /\sstyle=/i.test(attrs);
    const hasWidth = /\swidth=/i.test(attrs);
    const srcMatch = attrs.match(/\ssrc=("[^"]*"|'[^']*')/i);
    let widthAttr = '';
    if (!hasWidth) {
      const src = srcMatch ? srcMatch[1].slice(1, -1) : '';
      let width = 560;
      if (src.startsWith('data:image/')) {
        try {
          const size = nativeImage.createFromDataURL(src).getSize();
          if (size.width) width = Math.min(size.width, 560);
        } catch {}
      }
      widthAttr = ` width="${width}"`;
    }
    const style = 'max-width:560px;width:auto;height:auto;display:block;margin:4px auto;';
    if (hasStyle) return full.replace(/\sstyle=("[^"]*"|'[^']*')/i, (styleAttr) => styleAttr.replace(/(["'])$/, `;${style}$1`)).replace(/>$/, `${widthAttr}>`);
    return `<img${attrs}${widthAttr} style="${style}">`;
  });
}

function wordHtmlDocument(title, content, options = {}) {
  const clean = prepareImageTagsForWord(cleanExportHtml(content));
  const body = options.skipTitle ? clean : `<h1>${escapeHtml(title || '未命名文档')}</h1>${clean}`;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1F2329}.word-page{width:100%}p{margin:0 0 4px}ul,ol{margin:2px 0 4px;padding-left:22px}li{margin:0}img{max-width:560px;width:auto;height:auto;display:block;margin:4px auto}table{border-collapse:collapse;width:100%;margin:4px 0}th,td{border:1px solid #DDE1E6;padding:4px 8px;text-align:left;vertical-align:top;font-size:13px}th{background:#F5F7FA;font-weight:700}blockquote{border-left:3px solid #005EFF;padding:3px 10px;margin:4px 0;background:#F0F5FF;color:#4E5969}pre{background:#F5F7FA;padding:5px 10px;margin:4px 0;white-space:pre-wrap}code{background:#F2F3F5;padding:1px 3px}hr{border:none;border-top:1px solid #DDE1E6;margin:6px 0}</style></head><body><div class="word-page">${headingsToWordParagraphs(body)}</div></body></html>`;
}

function pdfHtmlDocument(title, content, options = {}) {
  const clean = cleanExportHtml(content);
  const body = options.skipTitle ? clean : `<h1 class="pdf-title">${escapeHtml(title || '未命名文档')}</h1>${clean}`;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${escapeHtml(title || 'PDF')}</title><style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.8;color:#131212;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pdf-page{width:100%;max-width:100%;margin:0;padding:0;word-wrap:break-word;overflow-wrap:anywhere}
.pdf-title{font-size:24px;font-weight:600;line-height:1.35;margin:0 0 16px;padding:0 0 12px;border-bottom:1px solid #ebecf0;color:#131212}
h1{font-size:22px;font-weight:600;margin:20px 0 12px;line-height:1.4;color:#131212}
h2{font-size:18px;font-weight:600;margin:18px 0 10px;line-height:1.45;color:#131212}
h3{font-size:16px;font-weight:600;margin:16px 0 8px;line-height:1.5;color:#131212}
h4,h5,h6{font-size:15px;font-weight:600;margin:14px 0 8px;line-height:1.5;color:#131212}
p{margin:0 0 12px}
ul,ol{margin:0 0 12px;padding-left:24px}
li{margin:4px 0}
img,.doc-image{max-width:100%!important;width:auto!important;max-height:220mm;height:auto!important;display:block;margin:12px 0;border-radius:8px;object-fit:contain;page-break-inside:avoid;break-inside:avoid}
video,.doc-video{display:none!important}
table{width:100%;border-collapse:collapse;margin:12px 0;page-break-inside:avoid}
th,td{border:1px solid #ebecf0;padding:8px 12px;text-align:left;vertical-align:top;font-size:14px}
th{background:#f7f8fa;font-weight:600}
blockquote{border-left:3px solid #134CFF;padding:8px 14px;margin:10px 0;background:#f7f8fa;color:#606266;border-radius:0 8px 8px 0}blockquote p{margin:0 0 4px;line-height:1.65}blockquote p:last-child{margin-bottom:0}
pre{background:#f7f8fa;padding:12px 16px;margin:12px 0;white-space:pre-wrap;border-radius:8px;font-size:13px}
code{background:#f2f3f5;padding:1px 4px;border-radius:4px;font-size:0.92em}
hr{border:none;border-top:1px solid #ebecf0;margin:20px 0}
a{color:#134CFF;text-decoration:underline}
.doc-attachment{display:inline-flex;align-items:center;background:#f7f8fa;border:1px solid #ebecf0;border-radius:8px;color:#303133;font-size:13px;margin:12px 0;padding:10px 12px;text-decoration:none}
</style></head><body><main class="pdf-page">${body}</main></body></html>`;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

function getAllDocs() {
  ensureDir(DOCS_DIR);
  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.mdoc'));
  return files.map(f => {
    const fp = path.join(DOCS_DIR, f);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      return { id: f.replace('.mdoc', ''), name: data.name || data.title || f.replace('.mdoc', ''), filePath: fp, updatedAt: data.updatedAt };
    } catch {
      return { id: f.replace('.mdoc', ''), name: f.replace('.mdoc', ''), filePath: fp, updatedAt: null };
    }
  });
}

function getDocContent(docId) {
  const fp = path.join(DOCS_DIR, `${docId}.mdoc`);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch { return null; }
}

function saveDoc(docId, data) {
  ensureDir(DOCS_DIR);
  const fp = path.join(DOCS_DIR, `${docId}.mdoc`);
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
  return fp;
}

async function saveDocToFolder(docId, data) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择文档保存位置',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const targetDir = result.filePaths[0];
  const safeName = String(docId || data?.name || '未命名文档').replace(/[\\/:*?"<>|]/g, '_');
  const filePath = path.join(targetDir, `${safeName}.mdoc`);
  const payload = { ...data, name: data?.name || docId, updatedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return { canceled: false, filePath };
}

function deleteDoc(docId) {
  const fp = path.join(DOCS_DIR, `${docId}.mdoc`);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

const FOLDER_SUPPORTED_EXTS = new Set(['.mdoc', '.md', '.txt', '.docx', '.html', '.htm']);
const FOLDER_SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', 'dist', 'build', '.next', '.nuxt', '.cache', '.idea', '.vscode', '__pycache__', '.DS_Store', 'Pods', '.venv', 'venv', '.trash', '$RECYCLE.BIN']);
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

async function writeFolderFile(filePath, payload) {
  try {
    const rawExt = String(payload?.ext || path.extname(filePath || '') || '').toLowerCase();
    const ext = rawExt.startsWith('.') ? rawExt : `.${rawExt}`;
    ensureDir(path.dirname(filePath));
    if (ext === '.docx') {
      const fullHtml = wordHtmlDocument(payload?.title || '未命名文档', payload?.html || '', {});
      const buffer = await htmlToDocx(fullHtml, null, {
        orientation: 'portrait',
        margins: { top: 720, right: 720, bottom: 720, left: 720 },
      });
      fs.writeFileSync(filePath, buffer);
    } else if (ext === '.mdoc') {
      const data = typeof payload?.content === 'string' ? JSON.parse(payload.content) : payload?.content;
      if (!data || typeof data !== 'object') throw new Error('mdoc 内容无效');
      data.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } else if (ext === '.md') {
      const markdown = contentHtmlToMarkdown(payload?.html || '', createMarkdownImageWriter(filePath));
      if (!markdown.trim() && fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf-8').trim()) {
        throw new Error('内容为空，已阻止覆盖原 Markdown 文件');
      }
      fs.writeFileSync(filePath, markdown, 'utf-8');
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

function buildSharePage(docs) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文档助手 - 分享</title><style>
:root{--primary:#134CFF;--gray-50:#F3F5FA;--gray-100:#EEF0F5;--gray-200:#DFE0E6;--gray-400:#9FA0A6;--gray-500:#707277}*{box-sizing:border-box}body{margin:0;font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f8fa;color:#131212;line-height:1.6}.header{background:#fff;border-bottom:1px solid #ebecf0;height:56px;display:flex;align-items:center}.header-inner{max-width:920px;width:100%;margin:0 auto;padding:0 24px;display:flex;align-items:center;gap:12px}.brand{font-size:15px;font-weight:600;color:#131212}.status{font-size:12px;color:#8d8e99;padding-left:12px;border-left:1px solid #ebecf0}.wrap{max-width:920px;margin:0 auto;padding:40px 24px}.page-title{font-size:22px;font-weight:600;margin:0 0 24px;color:#131212}.doc-list{display:flex;flex-direction:column;gap:8px}.doc{display:flex;align-items:center;justify-content:space-between;border:1px solid #ebecf0;border-radius:10px;padding:18px 20px;background:#fff;cursor:pointer;transition:border-color .2s,box-shadow .2s;text-decoration:none}.doc:hover{border-color:#dfe1e8;box-shadow:0 2px 8px rgba(0,0,0,.04)}.doc-info{min-width:0}.doc-name{font-size:15px;font-weight:500;color:#131212;margin:0 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.doc-meta{font-size:13px;color:#8d8e99;margin:0}.doc-arrow{color:#c0c4cc;font-size:20px;flex-shrink:0;margin-left:12px}.footer{color:#8d8e99;font-size:13px;margin-top:28px;padding:16px 0 0;border-top:1px solid #ebecf0}@media(max-width:640px){.wrap{padding:24px 16px}.doc{padding:14px 16px}}
</style></head><body><header class="header"><div class="header-inner"><span class="brand">文档助手</span><span class="status">分享</span></div></header><main class="wrap"><h1 class="page-title">分享列表</h1><div class="doc-list">${docs.map(d => `<a href="/view/${encodeURIComponent(d.id)}" class="doc"><div class="doc-info"><p class="doc-name">${escapeHtml(d.name)}</p><p class="doc-meta">更新于 ${d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '未知'}</p></div><span class="doc-arrow">&#8250;</span></a>`).join('')}</div><p class="footer">当前共 ${docs.length} 个文档</p></main></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const OUTLINE_EXPANDED_ICON_PATH = 'M8.47261 5.89815C8.72718 5.68601 8.76157 5.30768 8.54943 5.05311C8.3373 4.79854 7.95896 4.76415 7.70439 4.97629L8.0885 5.43722L8.47261 5.89815ZM6.09975 7.09451L5.71564 7.55545C5.93815 7.74087 6.26135 7.74087 6.48386 7.55545L6.09975 7.09451ZM4.49511 4.97629C4.24054 4.76415 3.8622 4.79854 3.65006 5.05311C3.43793 5.30767 3.47232 5.68601 3.72689 5.89815L4.111 5.43722L4.49511 4.97629ZM8.0885 5.43722L7.70439 4.97629L5.71564 6.63358L6.09975 7.09451L6.48386 7.55545L8.47261 5.89815L8.0885 5.43722ZM6.09975 7.09451L6.48386 6.63358L4.49511 4.97629L4.111 5.43722L3.72689 5.89815L5.71564 7.55545L6.09975 7.09451ZM10.5 6H9.9C9.9 8.15391 8.15391 9.9 6 9.9V10.5V11.1C8.81665 11.1 11.1 8.81665 11.1 6H10.5ZM6 10.5V9.9C3.84609 9.9 2.1 8.15391 2.1 6H1.5H0.9C0.9 8.81665 3.18335 11.1 6 11.1V10.5ZM1.5 6H2.1C2.1 3.84609 3.84609 2.1 6 2.1V1.5V0.9C3.18335 0.9 0.9 3.18335 0.9 6H1.5ZM6 1.5V2.1C8.15391 2.1 9.9 3.84609 9.9 6H10.5H11.1C11.1 3.18335 8.81665 0.9 6 0.9V1.5Z';
const OUTLINE_COLLAPSED_ICON_PATH = 'M5.89815 3.52739C5.68601 3.27282 5.30768 3.23843 5.05311 3.45057C4.79854 3.6627 4.76415 4.04104 4.97629 4.29561L5.43722 3.9115L5.89815 3.52739ZM7.09451 5.90025L7.55545 6.28436C7.74087 6.06185 7.74087 5.73865 7.55545 5.51614L7.09451 5.90025ZM4.97629 7.50489C4.76415 7.75946 4.79854 8.1378 5.05311 8.34994C5.30767 8.56207 5.68601 8.52768 5.89815 8.27311L5.43722 7.889L4.97629 7.50489ZM5.43722 3.9115L4.97629 4.29561L6.63358 6.28436L7.09451 5.90025L7.55545 5.51614L5.89815 3.52739L5.43722 3.9115ZM7.09451 5.90025L6.63358 5.51614L4.97629 7.50489L5.43722 7.889L5.89815 8.27311L7.55545 6.28436L7.09451 5.90025ZM6 1.5V2.1C8.15391 2.1 9.9 3.84609 9.9 6H10.5H11.1C11.1 3.18335 8.81665 0.9 6 0.9V1.5ZM10.5 6H9.9C9.9 8.15391 8.15391 9.9 6 9.9V10.5V11.1C8.81665 11.1 11.1 8.81665 11.1 6H10.5ZM6 10.5V9.9C3.84609 9.9 2.1 8.15391 2.1 6H1.5H0.9C0.9 8.81665 3.18335 11.1 6 11.1V10.5ZM1.5 6H2.1C2.1 3.84609 3.84609 2.1 6 2.1V1.5V0.9C3.18335 0.9 0.9 3.18335 0.9 6H1.5Z';

function flattenNodes(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap(node => [node, ...flattenNodes(node.children)]);
}

function isHtmlContentEmpty(html) {
  return !String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function isNodePreviewable(node, contentMap) {
  return node && node.includeInPreview !== false && !isHtmlContentEmpty(contentMap?.[node.id]);
}

function getFirstPreviewableNode(nodes, contentMap) {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (isNodePreviewable(node, contentMap)) return node;
    const found = getFirstPreviewableNode(node.children || [], contentMap);
    if (found) return found;
  }
  return null;
}

function findOutlineNode(nodes, id) {
  if (!Array.isArray(nodes)) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findOutlineNode(n.children || [], id);
    if (found) return found;
  }
  return null;
}

function resolvePreviewNodeId(nodes, nodeId, contentMap) {
  if (!nodeId) return getFirstPreviewableNode(nodes, contentMap)?.id || nodes?.[0]?.id || 'root';
  const node = findOutlineNode(nodes, nodeId);
  if (!node) return getFirstPreviewableNode(nodes, contentMap)?.id || nodeId;
  if (isNodePreviewable(node, contentMap)) return node.id;
  const inSubtree = getFirstPreviewableNode(node.children || [], contentMap);
  if (inSubtree) return inSubtree.id;
  return getFirstPreviewableNode(nodes, contentMap)?.id || node.id;
}

function buildStoredDocHtml(doc) {
  if (doc.html) return doc.html;
  if (typeof doc.content === 'string') return doc.content;
  if (Array.isArray(doc.children) && doc.content && typeof doc.content === 'object') {
    const parts = flattenNodes(doc.children)
      .filter(node => isNodePreviewable(node, doc.content))
      .map(node => {
        const body = doc.content[node.id] || '<p><br></p>';
        return `<h1>${escapeHtml(node.name || '未命名文件')}</h1>${body}`;
      });
    return parts.join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n');
  }
  return `<h1>${escapeHtml(doc.name || doc.title || '未命名文档')}</h1>`;
}

function buildDocSections(doc) {
  if (!Array.isArray(doc.children) || !doc.content || typeof doc.content !== 'object') {
    return [{ id: 'root', name: doc.name || doc.title || '未命名文档', html: buildStoredDocHtml(doc) }];
  }
  return flattenNodes(doc.children)
    .filter(node => isNodePreviewable(node, doc.content))
    .map(node => {
      const html = doc.content[node.id] || '<p><br></p>';
      return {
        id: node.id,
        name: node.name || '未命名文件',
        html: String(html).trim().startsWith('<h1') ? html : `<h1>${escapeHtml(node.name || '未命名文件')}</h1>${html}`,
      };
    });
}

function buildDocViewPage(doc) {
  const title = doc.name || doc.title || '文档助手';
  const sections = buildDocSections(doc);
  const sectionMap = sections.reduce((acc, section) => {
    acc[section.id] = section;
    return acc;
  }, {});
  const initialNodeId = resolvePreviewNodeId(doc.children || [], sections[0]?.id, doc.content);
  const fallbackHtml = sectionMap[initialNodeId]?.html || sections[0]?.html || `<h1>${escapeHtml(title)}</h1><p>暂无内容</p>`;

  const buildTreeHtml = (nodes, depth = 0) => {
    if (!Array.isArray(nodes)) return '';
    return nodes.map(n => {
      const indent = depth * 16;
      const hasChildren = n.children && n.children.length > 0;
      const childrenHtml = hasChildren ? `<div class="tree-children">${buildTreeHtml(n.children, depth + 1)}</div>` : '';
      const toggleIcon = hasChildren ? `<svg class="tree-toggle-icon" fill="none" viewBox="0 0 12 12"><path class="tree-toggle-path" d="${OUTLINE_COLLAPSED_ICON_PATH}" fill="currentColor"></path></svg>` : '';
      const previewable = isNodePreviewable(n, doc.content) ? '1' : '0';
      return `<div class="tree-node" data-node-id="${escapeHtml(n.id)}" data-previewable="${previewable}"><div class="tree-item" data-node-id="${escapeHtml(n.id)}" data-previewable="${previewable}" style="padding-left:${indent + 12}px"><button class="tree-toggle" type="button" aria-label="展开或收起" data-expanded-path="${OUTLINE_EXPANDED_ICON_PATH}" data-collapsed-path="${OUTLINE_COLLAPSED_ICON_PATH}" ${hasChildren ? '' : 'disabled'}>${toggleIcon}</button><span class="tree-name">${escapeHtml(n.name || '未命名')}</span></div>${childrenHtml}</div>`;
    }).join('');
  };
  const hasTree = !!(doc.children && doc.children.length > 0);
  const docTreeHtml = hasTree
    ? `<div class="doc-tree"><div class="tree-header">${escapeHtml(title)}</div>${buildTreeHtml(doc.children)}</div>`
    : '';
  const initialTitle = sectionMap[initialNodeId]?.name || sections[0]?.name || title;

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(title)} - 文档助手</title><style>
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}body{font-family:'PingFang SC',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#131212;line-height:1.6;min-height:100vh;overflow-x:hidden;overflow-y:auto}
body::-webkit-scrollbar{width:6px}body::-webkit-scrollbar-thumb{background:#d0d1d6;border-radius:3px}body::-webkit-scrollbar-track{background:transparent}
.mobile-bar{display:none;position:sticky;top:0;z-index:40;height:48px;padding:0 12px;align-items:center;gap:10px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid #ebecf0}
.mobile-menu-btn,.mobile-toc-btn{width:36px;height:36px;border:none;border-radius:8px;background:transparent;color:#303133;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}
.mobile-menu-btn:active,.mobile-toc-btn:active{background:#f0f1f5}
.mobile-title{flex:1;min-width:0;font-size:15px;font-weight:600;color:#131212;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mobile-menu-icon,.mobile-toc-icon{width:20px;height:20px;display:block}
.drawer-mask{display:none;position:fixed;inset:0;z-index:50;background:rgba(19,18,18,.36)}
.drawer-mask.open{display:block}
.drawer{position:fixed;top:0;bottom:0;z-index:60;width:min(86vw,320px);max-width:320px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.12);transform:translateX(-105%);transition:transform .22s ease;overflow:hidden;display:flex;flex-direction:column}
.drawer.right{left:auto;right:0;transform:translateX(105%)}
.drawer.open{transform:translateX(0)}
.drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 14px 12px;border-bottom:1px solid #ebecf0;flex-shrink:0}
.drawer-title{font-size:15px;font-weight:600;color:#131212;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drawer-close{width:32px;height:32px;border:none;border-radius:8px;background:transparent;color:#8d8e99;font-size:20px;line-height:1;cursor:pointer}
.drawer-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:8px 8px 24px}
.shell{display:grid;grid-template-columns:${hasTree ? '260px ' : ''}minmax(0,1fr) 210px;column-gap:40px;min-height:100vh;max-width:1440px;margin:0 auto;padding:0 32px}
.sidebar-left{overflow-y:auto;padding:32px 32px 20px 0;position:sticky;top:0;height:100vh;scrollbar-width:thin;scrollbar-color:transparent transparent}
.sidebar-left::-webkit-scrollbar{width:5px}.sidebar-left::-webkit-scrollbar-track{background:transparent}.sidebar-left::-webkit-scrollbar-thumb{background:transparent;border-radius:999px;transition:background .15s ease}
.sidebar-left:hover::-webkit-scrollbar-thumb,.sidebar-left.sb-scrolling::-webkit-scrollbar-thumb{background:rgba(112,114,119,.45)}
.sidebar-left:hover,.sidebar-left.sb-scrolling{scrollbar-color:rgba(112,114,119,.45) transparent}
.doc-tree{}.tree-header{font-size:15px;font-weight:600;color:#131212;padding:0 12px 14px;margin-bottom:10px}.tree-item{display:flex;align-items:center;gap:6px;padding:8px 12px;cursor:pointer;font-size:14px;color:#303133;transition:background .15s;border-radius:8px;-webkit-tap-highlight-color:transparent}.tree-item:hover{background:#f5f6f8}.tree-item.active{background:#eef0f5;color:#131212;font-weight:500}.tree-toggle{width:20px;height:20px;border:none;border-radius:4px;background:transparent;color:#8d8e99;padding:0;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}.tree-toggle-icon{width:12px;height:12px;display:block}.tree-toggle:disabled{cursor:default;opacity:0}.tree-item.active .tree-toggle:not(:disabled){background:#dadbdf;color:#131212}.tree-children{display:none}.tree-node.expanded>.tree-children{display:block}.tree-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.content{overflow:visible;padding:48px 0 96px;height:auto;max-width:820px;width:100%;margin:0 auto;min-width:0;word-wrap:break-word;overflow-wrap:anywhere}
.content img,.content video{max-width:100%;height:auto}
.content h1{font-size:30px;line-height:1.35;font-weight:600;margin:0 0 28px;color:#131212;letter-spacing:-.01em}
.content h2{font-size:22px;line-height:1.4;font-weight:600;margin:48px 0 18px;color:#131212}
.content h3{font-size:18px;line-height:1.5;font-weight:600;margin:36px 0 14px;color:#131212}
.content h4,.content h5,.content h6{font-size:16px;line-height:1.55;font-weight:600;margin:28px 0 12px;color:#131212}
.content p{font-size:15px;line-height:1.85;margin:14px 0;color:#303133}
.content a{color:#134CFF;text-decoration:underline;text-underline-offset:2px}
.content ul,.content ol{padding-left:24px;margin:12px 0}.content li{font-size:15px;line-height:1.8;margin:4px 0}
.content ul[data-type="taskList"],.content ul.doc-task-list{list-style:none;padding-left:0;margin:12px 0}
.content li[data-type="taskItem"],.content li.doc-task-item{list-style:none;display:flex;gap:8px;align-items:flex-start;margin:4px 0;padding-left:0}
.content li[data-type="taskItem"]>label,.content li.doc-task-item>label{margin-top:2px;flex-shrink:0}
.content li[data-type="taskItem"]>div,.content li.doc-task-item>div{flex:1;min-width:0}
.content li[data-type="taskItem"]>div>p,.content li.doc-task-item>div>p{margin:0}
.content [data-task-item="true"]{display:flex;align-items:flex-start;gap:8px;margin:4px 0;list-style:none}
.content table{border-collapse:collapse;width:100%;margin:16px 0;display:block;overflow-x:auto}.content td,.content th{border:1px solid #eef0f5;padding:10px 14px;text-align:left;font-size:14px}.content tr:nth-child(odd) td,.content tr:nth-child(odd) th{background:rgba(238,240,245,.502)}
.content img{max-width:100%;border-radius:8px;border:1px solid #ebecf0}.content blockquote{border-left:3px solid #134CFF;background:#f7f8fa;margin:10px 0;padding:10px 16px;color:#606266;border-radius:0 12px 12px 0}.content blockquote p{margin:0 0 4px;line-height:1.65}.content blockquote p:last-child{margin-bottom:0}
.content pre{background:#f5f6f8;border:1px solid #ebecf0;border-radius:12px;padding:20px 24px;overflow-x:auto;font-size:13px;line-height:1.7;position:relative;margin:16px 0}.content pre code{font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.7}.content hr{border:none;border-top:1px solid #ebecf0;margin:24px 0}
.copy-btn{position:absolute;top:8px;right:8px;z-index:2;height:26px;padding:0 10px;border:none;border-radius:6px;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);color:#707277;font-size:12px;cursor:pointer;display:none;align-items:center;font-family:inherit;transition:color .15s}.content pre:hover .copy-btn{display:flex}.copy-btn:hover{color:#131212;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.sidebar-right{overflow-y:auto;padding:48px 0 0;position:sticky;top:28px;align-self:start;max-height:calc(100vh - 56px);scrollbar-width:none}.sidebar-right::-webkit-scrollbar{display:none}
.toc-header{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#131212;padding:0 12px 12px}.toc-hamburger{font-size:14px;color:#8d8e99}.toc-item{display:block;line-height:1.8;text-decoration:none;padding:4px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s}.toc-item:hover{color:#131212!important}.toc-item.active{color:#134CFF!important;font-weight:600!important}
body.nav-open,body.toc-open{overflow:hidden}
@media(max-width:860px){
  .mobile-bar{display:flex}
  .shell{display:block;max-width:none;padding:0;min-height:auto}
  .sidebar-left,.sidebar-right{display:none}
  .content{padding:20px 16px 96px}
  .content h1{font-size:24px;margin:0 0 16px}
  .content h2{font-size:20px;margin:28px 0 12px}
  .content h3{font-size:17px;margin:22px 0 10px}
  .content p,.content li{font-size:15px;line-height:1.75}
  .drawer .tree-header{display:none}
  .drawer .doc-tree{padding:0}
  .drawer .tree-item{padding-top:10px;padding-bottom:10px;font-size:14px}
  .copy-btn{display:flex}
}
</style></head><body>
<header class="mobile-bar" id="mobile-bar">
  ${hasTree ? `<button type="button" class="mobile-menu-btn" id="mobile-menu-btn" aria-label="打开目录"><svg class="mobile-menu-icon" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>` : '<span style="width:36px"></span>'}
  <div class="mobile-title" id="mobile-title">${escapeHtml(initialTitle)}</div>
  <button type="button" class="mobile-toc-btn" id="mobile-toc-btn" aria-label="本页大纲"><svg class="mobile-toc-icon" viewBox="0 0 20 20" fill="none"><path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
</header>
${hasTree ? `<div class="drawer-mask" id="nav-mask"></div><aside class="drawer" id="nav-drawer" aria-hidden="true"><div class="drawer-head"><div class="drawer-title">${escapeHtml(title)}</div><button type="button" class="drawer-close" id="nav-close" aria-label="关闭">×</button></div><div class="drawer-body" id="nav-drawer-body"></div></aside>` : ''}
<div class="drawer-mask" id="toc-mask"></div>
<aside class="drawer right" id="toc-drawer" aria-hidden="true"><div class="drawer-head"><div class="drawer-title">在本页</div><button type="button" class="drawer-close" id="toc-close" aria-label="关闭">×</button></div><div class="drawer-body" id="toc-drawer-body"><div id="toc-list-mobile"></div></div></aside>
<div class="shell">${hasTree ? `<aside class="sidebar-left" id="sidebar-left">${docTreeHtml}</aside>` : ''}<main class="content" id="doc-content">${fallbackHtml}</main><aside class="sidebar-right"><div class="toc-header"><span class="toc-hamburger">≡</span>在本页</div><div id="toc-list"></div></aside></div>
<script>
window.__DOC_SECTIONS__=${escapeScriptJson(sectionMap)};
window.__DOC_INITIAL__=${escapeScriptJson(initialNodeId)};
(function(){
try{
var sections=window.__DOC_SECTIONS__||{};
var content=document.getElementById('doc-content')||document.querySelector('.content');
var tocList=document.getElementById('toc-list');
var tocListMobile=document.getElementById('toc-list-mobile');
var mobileTitle=document.getElementById('mobile-title');
var navDrawer=document.getElementById('nav-drawer');
var navMask=document.getElementById('nav-mask');
var tocDrawer=document.getElementById('toc-drawer');
var tocMask=document.getElementById('toc-mask');
var sidebarLeft=document.getElementById('sidebar-left');
var navBody=document.getElementById('nav-drawer-body');
function cssEscape(value){try{if(window.CSS&&typeof CSS.escape==='function')return CSS.escape(value)}catch(e){}return String(value||'').replace(/([ !"#$%&'()*+,./:;<=>?@\\[\\]^\`{|}~])/g,'\\\\$1')}
function escapeText(s){return String(s||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]})}
function slug(s){return (s||'heading').replace(/[^a-zA-Z\\u4e00-\\u9fff0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'heading'}
function setBodyLock(){document.body.classList.toggle('nav-open',!!(navDrawer&&navDrawer.classList.contains('open')));document.body.classList.toggle('toc-open',!!(tocDrawer&&tocDrawer.classList.contains('open')))}
function closeNav(){if(navDrawer){navDrawer.classList.remove('open');navDrawer.setAttribute('aria-hidden','true')}if(navMask)navMask.classList.remove('open');setBodyLock()}
function openNav(){if(!navDrawer)return;closeToc();navDrawer.classList.add('open');navDrawer.setAttribute('aria-hidden','false');if(navMask)navMask.classList.add('open');setBodyLock()}
function closeToc(){if(tocDrawer){tocDrawer.classList.remove('open');tocDrawer.setAttribute('aria-hidden','true')}if(tocMask)tocMask.classList.remove('open');setBodyLock()}
function openToc(){if(!tocDrawer)return;closeNav();tocDrawer.classList.add('open');tocDrawer.setAttribute('aria-hidden','false');if(tocMask)tocMask.classList.add('open');setBodyLock()}
function syncMobileNavTree(){if(!navBody||!sidebarLeft)return;if(navBody.childElementCount)return;var tree=sidebarLeft.querySelector('.doc-tree');if(tree)navBody.appendChild(tree.cloneNode(true))}
function updateActiveToc(){if(!content)return;var headings=Array.prototype.slice.call(content.querySelectorAll('h1,h2,h3,h4,h5,h6'));if(!headings.length)return;var active=headings[0];var top=window.scrollY+72;headings.forEach(function(h){if(h.getBoundingClientRect().top+window.scrollY<=top)active=h});[tocList,tocListMobile].forEach(function(list){if(!list)return;list.querySelectorAll('.toc-item').forEach(function(a){a.classList.toggle('active',!!(active&&a.getAttribute('href')==='#'+active.id))})})}
function buildToc(){if(!content)return;var ids={};var items=[];content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h){var text=(h.textContent||'').trim();if(!text)return;var key=slug(text);var count=ids[key]||0;ids[key]=count+1;var id=count>0?key+'-'+count:key;h.id=id;items.push({level:Number(h.tagName.slice(1)),text:text,id:id})});var html=items.map(function(i){var indent=(i.level-1)*12;var size=i.level===1?'14px':'13px';var weight=i.level===1?'600':'400';var color=i.level===1?'#131212':'#8d8e99';return '<a href="#'+i.id+'" class="toc-item" style="padding-left:'+(indent+12)+'px;font-size:'+size+';font-weight:'+weight+';color:'+color+'">'+escapeText(i.text)+'</a>'}).join('');if(tocList)tocList.innerHTML=html;if(tocListMobile)tocListMobile.innerHTML=html;updateActiveToc()}
function bindCopy(){if(!content)return;content.querySelectorAll('pre').forEach(function(p){if(p.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.type='button';b.textContent='复制';b.addEventListener('click',function(){var c=(p.querySelector('code')||{}).textContent||p.textContent||'';var done=function(){b.textContent='已复制';setTimeout(function(){b.textContent='复制'},2000)};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(c).then(done).catch(function(){b.textContent='复制失败'})}else{done()}});p.appendChild(b)})}
function updateTreeIcon(node){var btn=node&&node.querySelector('.tree-toggle:not(:disabled)');var path=btn&&btn.querySelector('.tree-toggle-path');if(path)path.setAttribute('d',node.classList.contains('expanded')?btn.getAttribute('data-expanded-path'):btn.getAttribute('data-collapsed-path'))}
function directChildNodes(node){if(!node)return[];var wrap=null;for(var i=0;i<node.children.length;i++){if(node.children[i].classList&&node.children[i].classList.contains('tree-children')){wrap=node.children[i];break}}if(!wrap)return[];var out=[];for(var j=0;j<wrap.children.length;j++){if(wrap.children[j].classList&&wrap.children[j].classList.contains('tree-node'))out.push(wrap.children[j])}return out}
function resolveId(id){if(id&&sections[id])return id;function firstIn(node){if(!node)return null;var nid=node.getAttribute('data-node-id');if(node.getAttribute('data-previewable')==='1'&&nid&&sections[nid])return nid;var kids=directChildNodes(node);for(var i=0;i<kids.length;i++){var f=firstIn(kids[i]);if(f)return f}return null}if(id){var start=document.querySelector('.tree-node[data-node-id="'+cssEscape(id)+'"]');var from=firstIn(start);if(from)return from}for(var k in sections){if(Object.prototype.hasOwnProperty.call(sections,k))return k}return id}
function selectNode(id,options){options=options||{};var real=resolveId(id);var s=sections[real];if(!s){if(content&&!content.innerHTML.trim())content.innerHTML='<h1>'+escapeText('文档')+'</h1><p>暂无内容</p>';return}if(content)content.innerHTML=s.html||('<h1>'+escapeText(s.name)+'</h1><p>暂无内容</p>');document.querySelectorAll('.tree-item').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-node-id')===real)});document.querySelectorAll('.tree-node[data-node-id="'+cssEscape(real)+'"]').forEach(function(node){var cur=node;while(cur){cur.classList.add('expanded');updateTreeIcon(cur);cur=cur.parentElement?cur.parentElement.closest('.tree-node'):null}});if(mobileTitle)mobileTitle.textContent=s.name||'';buildToc();bindCopy();if(!options.keepNav)closeNav();closeToc();if(!options.skipScroll)window.scrollTo(0,0)}
function onTreeClick(e){var target=e.target;if(!target)return;var toggle=target.closest?target.closest('.tree-toggle'):null;if(toggle){var node=toggle.closest('.tree-node');if(node&&!toggle.disabled){node.classList.toggle('expanded');updateTreeIcon(node);var sid=node.getAttribute('data-node-id');document.querySelectorAll('.tree-node[data-node-id="'+cssEscape(sid)+'"]').forEach(function(n){if(n===node)return;if(node.classList.contains('expanded'))n.classList.add('expanded');else n.classList.remove('expanded');updateTreeIcon(n)})}e.preventDefault();e.stopPropagation();return}var item=target.closest?target.closest('.tree-item'):null;if(item)selectNode(item.getAttribute('data-node-id'))}
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;if(t.closest('.tree-item')||t.closest('.tree-toggle'))onTreeClick(e)});
var menuBtn=document.getElementById('mobile-menu-btn');
var tocBtn=document.getElementById('mobile-toc-btn');
var navClose=document.getElementById('nav-close');
var tocClose=document.getElementById('toc-close');
if(menuBtn)menuBtn.addEventListener('click',function(){syncMobileNavTree();openNav()});
if(tocBtn)tocBtn.addEventListener('click',openToc);
if(navClose)navClose.addEventListener('click',closeNav);
if(tocClose)tocClose.addEventListener('click',closeToc);
if(navMask)navMask.addEventListener('click',closeNav);
if(tocMask)tocMask.addEventListener('click',closeToc);
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('#toc-list-mobile .toc-item'):null;if(a){closeToc()}});
window.addEventListener('scroll',updateActiveToc,{passive:true});
window.addEventListener('resize',function(){if(window.innerWidth>860){closeNav();closeToc()}});
syncMobileNavTree();
function bindAutoHideScrollbar(el){if(!el)return;var t=null;el.addEventListener('scroll',function(){el.classList.add('sb-scrolling');if(t)clearTimeout(t);t=setTimeout(function(){el.classList.remove('sb-scrolling')},700)},{passive:true})}
bindAutoHideScrollbar(sidebarLeft);
selectNode(window.__DOC_INITIAL__,{skipScroll:true,keepNav:true});
}catch(err){try{var c=document.getElementById('doc-content');if(c&&!c.innerHTML.trim())c.innerHTML='<h1>预览加载异常</h1><p>请尝试重新导出或分享。</p>'}catch(e){}}
})();
</script></body></html>`;
}

function respondWithDoc(res, docId) {
  const doc = getDocContent(docId);
  if (doc) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(buildDocViewPage(doc));
    return true;
  }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>文档未找到</h1>');
  return false;
}

function respondWithActiveShare(res) {
  if (!activeShareHtml) return false;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(activeShareHtml);
  return true;
}

function startShareServer(port = 6535, docId = null, html = null) {
  if (docId) activeShareDocId = docId;
  if (html) activeShareHtml = String(html);
  if (shareServer?.listening) return Promise.resolve(shareServer);
  shareServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const url = new URL(req.url, `http://localhost:${port}`);
    const viewMatch = url.pathname.match(/^\/view\/(.+)$/);
    if (viewMatch) {
      respondWithDoc(res, decodeURIComponent(viewMatch[1]));
      return;
    }
    if (url.pathname === '/' || url.pathname === '') {
      if (respondWithActiveShare(res)) return;
      if (activeShareDocId) {
        respondWithDoc(res, activeShareDocId);
        return;
      }
      const docs = getAllDocs();
      if (docs.length === 1) {
        respondWithDoc(res, docs[0].id);
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(buildSharePage(docs));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>页面未找到</h1>');
  });
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      shareServer?.off('listening', onListening);
      shareServer?.off('error', onError);
    };
    const onListening = () => {
      cleanup();
      resolve(shareServer);
    };
    const onError = (error) => {
      cleanup();
      try { shareServer?.close(); } catch {}
      shareServer = null;
      reject(error);
    };
    shareServer.once('listening', onListening);
    shareServer.once('error', onError);
    shareServer.listen(port, '0.0.0.0');
  });
}

function stopShareServer() {
  if (shareServer) { try { shareServer.close(); } catch {} shareServer = null; }
  activeShareDocId = null;
  activeShareHtml = null;
}

function createWindow() {
  const appIconPath = path.join(__dirname, '..', 'build', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '文档助手',
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    show: false,
  });

  // Load close behavior from settings
  const settings = readAppSettings();
  closeBehavior = settings.closeBehavior || 'ask';

  // Handle window close
  mainWindow.on('close', (e) => {
    if (closeBehavior === 'tray') {
      e.preventDefault();
      mainWindow.hide();
      return;
    }
    if (closeBehavior === 'ask') {
      e.preventDefault();
      dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['最小化到托盘', '退出应用'],
        defaultId: 0,
        title: '关闭确认',
        message: '选择关闭时的行为',
        detail: '您可以选择最小化到系统托盘或直接退出应用',
      }).then(({ response }) => {
        if (response === 0) {
          // Minimize to tray
          mainWindow.hide();
        } else {
          // Quit app
          mainWindow.destroy();
          app.quit();
        }
      });
      return;
    }
    // closeBehavior === 'quit' — default behavior
  });
  const isDev = process.argv.includes('--dev');
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    // dev 模式立即显示窗口，避免页面加载期间“看起来没打开”
    mainWindow.show();
    const loadDevUrl = (attempt = 0) => {
      mainWindow.loadURL(devUrl).catch(() => {
        if (attempt < 100) setTimeout(() => loadDevUrl(attempt + 1), 500);
      });
    };
    loadDevUrl();
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    mainWindow.setMenu(null);
  }
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // macOS 系统全屏/最大化时通知渲染进程，清理浮动工具条坐标，避免盖住编辑器工具栏
  const notifyViewportChange = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('viewport-change', { reason, platform: process.platform });
  };
  mainWindow.on('enter-full-screen', () => notifyViewportChange('enter-full-screen'));
  mainWindow.on('leave-full-screen', () => notifyViewportChange('leave-full-screen'));
  mainWindow.on('maximize', () => notifyViewportChange('maximize'));
  mainWindow.on('unmaximize', () => notifyViewportChange('unmaximize'));
  mainWindow.on('resize', () => notifyViewportChange('resize'));
}

function createTray() {
  const appIconPath = path.join(__dirname, '..', 'build', 'icon.png');
  if (!fs.existsSync(appIconPath)) return;

  const icon = nativeImage.createFromPath(appIconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('文档助手');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();
  createTray();
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  // 启动后延迟静默检查，避免抢启动焦点
  setTimeout(() => {
    checkForAppUpdates({ silent: true }).catch((error) => {
      console.error('startup update check failed:', error);
    });
  }, 4000);
});
app.on('window-all-closed', () => { stopShareServer(); stopFolderWatcher(); if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('get-docs', () => getAllDocs());
ipcMain.handle('get-doc', (_e, id) => getDocContent(id));
ipcMain.handle('save-doc', (_e, id, data) => saveDoc(id, data));
ipcMain.handle('save-doc-to-folder', (_e, id, data) => saveDocToFolder(id, data));
ipcMain.handle('delete-doc', (_e, id) => deleteDoc(id));
ipcMain.handle('start-share', async (_e, port, docId, html) => {
  const sharePort = port || 6535;
  await startShareServer(sharePort, docId || null, html || null);
  // 根路径已按 activeShareDocId 直达当前文档详情，链接保持简洁
  return `http://${getLocalIP()}:${sharePort}`;
});
ipcMain.handle('stop-share', () => { stopShareServer(); });
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('check-for-updates', async (_e, options = {}) => checkForAppUpdates({ silent: !options?.manual }));
ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '下载更新失败');
    sendToRenderer('update-error', { message });
    return { ok: false, message };
  }
});
ipcMain.handle('install-update', async () => {
  // Windows：quitAndInstall。macOS：原地替换当前 .app，避免拖入安装产生双应用。
  if (process.platform === 'darwin') {
    if (lastDownloadedUpdatePath && fs.existsSync(lastDownloadedUpdatePath)) {
      try {
        return await installMacUpdateInPlace(lastDownloadedUpdatePath);
      } catch (error) {
        console.error('mac in-place install failed:', error);
        // 回退：打开安装包，由用户手动覆盖 Applications 中同名应用
        const opened = await shell.openPath(lastDownloadedUpdatePath);
        if (opened) await shell.showItemInFolder(lastDownloadedUpdatePath);
        return {
          ok: true,
          mode: 'open-installer',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }
    await shell.openExternal(RELEASE_PAGE_URL);
    return { ok: true, mode: 'open-release' };
  }
  setImmediate(() => {
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      console.error('quitAndInstall failed:', error);
      shell.openExternal(RELEASE_PAGE_URL);
    }
  });
  return { ok: true, mode: 'quit-and-install' };
});
ipcMain.handle('open-release-page', async () => {
  await shell.openExternal(RELEASE_PAGE_URL);
  return true;
});
ipcMain.handle('skip-update-version', (_e, version) => {
  const settings = readAppSettings();
  settings.skippedUpdateVersion = String(version || '');
  writeAppSettings(settings);
  return true;
});
ipcMain.handle('get-skipped-update-version', () => {
  const settings = readAppSettings();
  return settings.skippedUpdateVersion || '';
});
ipcMain.handle('export-html', async (_e, content, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'document.html',
    filters: [{ name: 'HTML', extensions: ['html'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return true;
  }
  return false;
});

ipcMain.handle('export-markdown', async (_e, payload) => {
  try {
    const { title, content, defaultName } = normalizeExportPayload(payload);
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${sanitizeFileName(defaultName || title || 'document').replace(/\.md$/i, '')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const markdown = contentHtmlToMarkdown(content, createMarkdownImageWriter(result.filePath));
    fs.writeFileSync(result.filePath, markdown, 'utf-8');
    return { canceled: false, filePath: result.filePath };
  } catch (error) {
    return exportResultFromError(error);
  }
});

ipcMain.handle('export-docx', async (_e, payloadOrContent, defaultName) => {
  try {
    const { title, content, defaultName: payloadDefaultName, options } = normalizeExportPayload(payloadOrContent, defaultName);
    const fullHtml = wordHtmlDocument(title, content, options);
    const buffer = await htmlToDocx(fullHtml, null, { orientation: 'portrait', margins: { top: 720, right: 720, bottom: 720, left: 720 } });
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${sanitizeFileName(payloadDefaultName || title || 'document').replace(/\.docx$/i, '')}.docx`,
      filters: [{ name: 'Word', extensions: ['docx'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    fs.writeFileSync(result.filePath, buffer);
    return { canceled: false, filePath: result.filePath };
  } catch (error) { return exportResultFromError(error); }
});

ipcMain.handle('export-pdf', async (_e, payloadOrContent, defaultName) => {
  let pdfWin = null;
  let tempPath = null;
  try {
    const { title, content, defaultName: payloadDefaultName, options } = normalizeExportPayload(payloadOrContent, defaultName);
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${sanitizeFileName(payloadDefaultName || title || 'document').replace(/\.pdf$/i, '')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const fullHtml = pdfHtmlDocument(title, content, options);
    tempPath = path.join(os.tmpdir(), `doc-assistant-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
    fs.writeFileSync(tempPath, fullHtml, 'utf-8');
    pdfWin = new BrowserWindow({
      show: false,
      width: 1024,
      height: 768,
      webPreferences: { offscreen: true },
    });
    await pdfWin.loadFile(tempPath);
    await pdfWin.webContents.executeJavaScript(`(async()=>{
      try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch(e){}
      const imgs=Array.from(document.images||[]);
      await Promise.all(imgs.map((img)=>new Promise((resolve)=>{
        const done=()=>resolve();
        if(img.complete&&img.naturalWidth>0)return resolve();
        img.addEventListener('load',done,{once:true});
        img.addEventListener('error',done,{once:true});
        if(typeof img.decode==='function')img.decode().then(done).catch(done);
        setTimeout(done,20000);
      })));
      await new Promise((r)=>setTimeout(r,120));
      return true;
    })()`);
    const pdfData = await pdfWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      marginsType: 0,
      margins: { top: 0.55, right: 0.5, bottom: 0.55, left: 0.5 },
    });
    fs.writeFileSync(result.filePath, pdfData);
    return { canceled: false, filePath: result.filePath };
  } catch (error) { return exportResultFromError(error); }
  finally {
    if (pdfWin && !pdfWin.isDestroyed()) pdfWin.close();
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }
});

ipcMain.handle('settings-read', () => readAppSettings());

ipcMain.handle('settings-write', (_e, settings) => {
  const result = writeAppSettings(settings || {});
  if (settings && settings.closeBehavior) {
    closeBehavior = settings.closeBehavior;
  }
  return result;
});

ipcMain.handle('get-doc-html', (_e, docName) => {
  const doc = getDocContent(docName);
  if (!doc) return null;
  return { name: doc.name, html: doc.html || doc.content || '', updatedAt: doc.updatedAt };
});

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择文件夹',
    buttonLabel: '打开',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const dir = result.filePaths[0];
  const settings = readAppSettings();
  settings.lastFolder = dir;
  writeAppSettings(settings);
  watchFolder(dir);
  return { canceled: false, path: dir, files: await scanFolder(dir) };
});

ipcMain.handle('scan-folder', async (_e, dir) => scanFolder(dir));

ipcMain.handle('get-folder-state', async () => {
  const settings = readAppSettings();
  const dir = settings.lastFolder || null;
  if (!dir) return { path: null, files: [] };
  if (fs.existsSync(dir)) {
    watchFolder(dir);
    return { path: dir, files: await scanFolder(dir) };
  }
  return { path: dir, files: [], gone: true };
});

ipcMain.handle('close-folder', () => {
  stopFolderWatcher();
  const settings = readAppSettings();
  if (settings.lastFolder) {
    settings.lastFolder = '';
    writeAppSettings(settings);
  }
  return true;
});

ipcMain.handle('read-folder-file', (_e, filePath) => readFolderFile(filePath));

ipcMain.handle('write-folder-file', (_e, filePath, payload) => writeFolderFile(filePath, payload));

ipcMain.handle('get-markdown-sidecar-path', (_e, filePath) => getMarkdownSidecarPath(filePath));

ipcMain.handle('rename-folder-file', (_e, filePath, newName) => {
  try {
    const safe = sanitizeFileName(newName);
    if (!safe) return { ok: false, error: '名称不能为空' };
    const newPath = path.join(path.dirname(filePath), safe);
    if (newPath === filePath) return { ok: true, path: filePath, unchanged: true };
    fs.renameSync(filePath, newPath);
    return { ok: true, path: newPath };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '重命名失败' };
  }
});

ipcMain.handle('trash-folder-file', async (_e, filePath) => {
  try {
    await shell.trashItem(filePath);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '删除失败' };
  }
});

// ===== Project Management =====
const PROJECTS_FILE = path.join(DOCS_DIR, 'projects.json');

function readProjects() {
  ensureDir(DOCS_DIR);
  if (!fs.existsSync(PROJECTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  } catch { return []; }
}

function writeProjects(projects) {
  ensureDir(DOCS_DIR);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
}

async function scanFolderTree(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const results = [];
  const walk = async (current, rel) => {
    let entries;
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch { return; }
    for (const entry of entries) {
      const name = String(entry.name || '');
      if (name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (FOLDER_SKIP_DIRS.has(name.toLowerCase())) continue;
        // Build tree for this directory
        const subEntries = [];
        try {
          const raw = await fs.promises.readdir(full, { withFileTypes: true });
          for (const se of raw) {
            const sname = String(se.name || '');
            if (sname.startsWith('.') || FOLDER_SKIP_DIRS.has(sname.toLowerCase())) continue;
            const sfull = path.join(full, se.name);
            const srel = rel ? path.join(rel, se.name) : se.name;
            if (se.isDirectory()) {
              const subChildren = await scanFolderTree_single(sfull, srel);
              subEntries.push({ name: se.name, path: sfull, isDirectory: true, children: subChildren });
            } else if (se.isFile() && FOLDER_SUPPORTED_EXTS.has(path.extname(se.name).toLowerCase())) {
              subEntries.push({ name: se.name, path: sfull, isDirectory: false });
            }
          }
        } catch {}
        results.push({ name: entry.name, path: full, isDirectory: true, children: subEntries });
      } else if (entry.isFile() && FOLDER_SUPPORTED_EXTS.has(path.extname(entry.name).toLowerCase())) {
        results.push({ name: entry.name, path: full, isDirectory: false });
      }
    }
  };
  // Sort: directories first, then files, alphabetical
  await walk(dir, '');
  results.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), 'zh-CN');
  });
  return results;
}

async function scanFolderTree_single(dir, rel) {
  const results = [];
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const name = String(entry.name || '');
      if (name.startsWith('.') || FOLDER_SKIP_DIRS.has(name.toLowerCase())) continue;
      const full = path.join(dir, entry.name);
      const relPath = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        const children = await scanFolderTree_single(full, relPath);
        results.push({ name: entry.name, path: full, isDirectory: true, children });
      } else if (entry.isFile() && FOLDER_SUPPORTED_EXTS.has(path.extname(entry.name).toLowerCase())) {
        results.push({ name: entry.name, path: full, isDirectory: false });
      }
    }
  } catch {}
  results.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), 'zh-CN');
  });
  return results;
}

ipcMain.handle('get-projects', () => readProjects());

ipcMain.handle('save-projects', (_e, projects) => {
  writeProjects(projects || []);
  return true;
});

ipcMain.handle('create-project', async (_e, name) => {
  const safeName = sanitizeFileName(name || '未命名项目');
  if (!safeName) return { ok: false, error: '名称不能为空' };
  const projects = readProjects();
  if (projects.find(p => p.name === safeName)) return { ok: false, error: '项目已存在' };
  const projectDir = path.join(DOCS_DIR, safeName);
  ensureDir(projectDir);
  const project = {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: safeName,
    folderPath: projectDir,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(project);
  writeProjects(projects);
  return { ok: true, project };
});

ipcMain.handle('import-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择要导入的项目文件或文件夹',
    buttonLabel: '导入',
    properties: ['openFile', 'openDirectory', 'createDirectory'],
    filters: [
      { name: '支持的文档', extensions: ['mdoc', 'md', 'txt', 'docx', 'html', 'htm'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const selectedPath = result.filePaths[0];
  const stat = fs.statSync(selectedPath);
  if (stat.isFile()) {
    const ext = path.extname(selectedPath).toLowerCase();
    if (!FOLDER_SUPPORTED_EXTS.has(ext)) return { canceled: false, error: '不支持的文件格式' };
    return { canceled: false, name: path.basename(selectedPath), path: selectedPath, isFile: true, ext, size: stat.size, mtimeMs: stat.mtimeMs };
  }
  const folderName = path.basename(selectedPath);
  return { canceled: false, name: folderName, path: selectedPath, isFile: false };
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择项目存放位置',
    buttonLabel: '选择',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('create-project-at', async (_e, name, folderPath) => {
  const safeName = sanitizeFileName(name || '未命名项目');
  if (!safeName) return { ok: false, error: '名称不能为空' };
  const projects = readProjects();
  if (projects.find(p => p.name === safeName)) return { ok: false, error: '项目已存在' };
  const projectDir = path.join(folderPath, safeName);
  ensureDir(projectDir);
  const project = {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: safeName,
    folderPath: projectDir,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(project);
  writeProjects(projects);
  return { ok: true, project };
});

ipcMain.handle('scan-folder-tree', async (_e, dir) => scanFolderTree(dir));

ipcMain.handle('create-file-in-folder', async (_e, folderPath, fileName) => {
  try {
    const safeName = sanitizeFileName(fileName || '新建文件');
    if (!safeName) return { ok: false, error: '名称不能为空' };
    const filePath = path.join(folderPath, `${safeName}.mdoc`);
    if (fs.existsSync(filePath)) return { ok: false, error: '文件已存在' };
    const doc = { name: safeName, children: [], content: {}, updatedAt: new Date().toISOString() };
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf-8');
    return { ok: true, path: filePath, name: safeName };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '创建失败' };
  }
});

ipcMain.handle('open-folder-location', async (_e, folderPath) => {
  try {
    if (fs.existsSync(folderPath)) {
      await shell.showItemInFolder(folderPath);
    }
  } catch {}
  return true;
});
