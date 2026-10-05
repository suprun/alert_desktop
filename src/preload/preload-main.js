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
  toggleTheme: (isDark) => ipcRenderer.send('toggle-app-theme', { isDark }),
  getAllAlerts: () => ipcRenderer.invoke('get-all-alerts'),
  onAllAlertsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('all-alerts-update', handler);
    return () => ipcRenderer.removeListener('all-alerts-update', handler);
  }
});
