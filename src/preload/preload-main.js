const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alertAPI', {
  getCurrentStatus: () => ipcRenderer.invoke('get-current-status'),
  openSettings: () => ipcRenderer.send('open-settings'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onThemeUpdated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('theme-updated', handler);
    return () => ipcRenderer.removeListener('theme-updated', handler);
  },
  onStatusUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('status-update', handler);
    return () => ipcRenderer.removeListener('status-update', handler);
  },
  onPlayAudio: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('play-audio', handler);
    return () => ipcRenderer.removeListener('play-audio', handler);
  },
  onMapLoadingState: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('map-loading-state', handler);
    return () => ipcRenderer.removeListener('map-loading-state', handler);
  },
  reloadMap: () => ipcRenderer.send('reload-map'),
  selectMapTab: (tabId) => ipcRenderer.invoke('select-map-tab', tabId),
  getActiveMapTab: () => ipcRenderer.invoke('get-active-map-tab'),
  getActiveMapTabSync: () => ipcRenderer.sendSync('get-active-map-tab-sync'),
  onMapTabChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('map-tab-changed', handler);
    return () => ipcRenderer.removeListener('map-tab-changed', handler);
  },
  toggleTheme: (isDark) => ipcRenderer.send('toggle-app-theme', { isDark }),
  getAllAlerts: () => ipcRenderer.invoke('get-all-alerts'),
  onAllAlertsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('all-alerts-update', handler);
    return () => ipcRenderer.removeListener('all-alerts-update', handler);
  },
  getRegionHistory: (params) => ipcRenderer.invoke('get-region-history', params),
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
  }
});
