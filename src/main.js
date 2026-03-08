const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const path = require('path');
const Store = require('electron-store');

const createUpdater = require('./modules/updater');
const createDependencies = require('./modules/dependencies');
const registerIpc = require('./modules/ipc');

// ─── Store ────────────────────────────────────────────────────────────────────

const store = new Store({
  defaults: {
    downloadPath: app.getPath('desktop'),
    format: 'mp3',
    audioQuality: '192',
    videoQuality: 'best',
    embedThumbnail: false,
    speedLimit: '',
    subtitleMode: 'off',
    subtitleLang: 'de',
    appLang: 'de',
    notifyOnComplete: true,
    skipExisting: true,
    downloadDelay: '0',
    proxy: '',
    customArgs: '',
    verbose: false,
    jsRuntime: false,
    clearBetweenItems: true
  }
});

// ─── Paths ────────────────────────────────────────────────────────────────────

let mainWindow;
let ytdlpPath, ffmpegPath, ffprobePath, binDir;

function getPaths() {
  if (app.isPackaged) {
    binDir = path.join(app.getPath('userData'), 'bin');
  } else {
    binDir = path.join(__dirname, '..', 'bin');
  }
  ytdlpPath  = path.join(binDir, 'yt-dlp.exe');
  ffmpegPath = path.join(binDir, 'ffmpeg.exe');
  ffprobePath = path.join(binDir, 'ffprobe.exe');
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    if (params.isEditable) {
      if (params.editFlags.canCut)  menu.append(new MenuItem({ label: 'Cut',  role: 'cut' }));
      if (params.editFlags.canCopy) menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
    } else if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
    }
    if (menu.items.length > 0) menu.popup({ window: mainWindow });
  });

  if (!app.isPackaged) mainWindow.webContents.openDevTools();
}

function logToTerminal(message) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('terminal-output', message);
  }
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  getPaths();
  createWindow();

  const getWindow = () => mainWindow;
  const log = (msg) => logToTerminal(msg);

  const updater = createUpdater({ log, getWindow });
  const deps    = createDependencies({ log, getWindow, binDir, ytdlpPath, ffmpegPath, ffprobePath });

  registerIpc({
    ipcMain, store, getWindow, ytdlpPath, binDir, log,
    updateYtDlp:    deps.updateYtDlp,
    checkForUpdates: updater.checkForUpdates
  });

  updater.setup();

  await mainWindow.webContents.once('did-finish-load', async () => {
    const depsOk = await deps.ensureDependencies();
    if (depsOk) {
      deps.updateYtDlp();
      updater.checkForUpdates(true);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
