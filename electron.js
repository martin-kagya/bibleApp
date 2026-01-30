


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
      preload: path.join(__dirname, 'electron-preload.js'),
      webSecurity: false, // Allow Web Speech API to connect to Google
      allowRunningInsecureContent: false
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

  // Grant media permissions for microphone
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture']
    if (allowedPermissions.includes(permission)) {
      callback(true) // Allow
    } else {
      callback(false) // Deny
    }
  })

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

// Handle Projector Window
ipcMain.handle('get-desktop-sources', async () => {
  const { desktopCapturer } = require('electron')
  const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] })
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }))
})

let projectorWindow = null;

// Handle Projector Window
ipcMain.on('open-projector', () => {
  // If window exists, just return (no need to steal focus)
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    if (projectorWindow.isMinimized()) projectorWindow.restore();
    // Do NOT focus. The content updates via socket. 
    // If we focus, it disrupts the user's typing/control on the main dashboard.
    return;
  }

  const { screen } = require('electron')
  const displays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()

  // Find external display (first one that isn't primary)
  // If no external display, fall back to creating a new window on primary (offset)
  const externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0
  }) || primaryDisplay

  projectorWindow = new BrowserWindow({
    x: externalDisplay.bounds.x + 50,
    y: externalDisplay.bounds.y + 50,
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    backgroundColor: '#000000',
    title: 'Live Projector',
    autoHideMenuBar: true,
    show: false,
    focusable: true // Needs to be focusable to receive full screen events, but we won't focus it manually
  })

  const startURL = IS_DEV
    ? `http://localhost:${DEV_SERVER_PORT}/live`
    : `http://localhost:${SERVER_PORT}/live`

  projectorWindow.loadURL(startURL)

  projectorWindow.once('ready-to-show', () => {
    // If we found a distinct external display, go fullscreen there
    if (externalDisplay !== primaryDisplay) {
      projectorWindow.setFullScreen(true)
    }
    // usage of showInactive is key here to not steal focus from main window
    projectorWindow.showInactive();
  })

  // Open external links in browser
  projectorWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url)
    return { action: 'deny' }
  })

  // Reset variable when closed
  projectorWindow.on('closed', () => {
    projectorWindow = null;
  });
})

// IPC handlers
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    isPackaged: app.isPackaged
  }
})

// Helper function to clean EasyWorship RTF/Text
const cleanSongText = (text) => {
  if (!text) return '';

  // Remove common RTF tags if present
  let clean = text.replace(/\{\\rtf1[^{}]*\{[^{}]*\}|\\page|\\line|\\par|\\tab|\\\w+|[{\}]/g, '');

  // Remove EasyWorship specific tags like [Verse 1], [Chorus], etc. or keep them if preferred
  // For now let's just clean up whitespace
  clean = clean.split('\n').map(line => line.trim()).filter(line => line).join('\n');

  return clean;
}

ipcMain.handle('import-xml-songs', async () => {
  const fs = require('fs');
  const path = require('path');
  const { XMLParser } = require('fast-xml-parser');

  const songsDir = path.join(__dirname, 'data', 'Songs');
  if (!fs.existsSync(songsDir)) {
    return { success: false, message: 'Songs directory not found' };
  }

  try {
    const files = fs.readdirSync(songsDir).filter(f => f.endsWith('.xml'));
    const songs = [];
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });

    for (const file of files) {
      const filePath = path.join(songsDir, file);
      // Read as buffer first to handle encoding
      const buffer = fs.readFileSync(filePath);

      // XML files from this app seem to be UTF-16LE
      let content = buffer.toString('utf16le');
      if (!content.includes('<?xml')) {
        // Fallback to utf8 if not utf16
        content = buffer.toString('utf8');
      }

      const jsonObj = parser.parse(content);
      const songData = jsonObj.song;

      if (songData) {
        let title = '';
        if (songData.properties && songData.properties.titles) {
          title = songData.properties.titles.title;
          if (Array.isArray(title)) title = title[0];
          // Titles often have "@_lang" attribute if ignoreAttributes is false
          if (typeof title === 'object') title = title['#text'] || title['title'];
        }

        // Fallback to filename if title is missing
        if (!title) title = path.basename(file, '.xml').trim();

        let lyrics = '';
        if (songData.lyrics && songData.lyrics.verse) {
          const verses = Array.isArray(songData.lyrics.verse)
            ? songData.lyrics.verse
            : [songData.lyrics.verse];

          lyrics = verses.map(v => {
            let lines = v.lines;
            if (typeof lines === 'object' && lines['#text']) lines = lines['#text'];
            if (typeof lines === 'string') {
              return lines.replace(/<br\s*\/?>/gi, '\n');
            }
            return '';
          }).filter(l => l).join('\n\n');
        }

        if (title && lyrics) {
          songs.push({ title: title.trim(), lyrics: lyrics.trim() });
        }
      }
    }

    return { success: true, songs, count: songs.length };
  } catch (error) {
    console.error('XML Import error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('import-easyworship-songs', async () => {
  const { dialog } = require('electron');
  const Database = require('better-sqlite3');

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select EasyWorship Songs Database',
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: 'No file selected' };
  }

  const dbPath = result.filePaths[0];
  let db;
  try {
    db = new Database(dbPath, { readonly: true });

    // Check if it's a song database
    // EasyWorship 6/7 usually has a 'song' table
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='song'").get();

    if (!tableCheck) {
      return { success: false, message: 'Invalid database: No "song" table found' };
    }

    // EasyWorship schema varies but title and words/lyrics are core
    // We'll try to find common column names
    const columns = db.prepare("PRAGMA table_info(song)").all();
    const colNames = columns.map(c => c.name.toLowerCase());

    const titleCol = colNames.includes('title') ? 'title' : null;
    const bodyCol = colNames.includes('words') ? 'words' : (colNames.includes('lyrics') ? 'lyrics' : null);

    if (!titleCol || !bodyCol) {
      return { success: false, message: 'Could not identify title or lyrics columns in database' };
    }

    const rows = db.prepare(`SELECT ${titleCol} as title, ${bodyCol} as body FROM song`).all();

    const songs = rows.map(row => ({
      title: row.title,
      lyrics: cleanSongText(row.body)
    })).filter(s => s.title && s.lyrics);

    return { success: true, songs, count: songs.length };
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, message: error.message };
  } finally {
    if (db) db.close();
  }
})

ipcMain.handle('save-session-file', async (event, data) => {
  const { dialog } = require('electron');
  const fs = require('fs');

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Service Schedule',
    defaultPath: `service_schedule_${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (result.canceled || !result.filePath) return false;

  try {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Save error:', error);
    return false;
  }
});

ipcMain.handle('load-session-file', async () => {
  const { dialog } = require('electron');
  const fs = require('fs');

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Load Service Schedule',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Load error:', error);
    return null;
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error)
})



