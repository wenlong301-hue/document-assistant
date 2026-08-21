const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

/** 导出/写回重库懒加载，避免主进程冷启动就加载 html-to-docx */
let htmlToDocxMod = null;
function getHtmlToDocx() {
  if (!htmlToDocxMod) htmlToDocxMod = require('html-to-docx');
  return htmlToDocxMod;
}

const { patchDocxText } = require('./lib/docxPatch.cjs');
const { createMarkdownImageWriter, contentHtmlToMarkdown, ensureDir } = require('./lib/markdownExport.cjs');
const { wordHtmlDocument, pdfHtmlDocument } = require('./lib/exportDocuments.cjs');
const { createDocsStore } = require('./lib/docsStore.cjs');
const { createAppSettings } = require('./lib/appSettings.cjs');
const { createProjects } = require('./lib/projects.cjs');
const { FOLDER_SUPPORTED_EXTS, createFolderWorkspace } = require('./lib/folderWorkspace.cjs');
const { createShareServer } = require('./lib/shareServer.cjs');
const { createAutoUpdaterService } = require('./lib/autoUpdaterService.cjs');

let mainWindow;
let tray = null;
let closeBehavior = 'ask'; // 'ask', 'tray', 'quit'
let forceQuit = false;
let closeAskPending = false;
let closeAskAwaitingAck = false;
let closeAskTimer = null;

function clearCloseAsk() {
  closeAskPending = false;
  closeAskAwaitingAck = false;
  if (closeAskTimer) {
    clearTimeout(closeAskTimer);
    closeAskTimer = null;
  }
}

const RELEASE_PAGE_URL = 'https://github.com/wenlong301-hue/document-assistant/releases/latest';
const DOCS_DIR = path.join(app.getPath('documents'), 'DocAssistant');
const RECENT_FILE = path.join(DOCS_DIR, 'recent.json');
const SETTINGS_FILE = path.join(DOCS_DIR, 'settings.json');
const PROJECTS_FILE = path.join(DOCS_DIR, 'projects.json');

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

const { getAllDocs, getDocContent, toMdocPayload, saveDoc, saveDocToFolder, deleteDoc } = createDocsStore({
  docsDir: DOCS_DIR,
  dialog,
  getMainWindow: () => mainWindow,
});

const { readAppSettings, writeAppSettings } = createAppSettings({
  settingsFile: SETTINGS_FILE,
  docsDir: DOCS_DIR,
});

const { readProjects, writeProjects, scanFolderTree } = createProjects({
  projectsFile: PROJECTS_FILE,
  docsDir: DOCS_DIR,
});

const {
  scanFolder,
  stopFolderWatcher,
  watchFolder,
  readFolderFile,
  writeFolderFile,
  getMarkdownSidecarPath,
} = createFolderWorkspace({
  patchDocxText,
  wordHtmlDocument,
  contentHtmlToMarkdown,
  createMarkdownImageWriter,
  toMdocPayload,
  getHtmlToDocx,
  sendToRenderer,
});

const {
  setActiveShareHtml,
  startShareServer,
  stopShareServer,
  setActiveShareDocId,
  getActiveShareVersion,
} = createShareServer({ getAllDocs, getDocContent });

const {
  setupAutoUpdater,
  checkForAppUpdates,
  installMacUpdateInPlace,
  autoUpdater,
  getLastDownloadedUpdatePath,
} = createAutoUpdaterService({
  app,
  sendToRenderer,
  getForceQuit: () => forceQuit,
  setForceQuit: (v) => { forceQuit = v; },
});

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

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
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
  // 白屏/页面未加载完成时渲染进程无法弹确认框，直接退出，避免关不掉
  mainWindow.on('close', (e) => {
    if (forceQuit) return;
    if (closeBehavior === 'tray') {
      e.preventDefault();
      mainWindow.hide();
      return;
    }
    if (closeBehavior === 'ask') {
      const wc = mainWindow.webContents;
      const url = wc && !wc.isDestroyed() ? wc.getURL() : '';
      const canAsk =
        wc &&
        !wc.isDestroyed() &&
        !wc.isLoading() &&
        url &&
        !url.startsWith('about:') &&
        !url.startsWith('chrome-error:') &&
        !url.startsWith('data:');
      if (!canAsk) {
        forceQuit = true;
        return;
      }
      e.preventDefault();
      if (closeAskPending) return;
      closeAskPending = true;
      closeAskAwaitingAck = true;
      mainWindow.webContents.send('request-close-window');
      // 渲染进程未 ACK（白屏/崩溃）时 2s 后强制退出；正常弹窗后会 ACK，不再强制
      closeAskTimer = setTimeout(() => {
        if (!closeAskAwaitingAck || forceQuit) return;
        if (!mainWindow || mainWindow.isDestroyed()) return;
        clearCloseAsk();
        forceQuit = true;
        app.quit();
      }, 2000);
      return;
    }
    // closeBehavior === 'quit' — default behavior
  });
  mainWindow.webContents.on('did-finish-load', () => {
    clearCloseAsk();
  });
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error('[window] did-fail-load', errorCode, errorDescription, validatedURL);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[window] render-process-gone', details);
    clearCloseAsk();
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
        forceQuit = true;
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
});
app.on('window-all-closed', () => { stopShareServer(); stopFolderWatcher(); if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('get-docs', () => getAllDocs());
ipcMain.handle('get-doc', (_e, id) => getDocContent(id));
ipcMain.handle('save-doc', (_e, id, data) => saveDoc(id, data));
ipcMain.handle('save-doc-to-folder', (_e, id, data, options) => saveDocToFolder(id, data, options || {}));
ipcMain.handle('delete-doc', (_e, id) => deleteDoc(id));
ipcMain.handle('start-share', async (_e, port, docId, html) => {
  const preferred = port || 6535;
  const { port: boundPort } = await startShareServer(preferred, docId || null, html || null);
  return { url: `http://${getLocalIP()}:${boundPort}`, port: boundPort };
});
ipcMain.handle('update-share-html', (_e, docId, html) => {
  if (docId) setActiveShareDocId(docId);
  if (html != null) setActiveShareHtml(html);
  return { version: getActiveShareVersion() };
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
  // macOS：原地静默替换当前 .app 并重启；Windows：NSIS 静默安装后重启。
  if (process.platform === 'darwin') {
    const lastDownloadedUpdatePath = getLastDownloadedUpdatePath();
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
  forceQuit = true;
  setImmediate(() => {
    try {
      // isSilent=true：静默安装；isForceRunAfter=true：安装后自动重启
      autoUpdater.quitAndInstall(true, true);
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
    const htmlToDocx = getHtmlToDocx();
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

ipcMain.handle('ack-close-window', () => {
  // 渲染进程已收到关闭请求并准备弹窗，取消强制退出计时
  closeAskAwaitingAck = false;
  if (closeAskTimer) {
    clearTimeout(closeAskTimer);
    closeAskTimer = null;
  }
  return true;
});

ipcMain.handle('respond-close-window', (_e, payload = {}) => {
  const action = payload?.action;
  if (action === 'cancel' || action === undefined || action === null) {
    clearCloseAsk();
    return false;
  }
  clearCloseAsk();
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (action !== 'tray' && action !== 'quit') return false;
  if (payload?.remember) {
    const settings = readAppSettings();
    settings.closeBehavior = action;
    writeAppSettings(settings);
    closeBehavior = action;
  }
  if (action === 'tray') {
    mainWindow.hide();
    return true;
  }
  forceQuit = true;
  app.quit();
  return true;
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

ipcMain.handle('import-folder', async (_e, kind) => {
  // macOS: filters + openDirectory 一起用会导致无法选文件夹，仅选文件时才加 filters
  const isFileOnly = kind === 'file';
  const isFolderOnly = kind === 'folder';
  const properties = isFileOnly
    ? ['openFile']
    : isFolderOnly
      ? ['openDirectory', 'createDirectory']
      : ['openFile', 'openDirectory', 'createDirectory'];
  /** @type {Electron.OpenDialogOptions} */
  const options = {
    title: isFolderOnly ? '选择要导入的文件夹' : isFileOnly ? '选择要导入的文件' : '选择要导入的项目文件或文件夹',
    buttonLabel: '导入',
    properties,
  };
  if (isFileOnly) {
    options.filters = [
      { name: '支持的文档', extensions: ['mdoc', 'md', 'txt', 'docx', 'html', 'htm', 'sql'] },
      { name: '所有文件', extensions: ['*'] },
    ];
  }
  const result = await dialog.showOpenDialog(mainWindow, options);
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
    const rootId = `file-${Date.now()}`;
    const doc = {
      name: safeName,
      children: [{ id: rootId, name: safeName, children: [] }],
      content: { [rootId]: '<p></p>' },
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf-8');
    const stat = fs.statSync(filePath);
    return { ok: true, path: filePath, name: `${safeName}.mdoc`, ext: '.mdoc', size: stat.size, mtimeMs: stat.mtimeMs };
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
