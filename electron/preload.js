const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Downloads
  addDownload: (payload) => ipcRenderer.invoke('aria2:addDownload', payload),
  listDownloads: () => ipcRenderer.invoke('aria2:listDownloads'),
  getStatus: (gid) => ipcRenderer.invoke('aria2:getStatus', gid),
  pause: (gid) => ipcRenderer.invoke('aria2:pause', gid),
  pauseAll: () => ipcRenderer.invoke('aria2:pauseAll'),
  resume: (gid) => ipcRenderer.invoke('aria2:resume', gid),
  resumeAll: () => ipcRenderer.invoke('aria2:resumeAll'),
  remove: (gid) => ipcRenderer.invoke('aria2:remove', gid),
  removeResult: (gid) => ipcRenderer.invoke('aria2:removeResult', gid),
  changeOption: (gid, options) => ipcRenderer.invoke('aria2:changeOption', gid, options),
  changeGlobalOption: (options) => ipcRenderer.invoke('aria2:changeGlobalOption', options),

  // Network interfaces (used by both the Add Download dialog and Settings > Connection)
  getInterfaces: () => ipcRenderer.invoke('interfaces:list'),

  // Native dialogs
  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder'),
  chooseFile: (filters) => ipcRenderer.invoke('dialog:chooseFile', filters),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),

  // Live updates pushed from main (download progress / completion / errors)
  onDownloadEvent: (callback) => {
    const listener = (_evt, event) => callback(event);
    ipcRenderer.on('aria2:event', listener);
    return () => ipcRenderer.removeListener('aria2:event', listener);
  }
});
