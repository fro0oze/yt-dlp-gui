const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { app, shell, dialog, Notification } = require('electron');

module.exports = function registerIpc({ ipcMain, store, getWindow, ytdlpPath, binDir, log, updateYtDlp, checkForUpdates }) {

  function checkIfFileExists(url, settings) {
    return new Promise((resolve) => {
      const args = ['--skip-download', '--no-playlist', '--print', '%(id)s'];
      if (settings.proxyEnabled && settings.proxy && settings.proxy.trim()) args.push('--proxy', settings.proxy.trim());
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
          const exts = settings.format === 'mp4'
            ? (settings.subtitlesEnabled ? ['.mkv', '.mp4'] : ['.mp4'])
            : ['.mp3'];
          const match = files.find(f => f.includes(`[${id}]`) && exts.some(ext => f.endsWith(ext)));
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

  ipcMain.handle('toggle-proxy', (event, { proxyEnabled, proxy, savedProxies }) => {
    store.set('proxyEnabled', proxyEnabled);
    if (proxy !== undefined) store.set('proxy', proxy);
    if (savedProxies !== undefined) store.set('savedProxies', savedProxies);
    return { success: true };
  });

  // ─── Language Detection ─────────────────────────────────────────────────────

  ipcMain.handle('list-languages', (event, url) => {
    return new Promise((resolve) => {
      const settings = store.store;
      const args = ['--dump-single-json', '--no-download', '--no-playlist', '--no-warnings'];
      if (settings.proxyEnabled && settings.proxy && settings.proxy.trim()) args.push('--proxy', settings.proxy.trim());
      if (settings.jsRuntime) args.push('--js-runtimes', 'deno');
      args.push(url);

      log('[SYSTEM] Detecting available languages...\n');

      const proc = spawn(ytdlpPath, args, { windowsHide: true });
      const chunks = [];

      proc.stdout.on('data', (data) => { chunks.push(data); });
      proc.stderr.on('data', () => {});

      proc.on('close', (code) => {
        if (code !== 0) return resolve({ success: false });

        try {
          const info = JSON.parse(Buffer.concat(chunks).toString());

          // Audio languages from formats
          const langNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'code' });
          const audioLangs = new Map();
          (info.formats || []).forEach(f => {
            if (!f.acodec || f.acodec === 'none') return;
            const lang = f.language || null;
            if (!lang) return;
            if (!audioLangs.has(lang)) {
              let name = lang;
              try { name = langNames.of(lang) || lang; } catch {}
              audioLangs.set(lang, { code: lang, name });
            }
          });
          const audioResult = [{ code: 'original', name: 'Original' }, ...Array.from(audioLangs.values())];

          // Subtitle languages (manual + auto-generated)
          const subLangs = new Map();
          for (const [code, entries] of Object.entries(info.subtitles || {})) {
            if (code === 'live_chat') continue;
            const name = (entries[0] && entries[0].name) || code;
            subLangs.set(code, { code, name, auto: false });
          }
          for (const [code, entries] of Object.entries(info.automatic_captions || {})) {
            if (code === 'live_chat') continue;
            if (!subLangs.has(code)) {
              const name = (entries[0] && entries[0].name) || code;
              subLangs.set(code, { code, name, auto: true });
            }
          }

          resolve({
            success: true,
            title: info.title || '',
            audio: audioResult,
            subtitles: Array.from(subLangs.values()),
          });
        } catch {
          resolve({ success: false });
        }
      });

      proc.on('error', () => resolve({ success: false }));
    });
  });

  // ─── Download ──────────────────────────────────────────────────────────────

  let activeDownload = null;

  ipcMain.handle('cancel-download', () => {
    if (activeDownload) {
      const pid = activeDownload.pid;
      activeDownload = null;
      // Windows: SIGTERM doesn't work reliably, use taskkill to kill process tree
      spawn('taskkill', ['/pid', String(pid), '/f', '/t'], { windowsHide: true });
      log('\n[SYSTEM] Download cancelled.\n\n');
      getWindow().webContents.send('download-complete', { success: false, cancelled: true });
    }
    return { success: true };
  });

  ipcMain.handle('start-download', async (event, url, langOptions) => {
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

      if (settings.subtitlesEnabled && langOptions) {
        // MKV mit gewählten Audio-Sprachen
        const audioLangs = langOptions.audio || [];
        // "original" = bestaudio without language filter
        const specificLangs = audioLangs.filter(l => l !== 'original');
        const langFilters = specificLangs.map(l => `bestaudio[language=${l}]`);
        const hasOriginal = audioLangs.includes('original');

        if (langFilters.length > 0 && hasOriginal) {
          args.push('-f', `${videoFilter}+${langFilters.join('+')}+bestaudio/${videoFilter}+bestaudio/best`);
          args.push('--audio-multistreams');
        } else if (langFilters.length > 1) {
          args.push('-f', `${videoFilter}+${langFilters.join('+')}/${videoFilter}+bestaudio/best`);
          args.push('--audio-multistreams');
        } else if (langFilters.length === 1) {
          args.push('-f', `${videoFilter}+${langFilters[0]}/${videoFilter}+bestaudio/best`);
        } else {
          args.push('-f', `${videoFilter}+bestaudio/best`);
        }
        args.push('--merge-output-format', 'mkv');

        // Build ffmpeg merge args: preserve language metadata on audio streams
        const mergeArgs = ['-c:v copy', '-c:a aac'];
        // Build ordered list: specific langs first, then original
        const orderedLangs = [...specificLangs, ...(hasOriginal ? ['original'] : [])];
        orderedLangs.forEach((lang, i) => {
          if (lang !== 'original') {
            mergeArgs.push(`-metadata:s:a:${i} language=${lang}`);
          }
        });
        args.push('--ppa', `Merger+ffmpeg:${mergeArgs.join(' ')}`);
      } else {
        args.push('-f', `${videoFilter}+bestaudio/best`);
        args.push('--merge-output-format', 'mp4');
        args.push('--ppa', 'Merger+ffmpeg:-c:v copy -c:a aac');
      }
      if (settings.embedThumbnail) args.push('--embed-thumbnail');
    }

    if (settings.subtitlesEnabled && langOptions) {
      const subLangs = langOptions.subtitles || [];
      if (subLangs.length > 0) {
        args.push('--write-subs', '--write-auto-subs', '--embed-subs', '--convert-subs', 'srt', '--sub-langs', subLangs.join(','));
      }
    }

    if (settings.speedLimit && settings.speedLimit.trim() !== '') args.push('--limit-rate', settings.speedLimit.trim());
    if (settings.skipExisting) args.push('--no-overwrites');

    const delay = parseInt(settings.downloadDelay || '0', 10);
    if (delay > 0) args.push('--sleep-interval', String(delay));

    if (settings.proxyEnabled && settings.proxy && settings.proxy.trim() !== '') args.push('--proxy', settings.proxy.trim());
    if (settings.customArgs && settings.customArgs.trim() !== '') {
      const customArgs = settings.customArgs.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      args.push(...customArgs.map(a => a.replace(/^"|"$/g, '')));
    }
    if (settings.jsRuntime) args.push('--js-runtimes', 'deno');
    if (settings.verbose) args.push('--verbose');

    args.push('--ignore-errors');
    args.push(url);

    log(`\n[DOWNLOAD] Starting download: ${url}\n`);
    if (settings.verbose) log(`[COMMAND] yt-dlp ${args.join(' ')}\n\n`);

    const downloadProcess = spawn(ytdlpPath, args, { windowsHide: true });
    activeDownload = downloadProcess;

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
      const wasCancelled = activeDownload === null;
      activeDownload = null;
      if (wasCancelled) return;
      // Subtitle-Dateien aufräumen nach erfolgreichem Einbetten
      if (settings.subtitlesEnabled && (code === 0 || code === 1)) {
        try {
          const subFiles = fs.readdirSync(settings.downloadPath).filter(f => f.endsWith('.vtt') || f.endsWith('.srt'));
          subFiles.forEach(f => {
            try { fs.unlinkSync(path.join(settings.downloadPath, f)); } catch {}
          });
          if (subFiles.length > 0) log(`[SYSTEM] Cleaned up ${subFiles.length} subtitle file(s)\n`);
        } catch {}
      }

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
