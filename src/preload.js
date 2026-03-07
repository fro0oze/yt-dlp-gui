const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Download
  startDownload: (url) => ipcRenderer.invoke('start-download', url),

  // Folder operations
  openFolder: () => ipcRenderer.invoke('open-folder'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Terminal output listener
  onTerminalOutput: (callback) => {
    ipcRenderer.on('terminal-output', (event, data) => callback(data));
  },

  // Download complete listener
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, result) => callback(result));
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates')
});