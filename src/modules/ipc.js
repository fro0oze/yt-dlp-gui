const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { app, shell, dialog, Notification } = require('electron');

module.exports = function registerIpc({ ipcMain, store, getWindow, ytdlpPath, binDir, log, updateYtDlp, checkForUpdates }) {

  function checkIfFileExists(url, settings) {
    return new Promise((resolve) => {
      const args = ['--skip-download', '--no-playlist', '--print', '%(id)s'];
      if (settings.proxy && settings.proxy.trim()) args.push('--proxy', settings.proxy.trim());
      args.push(url);

      log('[SYSTEM] Checking for existing file...\n');

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

  // ─── Settings ──────────────────────────────────────────────────────────────

  ipcMain.handle('get-settings', () => store.store);

  ipcMain.handle('save-settings', (event, settings) => {
    store.set(settings);
    return { success: true };
  });

  ipcMain.handle('update-format', (event, newFormat) => {
    store.set('format', newFormat);
    return { success: true };
  });

  // ─── Download ──────────────────────────────────────────────────────────────

  ipcMain.handle('start-download', async (event, url) => {
    const settings = store.store;

    if (settings.skipExisting) {
      const check = await checkIfFileExists(url, settings);
      if (check.exists) {
        log(`[SKIP] Already exists: ${check.filename}\n\n`);
        getWindow().webContents.send('download-complete', { success: true });
        return { success: true };
      }
      log('[SYSTEM] File not found locally, starting download...\n\n');
    }

    const args = [];

    args.push('--ffmpeg-location', binDir);
    args.push('-o', path.join(settings.downloadPath, '%(title)s [%(id)s].%(ext)s'));

    if (settings.format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', `${settings.audioQuality || '192'}K`);
      if (settings.embedThumbnail) args.push('--embed-thumbnail');
    } else if (settings.format === 'mp4') {
      const q = settings.videoQuality || 'best';
      const videoFilter = q === 'best' ? 'bestvideo' : `bestvideo[height<=${q}]`;
      const containerFormat = settings.subtitleMode === 'embed-mkv' ? 'mkv' : 'mp4';
      args.push('-f', `${videoFilter}+bestaudio/best`, '--merge-output-format', containerFormat);
      args.push('--ppa', 'Merger+ffmpeg:-c:v copy -c:a aac');
      if (settings.embedThumbnail) args.push('--embed-thumbnail');
    }

    if (settings.subtitleMode === 'separate') {
      args.push('--write-subs', '--write-auto-subs', '--sub-langs', settings.subtitleLang || 'de');
    } else if (settings.subtitleMode === 'embed' || settings.subtitleMode === 'embed-mkv') {
      args.push('--write-subs', '--write-auto-subs', '--embed-subs', '--sub-langs', settings.subtitleLang || 'de');
    }

    if (settings.speedLimit && settings.speedLimit.trim() !== '') args.push('--limit-rate', settings.speedLimit.trim());
    if (settings.skipExisting) args.push('--no-overwrites');

    const delay = parseInt(settings.downloadDelay || '0', 10);
    if (delay > 0) args.push('--sleep-interval', String(delay));

    if (settings.proxy && settings.proxy.trim() !== '') args.push('--proxy', settings.proxy.trim());
    if (settings.customArgs && settings.customArgs.trim() !== '') args.push(...settings.customArgs.trim().split(' '));
    if (settings.jsRuntime) args.push('--js-runtimes', 'node');
    if (settings.verbose) args.push('--verbose');

    args.push('--ignore-errors');
    args.push(url);

    log(`\n[DOWNLOAD] Starting download: ${url}\n`);
    if (settings.verbose) log(`[COMMAND] yt-dlp ${args.join(' ')}\n\n`);

    const downloadProcess = spawn(ytdlpPath, args, { windowsHide: true });

    let stdoutBuffer = '';
    let stderrBuffer = '';

    downloadProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutBuffer += output;
      if (settings.verbose) {
        log(output);
      } else {
        const filtered = output.split('\n').filter(line => !line.startsWith('WARNING:')).join('\n');
        log(filtered);
      }
    });

    downloadProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrBuffer += output;
      if (settings.verbose) log(output);
    });

    downloadProcess.on('error', (err) => {
      log(`\n[ERROR] Process error: ${err.message}\n`);
      log(`[ERROR] Error code: ${err.code}\n`);
      log(`[ERROR] Error stack:\n${err.stack}\n\n`);
    });

    downloadProcess.on('close', (code, signal) => {
      if (code === 0 || code === 1) {
        const msg = code === 1
          ? '\n[SUCCESS] Download completed (some items were skipped).\n\n'
          : '\n[SUCCESS] Download completed!\n\n';
        log(msg);
        if (settings.notifyOnComplete && Notification.isSupported()) {
          new Notification({
            title: 'YouTube Downloader',
            body: code === 1 ? 'Download complete — some items were skipped.' : 'Download completed successfully!'
          }).show();
        }
        getWindow().webContents.send('download-complete', { success: true });
      } else {
        log(`\n${'='.repeat(60)}\n`);
        log('[ERROR] Download failed!\n');
        log(`${'='.repeat(60)}\n`);
        log(`Exit Code: ${code}\n`);
        if (signal) log(`Signal: ${signal}\n`);
        log(`\n--- STDOUT ---\n`);
        log(stdoutBuffer || '(empty)\n');
        log(`\n--- STDERR ---\n`);
        log(stderrBuffer || '(empty)\n');
        log(`\n${'='.repeat(60)}\n\n`);
        getWindow().webContents.send('download-complete', { success: false, code, stdout: stdoutBuffer, stderr: stderrBuffer });
      }
    });

    return { success: true };
  });

  // ─── App ───────────────────────────────────────────────────────────────────

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('check-for-updates', () => {
    updateYtDlp();
    checkForUpdates(false);
    return { success: true };
  });

  ipcMain.handle('open-folder', () => {
    const downloadPath = store.get('downloadPath');
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });
    shell.openPath(downloadPath);
    return { success: true };
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });

};
