const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alertAPI', {
  getCurrentStatus: () => ipcRenderer.invoke('get-current-status'),
  openSettings: () => ipcRenderer.send('open-settings'),
  onStatusUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('status-update', handler);
    return () => ipcRenderer.removeListener('status-update', handler);
  },
  onPlayAudio: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('play-audio', handler);
    return () => ipcRenderer.removeListener('play-audio', handler);
  }
});
