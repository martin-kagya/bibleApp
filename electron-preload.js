const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('app-info'),
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // Platform info
  platform: process.platform,
  
  // Check if running in Electron
  isElectron: true
})



