const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'KHMERZOON',
    icon: path.join(__dirname, '../public/icon-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Disable all extensions and plugins
      plugins: false,
      devTools: isDev,
    },
    autoHideMenuBar: true,
  });

  // Block all extensions and external protocols
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Deny all external permissions
    callback(false);
  });

  // Block extension loading
  session.defaultSession.setPreloads([]);

  // Prevent navigation to external URLs (security)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const appUrl = isDev ? 'localhost' : '';
    
    if (!parsedUrl.origin.includes(appUrl) && navigationUrl !== mainWindow.webContents.getURL()) {
      event.preventDefault();
    }
  });

  // Disable opening new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Block download attempts (enhanced protection)
  mainWindow.webContents.session.on('will-download', (event) => {
    event.preventDefault();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Remove default menu
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  // Clear all extensions before creating window
  session.defaultSession.getAllExtensions().forEach((ext) => {
    session.defaultSession.removeExtension(ext.id);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent any web requests to extension stores
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl.includes('chrome.google.com/webstore') || 
        navigationUrl.includes('addons.mozilla.org')) {
      event.preventDefault();
    }
  });
});
