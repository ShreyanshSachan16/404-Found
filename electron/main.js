const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const BackendManager = require('./backend-manager');

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Windows App User Model ID for proper Start Menu and Taskbar grouping
app.setAppUserModelId('edu.campus.404found');

let mainWindow = null;
const backendManager = new BackendManager();

async function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: '404 FOUND — Campus Recovery Network',
    icon: iconPath,
    backgroundColor: '#0b0d14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Remove default menu bar for clean modern desktop experience
  mainWindow.setMenuBarVisibility(false);

  // Security: Restrict in-app navigation strictly to local loopback server
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isLoopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
      if (!isLoopback) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch {
      event.preventDefault();
    }
  });

  // Security: Open external target="_blank" links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Smooth appearance once content is ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start internal Express backend
  try {
    const { serverUrl } = await backendManager.start();
    console.log(`[Main] Loading desktop application from ${serverUrl}`);
    await mainWindow.loadURL(serverUrl);
  } catch (err) {
    console.error('[Main] Failed to start internal backend:', err);
    const result = await dialog.showMessageBox(mainWindow || null, {
      type: 'error',
      title: '404 FOUND — Startup Error',
      message: 'Failed to launch internal recovery engine.',
      detail: `${err.message}\n\nWould you like to open the logs folder to troubleshoot?`,
      buttons: ['Open Logs Folder', 'Exit Application'],
      defaultId: 0
    });

    if (result.response === 0) {
      shell.openPath(backendManager.logsDir);
    }
    app.quit();
  }
}

// Second instance handler (focus existing window)
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Register IPC handlers
ipcMain.handle('get-api-url', () => {
  return backendManager.serverUrl;
});

ipcMain.handle('open-external', async (event, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('open-user-data-folder', async () => {
  await shell.openPath(backendManager.userDataDir);
  return true;
});

ipcMain.handle('get-app-status', () => {
  return {
    version: app.getVersion(),
    port: backendManager.port,
    serverUrl: backendManager.serverUrl,
    userDataDir: backendManager.userDataDir,
    dbPath: backendManager.dbPath,
    isPackaged: app.isPackaged
  };
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

let isShuttingDown = false;
app.on('before-quit', async (event) => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    event.preventDefault();
    console.log('[Main] Shutting down application and internal backend...');
    try {
      await backendManager.stop();
    } catch (e) {
      console.error('[Main] Error during shutdown:', e);
    }
    app.quit();
  }
});
