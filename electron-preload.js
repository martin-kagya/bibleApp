const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // Platform info
  platform: process.platform,

  // Check if running in Electron
  isElectron: true,

  // Projector Controls
  openProjector: () => ipcRenderer.send('open-projector'),

  // Ingestion
  importEasyWorshipSongs: () => ipcRenderer.invoke('import-easyworship-songs'),
  importXmlSongs: () => ipcRenderer.invoke('import-xml-songs'),

  // Session Management
  saveSessionFile: (data) => ipcRenderer.invoke('save-session-file', data),
  loadSessionFile: () => ipcRenderer.invoke('load-session-file'),

  // Media Sources
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // Port Management
  getServerPort: () => ipcRenderer.invoke('get-server-port')
})



