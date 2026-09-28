const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  getLocations: () => ipcRenderer.invoke('get-locations'),
  closeSettings: () => ipcRenderer.send('close-settings')
});
