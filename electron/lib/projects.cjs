'use strict';

const path = require('path');
const fs = require('fs');
const { ensureDir } = require('./markdownExport.cjs');
const { FOLDER_SUPPORTED_EXTS, FOLDER_SKIP_DIRS } = require('./folderWorkspace.cjs');

function createProjects({ projectsFile, docsDir }) {
  function readProjects() {
    ensureDir(docsDir);
    if (!fs.existsSync(projectsFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(projectsFile, 'utf-8'));
    } catch { return []; }
  }

  function writeProjects(projects) {
    ensureDir(docsDir);
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2), 'utf-8');
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

  return { readProjects, writeProjects, scanFolderTree, scanFolderTree_single };
}

module.exports = { createProjects };
