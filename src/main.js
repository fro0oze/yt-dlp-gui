const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Notification, Menu, MenuItem } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const Store = require('electron-store');
const axios = require('axios');

// Initialize electron-store
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

let mainWindow;
let ytdlpPath;
let ffmpegPath;
let ffprobePath;
let binDir;

// Determine paths (dev vs production)
function getPaths() {
  if (app.isPackaged) {
    // Store binaries in userData (AppData\Roaming\...) so they persist across app updates/reinstalls
    binDir = path.join(app.getPath('userData'), 'bin');
  } else {
    binDir = path.join(__dirname, '..', 'bin');
  }

  ytdlpPath = path.join(binDir, 'yt-dlp.exe');
  ffmpegPath = path.join(binDir, 'ffmpeg.exe');
  ffprobePath = path.join(binDir, 'ffprobe.exe');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false // Don't show until ready
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Right-click context menu
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    if (params.isEditable) {
      if (params.editFlags.canCut)
        menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
      if (params.editFlags.canCopy)
        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
    } else if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
    }
    if (menu.items.length > 0) menu.popup({ window: mainWindow });
  });

  // Optional: Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// Send message to terminal
function logToTerminal(message) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('terminal-output', message);
  }
}

// Download file with progress
async function downloadFile(url, destPath, filename) {
  return new Promise(async (resolve, reject) => {
    try {
      logToTerminal(`[DOWNLOAD] Fetching ${filename}...\n`);

      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        maxRedirects: 5,
        timeout: 60000
      });

      const totalLength = response.headers['content-length'];
      let downloadedLength = 0;
      let lastProgress = 0;

      const writer = fs.createWriteStream(destPath);

      response.data.on('data', (chunk) => {
        downloadedLength += chunk.length;
        if (totalLength) {
          const progress = Math.floor((downloadedLength / totalLength) * 100);
          if (progress >= lastProgress + 10) {
            logToTerminal(`[DOWNLOAD] Progress: ${progress}%\n`);
            lastProgress = progress;
          }
        }
      });

      response.data.pipe(writer);

      writer.on('finish', () => {
        logToTerminal(`[DOWNLOAD] ${filename} downloaded successfully!\n`);
        resolve();
      });

      writer.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Download latest yt-dlp from GitHub
async function downloadYtDlp() {
  try {
    logToTerminal('[SYSTEM] yt-dlp.exe not found. Downloading latest release...\n');

    // Get latest release info
    const releaseResponse = await axios.get(
      'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',
      { timeout: 10000 }
    );

    const asset = releaseResponse.data.assets.find(a => a.name === 'yt-dlp.exe');

    if (!asset) {
      throw new Error('yt-dlp.exe not found in latest release');
    }

    await downloadFile(asset.browser_download_url, ytdlpPath, 'yt-dlp.exe');
    logToTerminal('[SUCCESS] yt-dlp.exe installed!\n\n');
    return true;

  } catch (error) {
    logToTerminal(`[ERROR] Failed to download yt-dlp: ${error.message}\n\n`);
    return false;
  }
}

// Download and extract FFmpeg
async function downloadFFmpeg() {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);

  try {
    logToTerminal('[SYSTEM] FFmpeg tools not found. Downloading...\n');

    const ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z';
    const tempPath = path.join(binDir, 'ffmpeg-temp.7z');

    await downloadFile(ffmpegUrl, tempPath, 'ffmpeg-essentials.7z');

    logToTerminal('[SYSTEM] Extracting FFmpeg (this may take a moment)...\n');

    // Get the bundled 7za.exe path
    let sevenZipPath;
    if (app.isPackaged) {
      sevenZipPath = path.join(process.resourcesPath, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
    } else {
      sevenZipPath = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
    }

    // Check if 7za.exe exists
    if (!fs.existsSync(sevenZipPath)) {
      throw new Error(`7za.exe not found at: ${sevenZipPath}`);
    }

    logToTerminal(`[DEBUG] Using 7za.exe from: ${sevenZipPath}\n`);
    logToTerminal(`[DEBUG] Extracting to: ${binDir}\n`);

    // Extract using execFile instead of node-7z wrapper
    try {
      const { stdout, stderr } = await execFileAsync(sevenZipPath, [
        'x',           // Extract with full paths
        tempPath,      // Archive to extract
        `-o${binDir}`, // Output directory
        '-y'           // Yes to all prompts
      ]);

      if (stdout) logToTerminal(stdout);
      if (stderr) logToTerminal(stderr);

    } catch (execError) {
      logToTerminal(`[ERROR] Extraction error: ${execError.message}\n`);
      throw execError;
    }

    logToTerminal('[SYSTEM] Extraction complete. Locating FFmpeg binaries...\n');

    // Find the extracted ffmpeg folder (dynamic name with date/hash)
    const extractedDir = fs.readdirSync(binDir).find(f => {
      const fullPath = path.join(binDir, f);
      return f.startsWith('ffmpeg-') &&
             f.includes('essentials_build') &&
             fs.statSync(fullPath).isDirectory();
    });

    if (!extractedDir) {
      throw new Error('Could not find extracted ffmpeg folder');
    }

    logToTerminal(`[DEBUG] Found extracted folder: ${extractedDir}\n`);

    const ffmpegBinDir = path.join(binDir, extractedDir, 'bin');
    const srcFfmpeg = path.join(ffmpegBinDir, 'ffmpeg.exe');
    const srcFfprobe = path.join(ffmpegBinDir, 'ffprobe.exe');

    if (!fs.existsSync(srcFfmpeg) || !fs.existsSync(srcFfprobe)) {
      throw new Error(`FFmpeg binaries not found in: ${ffmpegBinDir}`);
    }

    // Copy to bin root
    fs.copyFileSync(srcFfmpeg, ffmpegPath);
    fs.copyFileSync(srcFfprobe, ffprobePath);

    logToTerminal('[SUCCESS] FFmpeg tools installed!\n');

    // Cleanup
    logToTerminal('[SYSTEM] Cleaning up temporary files...\n');
    try {
      fs.unlinkSync(tempPath);
      fs.rmSync(path.join(binDir, extractedDir), { recursive: true, force: true });
      logToTerminal('[SYSTEM] Cleanup complete!\n\n');
    } catch (cleanupErr) {
      logToTerminal(`[WARNING] Cleanup failed: ${cleanupErr.message}\n\n`);
    }

    return true;

  } catch (error) {
    logToTerminal(`[ERROR] Failed to download/extract FFmpeg: ${error.message}\n`);
    logToTerminal(`[ERROR] Stack trace:\n${error.stack}\n\n`);
    return false;
  }
}

// Show manual download dialog
function showManualDownloadDialog() {
  const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest';
  const ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z';

  clipboard.writeText(`${ytdlpUrl}\n${ffmpegUrl}`);

  const response = dialog.showMessageBoxSync(mainWindow, {
    type: 'error',
    title: 'Dependencies Required',
    message: 'Failed to download required dependencies automatically.',
    detail:
      `Please download manually:\n\n` +
      `1. yt-dlp.exe:\n${ytdlpUrl}\n\n` +
      `2. FFmpeg essentials:\n${ffmpegUrl}\n\n` +
      `Extract and place ffmpeg.exe & ffprobe.exe in:\n${binDir}\n\n` +
      `(URLs copied to clipboard)`,
    buttons: ['Open yt-dlp Page', 'Open FFmpeg Page', 'Exit'],
    defaultId: 0,
    cancelId: 2
  });

  if (response === 0) {
    shell.openExternal(ytdlpUrl);
  } else if (response === 1) {
    shell.openExternal(ffmpegUrl);
  }

  app.quit();
}

// Check and download dependencies
async function ensureDependencies() {
  // Create bin directory if it doesn't exist
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  let ytdlpOk = fs.existsSync(ytdlpPath);
  let ffmpegOk = fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath);

  // Download yt-dlp if missing
  if (!ytdlpOk) {
    ytdlpOk = await downloadYtDlp();
  }

  // Download FFmpeg if missing
  if (!ffmpegOk) {
    ffmpegOk = await downloadFFmpeg();
  }

  // If any failed, show manual dialog
  if (!ytdlpOk || !ffmpegOk) {
    showManualDownloadDialog();
    return false;
  }

  return true;
}

// Update yt-dlp binary
function updateYtDlp() {
  const updateProcess = spawn(ytdlpPath, ['-U'], {
    windowsHide: true
  });

  logToTerminal('[SYSTEM] Checking for yt-dlp updates...\n');

  updateProcess.stdout.on('data', (data) => {
    logToTerminal(data.toString());
  });

  updateProcess.stderr.on('data', (data) => {
    logToTerminal(data.toString());
  });

  updateProcess.on('close', (code) => {
    if (code === 0) {
      logToTerminal('[SYSTEM] yt-dlp is up to date!\n\n');
    } else {
      logToTerminal(`[SYSTEM] Update check completed with code ${code}\n\n`);
    }
  });
}

// ─── App Auto-Updater ────────────────────────────────────────────────────────

let _silentUpdateCheck = false;

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (!_silentUpdateCheck) logToTerminal('[UPDATE] Checking for app updates...\n');
  });

  autoUpdater.on('update-available', (info) => {
    logToTerminal(`[UPDATE] New version available: v${info.version}\n`);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available!`,
      detail: `You are running v${app.getVersion()}.\n\nDownload and install the update now?`,
      buttons: ['Download & Install', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        logToTerminal('[UPDATE] Downloading update...\n');
        autoUpdater.downloadUpdate();
      } else {
        logToTerminal('[UPDATE] Update postponed.\n');
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (!_silentUpdateCheck) logToTerminal('[UPDATE] App is up to date.\n');
    _silentUpdateCheck = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    logToTerminal(`[UPDATE] Downloading update: ${Math.floor(progress.percent)}%\r`);
  });

  autoUpdater.on('update-downloaded', () => {
    logToTerminal('\n[UPDATE] Update ready — restart to install.\n');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded!',
      detail: 'The app will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    if (!_silentUpdateCheck) logToTerminal(`[UPDATE] App update error: ${err.message}\n`);
    _silentUpdateCheck = false;
  });
}

function checkForAppUpdates(silent = false) {
  if (!app.isPackaged) {
    if (!silent) logToTerminal('[UPDATE] Dev mode — app update check skipped.\n');
    return;
  }

  _silentUpdateCheck = silent;

  autoUpdater.checkForUpdates().catch((err) => {
    if (!silent) logToTerminal(`[UPDATE] Failed to check for app updates: ${err.message}\n`);
    _silentUpdateCheck = false;
  });
}

// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  getPaths();
  setupAutoUpdater();
  createWindow();

  // Wait for window to be ready before checking dependencies
  await mainWindow.webContents.once('did-finish-load', async () => {
    const depsOk = await ensureDependencies();

    if (depsOk) {
      // Auto-update yt-dlp on startup
      updateYtDlp();
      // Silent app update check on startup
      checkForAppUpdates(true);
    }
  });

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


// Check if a file with the video ID already exists in the download folder
function checkIfFileExists(url, settings) {
  return new Promise((resolve) => {
    const args = ['--skip-download', '--no-playlist', '--print', '%(id)s'];
    if (settings.proxy && settings.proxy.trim()) {
      args.push('--proxy', settings.proxy.trim());
    }
    args.push(url);

    logToTerminal('[SYSTEM] Checking for existing file...\n');

    const proc = spawn(ytdlpPath, args, { windowsHide: true });
    let output = '';

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', () => {});

    proc.on('close', () => {
      const id = output.trim().split('\n')[0].trim();
      if (!id) return resolve({ exists: false });

      try {
        if (!fs.existsSync(settings.downloadPath)) return resolve({ exists: false });
        const files = fs.readdirSync(settings.downloadPath);
        const ext = settings.format === 'mp4' ? '.mp4' : '.mp3';
        const match = files.find(f => f.includes(`[${id}]`) && f.endsWith(ext));
        resolve(match ? { exists: true, filename: match } : { exists: false });
      } catch {
        resolve({ exists: false });
      }
    });

    proc.on('error', () => resolve({ exists: false }));
  });
}

// IPC Handlers

// Get current settings
ipcMain.handle('get-settings', () => {
  return store.store;
});

// Save settings
ipcMain.handle('save-settings', (event, settings) => {
  store.set(settings);
  return { success: true };
});

// Update Format
ipcMain.handle('update-format', (event, newFormat) => {
  store.set('format', newFormat);
  return { success: true };
});

// Start download
ipcMain.handle('start-download', async (event, url) => {
  const settings = store.store;

  // Pre-check: skip if file already exists
  if (settings.skipExisting) {
    const check = await checkIfFileExists(url, settings);
    if (check.exists) {
      logToTerminal(`[SKIP] Already exists: ${check.filename}\n\n`);
      mainWindow.webContents.send('download-complete', { success: true });
      return { success: true };
    }
    logToTerminal('[SYSTEM] File not found locally, starting download...\n\n');
  }

  // Build arguments
  const args = [];

  // FFmpeg location
  args.push('--ffmpeg-location', binDir);

  // Output path
  args.push('-o', path.join(settings.downloadPath, '%(title)s [%(id)s].%(ext)s'));

  // Format
  if (settings.format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', `${settings.audioQuality || '192'}K`);
    if (settings.embedThumbnail) args.push('--embed-thumbnail');
  } else if (settings.format === 'mp4') {
    const q = settings.videoQuality || 'best';
    const videoFilter = q === 'best' ? 'bestvideo' : `bestvideo[height<=${q}]`;
    const containerFormat = settings.subtitleMode === 'embed-mkv' ? 'mkv' : 'mp4';
    // Download best streams, then re-encode audio to AAC for universal compatibility
    args.push('-f', `${videoFilter}+bestaudio/best`, '--merge-output-format', containerFormat);
    // Re-encode audio to AAC during merge only — scoped to Merger to avoid breaking thumbnail embedding
    args.push('--ppa', 'Merger+ffmpeg:-c:v copy -c:a aac');
    if (settings.embedThumbnail) args.push('--embed-thumbnail');
  }

  // Subtitles
  if (settings.subtitleMode === 'separate') {
    args.push('--write-subs', '--write-auto-subs', '--sub-langs', settings.subtitleLang || 'de');
  } else if (settings.subtitleMode === 'embed' || settings.subtitleMode === 'embed-mkv') {
    args.push('--write-subs', '--write-auto-subs', '--embed-subs', '--sub-langs', settings.subtitleLang || 'de');
  }

  // Speed limit
  if (settings.speedLimit && settings.speedLimit.trim() !== '') {
    args.push('--limit-rate', settings.speedLimit.trim());
  }

  // Skip existing files (safety net for playlists; single videos are pre-checked above)
  if (settings.skipExisting) {
    args.push('--no-overwrites');
  }

  // Delay between downloads (useful for playlists to avoid rate limiting)
  const delay = parseInt(settings.downloadDelay || '0', 10);
  if (delay > 0) {
    args.push('--sleep-interval', String(delay));
  }

  // Proxy Server
  if (settings.proxy && settings.proxy.trim() !== '') {
    args.push('--proxy', settings.proxy.trim());
  }

  // Custom arguments
  if (settings.customArgs && settings.customArgs.trim() !== '') {
    const customArgsArray = settings.customArgs.trim().split(' ');
    args.push(...customArgsArray);
  }

  // Node.js JS runtime for improved YouTube format extraction
  if (settings.jsRuntime) {
    args.push('--js-runtimes', 'node');
  }

  // Verbose output
  if (settings.verbose) {
    args.push('--verbose');
  }

  // Continue through unavailable playlist items instead of aborting
  args.push('--ignore-errors');

  // URL
  args.push(url);

  logToTerminal(`\n[DOWNLOAD] Starting download: ${url}\n`);
  if (settings.verbose) {
    logToTerminal(`[COMMAND] yt-dlp ${args.join(' ')}\n\n`);
  }

  const downloadProcess = spawn(ytdlpPath, args, {
    windowsHide: true
  });

  // Buffer for complete output (used for error reporting)
  let stdoutBuffer = '';
  let stderrBuffer = '';

  downloadProcess.stdout.on('data', (data) => {
    const output = data.toString();
    stdoutBuffer += output;
    if (settings.verbose) {
      logToTerminal(output);
    } else {
      // Filter out WARNING: lines — only show them in verbose mode
      const filtered = output.split('\n')
        .filter(line => !line.startsWith('WARNING:'))
        .join('\n');
      logToTerminal(filtered);
    }
  });

  downloadProcess.stderr.on('data', (data) => {
    const output = data.toString();
    stderrBuffer += output;
    if (settings.verbose) {
      logToTerminal(output);
    }
  });

  downloadProcess.on('error', (err) => {
    logToTerminal(`\n[ERROR] Process error: ${err.message}\n`);
    logToTerminal(`[ERROR] Error code: ${err.code}\n`);
    logToTerminal(`[ERROR] Error stack:\n${err.stack}\n\n`);
  });

  downloadProcess.on('close', (code, signal) => {
    // code 0 = full success, code 1 = partial success (some items unavailable/skipped)
    if (code === 0 || code === 1) {
      const msg = code === 1
        ? '\n[SUCCESS] Download completed (some items were skipped).\n\n'
        : '\n[SUCCESS] Download completed!\n\n';
      logToTerminal(msg);
      if (settings.notifyOnComplete && Notification.isSupported()) {
        new Notification({
          title: 'YouTube Downloader',
          body: code === 1 ? 'Download complete — some items were skipped.' : 'Download completed successfully!'
        }).show();
      }
      mainWindow.webContents.send('download-complete', { success: true });
    } else {
      logToTerminal(`\n${'='.repeat(60)}\n`);
      logToTerminal('[ERROR] Download failed!\n');
      logToTerminal(`${'='.repeat(60)}\n`);
      logToTerminal(`Exit Code: ${code}\n`);

      if (signal) {
        logToTerminal(`Signal: ${signal}\n`);
      }

      logToTerminal(`\n--- STDOUT ---\n`);
      logToTerminal(stdoutBuffer || '(empty)\n');

      logToTerminal(`\n--- STDERR ---\n`);
      logToTerminal(stderrBuffer || '(empty)\n');

      logToTerminal(`\n${'='.repeat(60)}\n\n`);

      mainWindow.webContents.send('download-complete', {
        success: false,
        code,
        stdout: stdoutBuffer,
        stderr: stderrBuffer
      });
    }
  });

  return { success: true };
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Manual update check — checks both yt-dlp and the app itself
ipcMain.handle('check-for-updates', () => {
  updateYtDlp();
  checkForAppUpdates(false);
  return { success: true };
});

// Open download folder
ipcMain.handle('open-folder', () => {
  const downloadPath = store.get('downloadPath');

  // Create folder if it doesn't exist
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  shell.openPath(downloadPath);
  return { success: true };
});

// Select folder dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, path: result.filePaths[0] };
  }

  return { success: false };
});