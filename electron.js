


const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
require('dotenv').config()

let mainWindow

const DEV_SERVER_PORT = process.env.VITE_PORT || 3000

// Server configuration
const SERVER_PORT = process.env.PORT || 8000
const IS_DEV = process.env.NODE_ENV !== 'production'

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    backgroundColor: '#f9fafb',
    title: 'Bible Presentation App',
    show: false // Don't show until ready
  })

  // Remove default menu in production
  if (!IS_DEV) {
    Menu.setApplicationMenu(null)
  }

  // Load the app
  const startURL = IS_DEV
    ? `http://localhost:${DEV_SERVER_PORT}` // Vite dev server
    : `http://localhost:${SERVER_PORT}` // Production server

  mainWindow.loadURL(startURL)

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (IS_DEV) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Import server (runs in main process)
const { server } = require('./server')

function startServer() {
  // Start server in-process (runs in both dev and prod to share Electron runtime)
  server.listen(SERVER_PORT, () => {
    console.log(`Server running on port ${SERVER_PORT}`)
  })
}

function stopServer() {
  if (server && server.listening) {
    server.close(() => {
      console.log('Server closed')
    })
  }
}

// App lifecycle events
app.whenReady().then(() => {
  startServer()

  // Wait a bit for server to start
  setTimeout(() => {
    createWindow()
  }, IS_DEV ? 500 : 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopServer()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopServer()
})

// IPC handlers
ipcMain.handle('app-info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    isPackaged: app.isPackaged
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error)
})



