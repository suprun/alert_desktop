const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  verifyApiToken: (providerName, token) => ipcRenderer.invoke('verify-api-token', providerName, token),
  getLocations: () => ipcRenderer.invoke('get-locations'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onThemeUpdated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('theme-updated', handler);
    return () => ipcRenderer.removeListener('theme-updated', handler);
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatusChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status-changed', handler);
    return () => ipcRenderer.removeListener('update-status-changed', handler);
  },
  onUpdateDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  closeSettings: () => ipcRenderer.send('close-settings'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onScrollToSection: (callback) => {
    const handler = (_event, sectionId) => callback(sectionId);
    ipcRenderer.on('scroll-to-section', handler);
    return () => ipcRenderer.removeListener('scroll-to-section', handler);
  },
  notifyReady: () => ipcRenderer.send('settings-window-ready')
});
