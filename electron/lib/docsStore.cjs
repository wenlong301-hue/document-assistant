'use strict';

const path = require('path');
const fs = require('fs');
const { ensureDir } = require('./markdownExport.cjs');

function createDocsStore({ docsDir, dialog, getMainWindow }) {
  function getAllDocs() {
    ensureDir(docsDir);
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.mdoc'));
    return files.map(f => {
      const fp = path.join(docsDir, f);
      try {
        const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        return { id: f.replace('.mdoc', ''), name: data.name || data.title || f.replace('.mdoc', ''), filePath: fp, updatedAt: data.updatedAt };
      } catch {
        return { id: f.replace('.mdoc', ''), name: f.replace('.mdoc', ''), filePath: fp, updatedAt: null };
      }
    });
  }

  function getDocContent(docId) {
    const fp = path.join(docsDir, `${docId}.mdoc`);
    if (!fs.existsSync(fp)) return null;
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch { return null; }
  }

  /** L1 .mdoc 序列化：剥离运行时 source 字段，只保留权威结构 */
  function toMdocPayload(data, nameFallback) {
    const raw = data && typeof data === 'object' ? { ...data } : {};
    delete raw.source;
    raw.name = raw.name || nameFallback || '未命名文档';
    raw.updatedAt = new Date().toISOString();
    return raw;
  }

  function saveDoc(docId, data) {
    ensureDir(docsDir);
    const fp = path.join(docsDir, `${docId}.mdoc`);
    fs.writeFileSync(fp, JSON.stringify(toMdocPayload(data, docId), null, 2), 'utf-8');
    return fp;
  }

  async function saveDocToFolder(docId, data, options = {}) {
    const mainWindow = typeof getMainWindow === 'function' ? getMainWindow() : null;
    const defaultDir = typeof options?.defaultDir === 'string' && options.defaultDir && fs.existsSync(options.defaultDir)
      ? options.defaultDir
      : undefined;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 .mdoc 保存位置',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultDir,
    });
    if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
    const targetDir = result.filePaths[0];
    const safeName = String(data?.name || docId || '未命名文档').replace(/[\\/:*?"<>|]/g, '_').replace(/\.mdoc$/i, '');
    let filePath = path.join(targetDir, `${safeName}.mdoc`);
    if (fs.existsSync(filePath)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      filePath = path.join(targetDir, `${safeName}-${stamp}.mdoc`);
    }
    const payload = toMdocPayload(data, safeName);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    const stat = fs.statSync(filePath);
    return {
      canceled: false,
      filePath,
      name: path.basename(filePath),
      ext: '.mdoc',
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      dir: targetDir,
    };
  }

  function deleteDoc(docId) {
    const fp = path.join(docsDir, `${docId}.mdoc`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  return { getAllDocs, getDocContent, toMdocPayload, saveDoc, saveDocToFolder, deleteDoc };
}

module.exports = { createDocsStore };
