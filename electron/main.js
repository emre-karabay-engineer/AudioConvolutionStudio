const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const isDev = process.env.NODE_ENV === 'development'

// Set environment variable for Electron renderer
process.env.ELECTRON_RENDERER_URL = 'true'

let backendProcess = null
let isShuttingDown = false

function startBackendServer() {
  console.log('Starting backend server...')
  
  // Start the Node.js backend server
  backendProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false // Ensure the process is not detached
  })

  backendProcess.stdout.on('data', (data) => {
    console.log('Backend stdout:', data.toString())
  })

  backendProcess.stderr.on('data', (data) => {
    console.log('Backend stderr:', data.toString())
  })

  backendProcess.on('close', (code) => {
    console.log('Backend server closed with code:', code)
    backendProcess = null
  })

  backendProcess.on('error', (error) => {
    console.error('Backend server error:', error)
  })

  // Wait a bit for the server to start
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Backend server should be running on port 3001')
      resolve()
    }, 2000)
  })
}

async function stopBackendServer() {
  if (backendProcess && !isShuttingDown) {
    isShuttingDown = true
    console.log('Stopping backend server gracefully...')
    
    try {
      // First try graceful shutdown with SIGTERM
      backendProcess.kill('SIGTERM')
      
      // Wait up to 5 seconds for graceful shutdown
      let attempts = 0
      const maxAttempts = 50 // 50 * 100ms = 5 seconds
      
      while (backendProcess && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      // If still running, force kill with SIGKILL
      if (backendProcess) {
        console.log('Force killing backend server...')
        backendProcess.kill('SIGKILL')
        
        // Wait a bit more for the kill to take effect
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      backendProcess = null
      console.log('Backend server stopped')
    } catch (error) {
      console.error('Error stopping backend server:', error)
      // Force kill if there's an error
      if (backendProcess) {
        backendProcess.kill('SIGKILL')
        backendProcess = null
      }
    }
  }
}

function createWindow() {
  // Create the browser window.
  let mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  })

  // Load the app
  if (isDev) {
    console.log('Loading development URL: http://localhost:5173')
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html')
    console.log('Loading production file:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  // Add error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM is ready')
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window is ready to show')
    mainWindow.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Start the backend server first
    await startBackendServer()
    
    // Then create the window
    createWindow()
  } catch (error) {
    console.error('Failed to start backend server:', error)
    // Still create the window even if backend fails
    createWindow()
  }
})

// Handle app quit gracefully
app.on('before-quit', async (event) => {
  if (!isShuttingDown) {
    event.preventDefault()
    console.log('App quitting, stopping backend server...')
    await stopBackendServer()
    app.exit(0)
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await stopBackendServer()
    app.quit()
  }
})

// Handle macOS activation
app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Handle process termination signals
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  await stopBackendServer()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  await stopBackendServer()
  process.exit(0)
})

// IPC handlers for file dialogs
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'aiff'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.filePaths[0] || null
})

ipcMain.handle('select-impulse-response', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'aiff'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.filePath || null
})

ipcMain.handle('save-output-file', async () => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'WAV Files', extensions: ['wav'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.filePath || null
}) 