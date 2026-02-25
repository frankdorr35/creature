const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveState: (data) => ipcRenderer.send('save-state', data),
    loadState: () => ipcRenderer.invoke('load-state')
});
