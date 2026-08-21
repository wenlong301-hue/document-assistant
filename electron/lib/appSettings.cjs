'use strict';

const fs = require('fs');
const { ensureDir } = require('./markdownExport.cjs');

function createAppSettings({ settingsFile, docsDir }) {
  function readAppSettings() {
    ensureDir(docsDir);
    if (!fs.existsSync(settingsFile)) {
      return { fontSize: '15px', lineHeight: '1.8', theme: 'light' };
    }
    try {
      return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch {
      return { fontSize: '15px', lineHeight: '1.8', theme: 'light' };
    }
  }

  function writeAppSettings(settings) {
    ensureDir(docsDir);
    const prev = readAppSettings();
    const next = { ...prev, ...(settings || {}) };
    fs.writeFileSync(settingsFile, JSON.stringify(next, null, 2), 'utf-8');
    return true;
  }

  return { readAppSettings, writeAppSettings };
}

module.exports = { createAppSettings };
