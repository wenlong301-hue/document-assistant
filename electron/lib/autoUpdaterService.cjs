'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const { autoUpdater } = require('electron-updater');
const { ensureDir } = require('./markdownExport.cjs');

const execFileAsync = promisify(execFile);

function createAutoUpdaterService(deps) {
  const {
    app,
    sendToRenderer,
    getForceQuit,
    setForceQuit,
  } = deps;

  let updateCheckInFlight = false;
  let lastDownloadedUpdatePath = null;

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
      setForceQuit(true);
      app.quit();
    }, 200);
    return { ok: true, mode: 'replace-in-place', appPath: currentApp };
  }

  function setupAutoUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    // 始终全量下载安装包，禁用差量/WebInstaller，保证更新包完整可静默安装
    autoUpdater.disableDifferentialDownload = true;
    autoUpdater.disableWebInstaller = true;
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

  return {
    setupAutoUpdater,
    checkForAppUpdates,
    installMacUpdateInPlace,
    autoUpdater,
    getLastDownloadedUpdatePath: () => lastDownloadedUpdatePath,
    setLastDownloadedUpdatePath: (p) => { lastDownloadedUpdatePath = p; },
  };
}

module.exports = { createAutoUpdaterService };
