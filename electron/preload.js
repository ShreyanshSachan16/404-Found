const { contextBridge, ipcRenderer } = require('electron');

// Secure Preload script enforcing context isolation
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openUserDataFolder: () => ipcRenderer.invoke('open-user-data-folder'),
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),
  onBackendStatusChange: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('backend-status', subscription);
    return () => ipcRenderer.removeListener('backend-status', subscription);
  }
});
