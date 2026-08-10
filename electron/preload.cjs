const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDocs: () => ipcRenderer.invoke('get-docs'),
  getDoc: (id) => ipcRenderer.invoke('get-doc', id),
  saveDoc: (id, data) => ipcRenderer.invoke('save-doc', id, data),
  saveDocToFolder: (id, data) => ipcRenderer.invoke('save-doc-to-folder', id, data),
  deleteDoc: (id) => ipcRenderer.invoke('delete-doc', id),
  startShare: (port, docId) => ipcRenderer.invoke('start-share', port, docId),
  stopShare: () => ipcRenderer.invoke('stop-share'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdates: (options) => ipcRenderer.invoke('check-for-updates', options || {}),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  openReleasePage: () => ipcRenderer.invoke('open-release-page'),
  skipUpdateVersion: (version) => ipcRenderer.invoke('skip-update-version', version),
  getSkippedUpdateVersion: () => ipcRenderer.invoke('get-skipped-update-version'),
  onUpdateChecking: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-checking', handler);
    return () => ipcRenderer.removeListener('update-checking', handler);
  },
  onUpdateAvailable: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateNotAvailable: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
  exportHtml: (content, name) => ipcRenderer.invoke('export-html', content, name),
  exportMarkdown: (payload) => ipcRenderer.invoke('export-markdown', payload),
  exportDocx: (payloadOrContent, name) => ipcRenderer.invoke('export-docx', payloadOrContent, name),
  exportPdf: (payloadOrContent, name) => ipcRenderer.invoke('export-pdf', payloadOrContent, name),
  getDocHtml: (docName) => ipcRenderer.invoke('get-doc-html', docName),
  settingsRead: () => ipcRenderer.invoke('settings-read'),
  settingsWrite: (settings) => ipcRenderer.invoke('settings-write', settings),
  onNewDoc: (callback) => ipcRenderer.on('new-doc', callback),
  onViewportChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('viewport-change', handler);
    return () => ipcRenderer.removeListener('viewport-change', handler);
  },
});
