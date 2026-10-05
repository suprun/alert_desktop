const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  getLocations: () => ipcRenderer.invoke('get-locations'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onThemeUpdated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('theme-updated', handler);
    return () => ipcRenderer.removeListener('theme-updated', handler);
  },
  closeSettings: () => ipcRenderer.send('close-settings'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  notifyReady: () => ipcRenderer.send('settings-window-ready')
});
