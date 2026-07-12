const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog } = require('electron');
const path = require('path');

const Aria2Process = require('./aria2-process');
const Aria2Rpc = require('./aria2-rpc');
const { listInterfaces } = require('./network-interfaces');
const Settings = require('./store');
const { registerAria2Handlers } = require('./ipc-handlers');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;
let aria2Process = null;
let rpc = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#1b1d22',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    autoHideMenuBar: true
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', (e) => {
    // Minimize-to-tray instead of quitting, matching IDM's default behavior.
    if (!app.isQuitting && Settings.get('minimizeToTrayOnClose', true)) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'resources', 'tray-icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Show AriaGet', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Pause all', click: () => rpc.call('aria2.pauseAll') },
    { label: 'Resume all', click: () => rpc.call('aria2.unpauseAll') },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('AriaGet');
  tray.setContextMenu(menu);
  tray.on('double-click', () => mainWindow.show());
}

async function bootstrapAria2() {
  aria2Process = new Aria2Process({
    rpcPort: 6800,
    rpcSecret: Settings.get('rpcSecret'),
    sessionFile: path.join(app.getPath('userData'), 'aria2.session')
  });
  await aria2Process.start();

  rpc = new Aria2Rpc({
    host: '127.0.0.1',
    port: 6800,
    secret: Settings.get('rpcSecret')
  });
  await rpc.connect();

  registerAria2Handlers(ipcMain, rpc, () => mainWindow);
}

ipcMain.handle('dialog:chooseFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:chooseFile', async (_evt, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: filters || [] });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('interfaces:list', async () => listInterfaces());
ipcMain.handle('settings:get', () => Settings.store);
ipcMain.handle('settings:save', (_evt, patch) => {
  Settings.set(patch);
  return Settings.store;
});

app.whenReady().then(async () => {
  createWindow();
  createTray();
  await bootstrapAria2();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On Windows, keep the app alive in the tray unless the user explicitly quit.
  if (process.platform !== 'darwin' && app.isQuitting) app.quit();
});

app.on('before-quit', async (e) => {
  if (rpc && !app.__sessionSaved) {
    e.preventDefault();
    app.__sessionSaved = true;
    try {
      await rpc.call('aria2.saveSession');
    } catch (err) {
      console.error('Failed to save aria2 session', err);
    }
    if (aria2Process) aria2Process.stop();
    app.quit();
  }
});
