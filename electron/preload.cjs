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
  exportHtml: (content, name) => ipcRenderer.invoke('export-html', content, name),
  exportMarkdown: (payload) => ipcRenderer.invoke('export-markdown', payload),
  exportDocx: (payloadOrContent, name) => ipcRenderer.invoke('export-docx', payloadOrContent, name),
  exportPdf: (payloadOrContent, name) => ipcRenderer.invoke('export-pdf', payloadOrContent, name),
  getDocHtml: (docName) => ipcRenderer.invoke('get-doc-html', docName),
  settingsRead: () => ipcRenderer.invoke('settings-read'),
  settingsWrite: (settings) => ipcRenderer.invoke('settings-write', settings),
  onNewDoc: (callback) => ipcRenderer.on('new-doc', callback),
});
