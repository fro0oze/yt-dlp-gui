const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);
const DOWNLOAD_PATH = process.env.DOWNLOAD_PATH || '/downloads';
const SETTINGS_PATH = process.env.SETTINGS_PATH || '/data/settings.json';
const COOKIES_PATH = process.env.COOKIES_PATH || '/data/cookies.txt';

const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG_DIR = process.env.FFMPEG_DIR || '/usr/bin';
const DENO_PATH = process.env.DENO_PATH || 'deno';

const DEFAULT_SETTINGS = {
  format: process.env.DEFAULT_FORMAT || 'mp3',
  audioQuality: process.env.DEFAULT_AUDIO_QUALITY || '192',
  videoQuality: process.env.DEFAULT_VIDEO_QUALITY || 'best',
  embedThumbnail: false,
  speedLimit: '',
  subtitlesEnabled: false,
  appLang: process.env.DEFAULT_LANG || 'de',
  notifyOnComplete: true,
  skipExisting: true,
  downloadDelay: '0',
  proxy: '',
  proxyEnabled: false,
  savedProxies: [],
  savedPlaylists: [],
  customPlaylists: [],
  savedPrefixes: [],
  customArgs: '',
  verbose: false,
  jsRuntime: false,
  clearBetweenItems: true
};

// ─── Settings Persistence ────────────────────────────────────────────────────

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function generateApiKey() {
  return crypto.randomBytes(24).toString('hex');
}

let settings = loadSettings();
if (!settings.apiKey) {
  settings.apiKey = generateApiKey();
  saveSettings(settings);
}

// ─── WebSocket Broadcast ─────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function log(message) {
  broadcast('terminal', message);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function requireApiKey(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && token === settings.apiKey) return next();
  res.status(401).json({ success: false, error: 'unauthorized' });
}

app.use('/api', requireApiKey);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCookiesArgs() {
  return fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];
}

function buildOutputTemplate(customName) {
  if (!customName || !customName.trim()) {
    return path.join(DOWNLOAD_PATH, '%(title)s [%(id)s].%(ext)s');
  }
  // Sanitize: no path separators or traversal
  const name = customName.trim().replace(/\.\./g, '').replace(/[/\\]/g, '');
  if (name === '{name}') {
    return path.join(DOWNLOAD_PATH, '%(title)s [%(id)s].%(ext)s');
  }
  const template = name.replace(/\{name\}/g, '%(title)s');
  return path.join(DOWNLOAD_PATH, `${template}.%(ext)s`);
}

function checkIfFileExists(url) {
  return new Promise((resolve) => {
    const args = ['--skip-download', '--no-playlist', '--print', '%(id)s'];
    if (settings.proxyEnabled && settings.proxy && settings.proxy.trim()) {
      args.push('--proxy', settings.proxy.trim());
    }
    args.push(...getCookiesArgs());
    args.push(url);

    log('[SYSTEM] Checking for existing file...\n');

    const proc = spawn(YTDLP_PATH, args);
    let output = '';

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', () => {});

    proc.on('close', () => {
      const id = output.trim().split('\n')[0].trim();
      if (!id) return resolve({ exists: false });

      try {
        if (!fs.existsSync(DOWNLOAD_PATH)) return resolve({ exists: false });
        const files = fs.readdirSync(DOWNLOAD_PATH);
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

function buildDownloadArgs(url, langOptions, customName) {
  const args = [];

  args.push('--ffmpeg-location', FFMPEG_DIR);
  args.push('-o', buildOutputTemplate(customName));
  args.push(...getCookiesArgs());

  if (settings.format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', `${settings.audioQuality || '192'}K`);
    if (settings.embedThumbnail) args.push('--embed-thumbnail');
  } else if (settings.format === 'mp4') {
    const q = settings.videoQuality || 'best';
    const videoFilter = q === 'best' ? 'bestvideo' : `bestvideo[height<=${q}]`;

    if (settings.subtitlesEnabled && langOptions) {
      const audioLangs = langOptions.audio || [];
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

      const mergeArgs = ['-c:v copy', '-c:a aac'];
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
    const customArgsParsed = settings.customArgs.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    args.push(...customArgsParsed.map(a => a.replace(/^"|"$/g, '')));
  }
  if (settings.jsRuntime) args.push('--js-runtimes', 'deno');
  if (settings.verbose) args.push('--verbose');

  args.push('--ignore-errors');
  args.push(url);

  return args;
}

// ─── Download Queue ──────────────────────────────────────────────────────────

let activeDownload = null;
let downloadQueue = [];   // FIFO of not-yet-started items (shared object refs with queueItems)
let queueItems = [];      // full visible list for the current batch: pending/active/done/error
let queueItemIdCounter = 0;
let processingQueue = false;

function makeQueueItem(url, langOptions, customName) {
  const item = {
    id: ++queueItemIdCounter,
    url,
    langOptions: langOptions || null,
    customName: customName || null,
    status: 'pending',
    progress: null,
    error: null,
  };
  queueItems.push(item);
  downloadQueue.push(item);
  return item;
}

function broadcastQueueState() {
  broadcast('queue-update', {
    remaining: downloadQueue.length,
    items: queueItems.map(({ id, url, customName, status, progress, error }) => ({ id, url, customName, status, progress, error })),
  });
}

function extractErrorSummary(stderr) {
  const lines = (stderr || '').split('\n').map(l => l.trim()).filter(Boolean);
  const errLine = lines.find(l => l.startsWith('ERROR:'));
  if (errLine) return errLine.replace(/^ERROR:\s*/, '').slice(0, 200);
  return lines.length ? lines[lines.length - 1].slice(0, 200) : 'Unbekannter Fehler';
}

const PROGRESS_RE = /\[download\]\s+(\d{1,3}(?:\.\d+)?)%/;

function runDownload(item) {
  const { url, langOptions, customName } = item;
  return new Promise(async (resolve) => {
    if (settings.skipExisting) {
      const check = await checkIfFileExists(url);
      if (check.exists) {
        log(`[SKIP] Already exists: ${check.filename}\n\n`);
        item.status = 'done';
        item.progress = null;
        broadcastQueueState();
        broadcast('download-complete', { success: true });
        return resolve();
      }
      log('[SYSTEM] File not found locally, starting download...\n\n');
    }

    const args = buildDownloadArgs(url, langOptions, customName);
    log(`\n[DOWNLOAD] Starting download: ${url}\n`);
    if (settings.verbose) log(`[COMMAND] yt-dlp ${args.join(' ')}\n\n`);

    item.status = 'active';
    let lastProgressBroadcast = 0;
    broadcastQueueState();

    const proc = spawn(YTDLP_PATH, args);
    activeDownload = proc;

    let stdoutBuffer = '';
    let stderrBuffer = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutBuffer += output;
      if (settings.verbose) {
        log(output);
      } else {
        const filtered = output.split('\n').filter(line => !line.startsWith('WARNING:')).join('\n');
        log(filtered);
      }

      const m = output.match(PROGRESS_RE);
      if (m) {
        item.progress = m[1];
        const now = Date.now();
        if (now - lastProgressBroadcast > 250) {
          lastProgressBroadcast = now;
          broadcastQueueState();
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      stderrBuffer += output;
      if (settings.verbose) log(output);
    });

    proc.on('error', (err) => {
      log(`\n[ERROR] Process error: ${err.message}\n\n`);
    });

    proc.on('close', (code, signal) => {
      const wasCancelled = activeDownload === null;
      activeDownload = null;

      if (wasCancelled) return resolve();

      if (settings.subtitlesEnabled && (code === 0 || code === 1)) {
        try {
          const subFiles = fs.readdirSync(DOWNLOAD_PATH).filter(f => f.endsWith('.vtt') || f.endsWith('.srt'));
          subFiles.forEach(f => {
            try { fs.unlinkSync(path.join(DOWNLOAD_PATH, f)); } catch {}
          });
          if (subFiles.length > 0) log(`[SYSTEM] Cleaned up ${subFiles.length} subtitle file(s)\n`);
        } catch {}
      }

      // yt-dlp runs with --ignore-errors, so a single fully-invalid URL still exits with
      // code 1 (normally reserved for "some playlist items skipped") instead of a hard
      // failure code. Check stderr for an actual ERROR: line to tell the two apart.
      const hasFatalError = /(^|\n)ERROR:/.test(stderrBuffer);

      if (code === 0 || (code === 1 && !hasFatalError)) {
        const msg = code === 1
          ? '\n[SUCCESS] Download completed (some items were skipped).\n\n'
          : '\n[SUCCESS] Download completed!\n\n';
        log(msg);
        item.status = 'done';
        item.progress = null;
        broadcastQueueState();
        broadcast('download-complete', { success: true });
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
        item.status = 'error';
        item.progress = null;
        item.error = extractErrorSummary(stderrBuffer) || `Exit Code ${code}`;
        broadcastQueueState();
        broadcast('download-complete', { success: false, code, stdout: stdoutBuffer, stderr: stderrBuffer });
      }

      resolve();
    });
  });
}

async function processDownloadQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (downloadQueue.length > 0) {
    if (!processingQueue) break;
    const item = downloadQueue.shift();
    broadcastQueueState();
    await runDownload(item);
  }

  processingQueue = false;
  broadcastQueueState();
}

// ─── API: Settings ───────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  saveSettings(settings);
  res.json({ success: true });
});

app.post('/api/toggle-proxy', (req, res) => {
  const { proxyEnabled, proxy, savedProxies } = req.body;
  settings.proxyEnabled = proxyEnabled;
  if (proxy !== undefined) settings.proxy = proxy;
  if (savedProxies !== undefined) settings.savedProxies = savedProxies;
  saveSettings(settings);
  res.json({ success: true });
});

// ─── API: Language Detection ─────────────────────────────────────────────────

app.post('/api/languages', (req, res) => {
  const { url } = req.body;
  const args = ['--dump-single-json', '--no-download', '--no-playlist', '--no-warnings'];
  if (settings.proxyEnabled && settings.proxy && settings.proxy.trim()) {
    args.push('--proxy', settings.proxy.trim());
  }
  args.push(...getCookiesArgs());
  if (settings.jsRuntime) args.push('--js-runtimes', 'deno');
  args.push(url);

  log('[SYSTEM] Detecting available languages...\n');

  const proc = spawn(YTDLP_PATH, args);
  const chunks = [];

  proc.stdout.on('data', (data) => { chunks.push(data); });
  proc.stderr.on('data', () => {});

  proc.on('close', (code) => {
    if (code !== 0) return res.json({ success: false });

    try {
      const info = JSON.parse(Buffer.concat(chunks).toString());

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

      res.json({
        success: true,
        title: info.title || '',
        audio: audioResult,
        subtitles: Array.from(subLangs.values()),
      });
    } catch {
      res.json({ success: false });
    }
  });

  proc.on('error', () => res.json({ success: false }));
});

// ─── API: Playlist Info ──────────────────────────────────────────────────────

app.get('/api/playlist-info', (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ success: false, error: 'No URL provided' });

  const args = ['--flat-playlist', '-J', '--no-warnings'];
  if (settings.proxyEnabled && settings.proxy && settings.proxy.trim()) {
    args.push('--proxy', settings.proxy.trim());
  }
  args.push(...getCookiesArgs());
  if (settings.jsRuntime) args.push('--js-runtimes', 'deno');
  args.push(url);

  const proc = spawn(YTDLP_PATH, args);
  const chunks = [];

  proc.stdout.on('data', d => chunks.push(d));
  proc.stderr.on('data', () => {});

  proc.on('close', (code) => {
    if (code !== 0) return res.json({ success: false, error: 'fetch_failed' });
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString());
      if (!data.entries) return res.json({ success: false, error: 'not_playlist' });
      res.json({
        success: true,
        title: data.title || data.id || url,
        count: data.entries.length,
        entries: data.entries.map(e => ({
          id: e.id,
          title: e.title || e.id,
          duration: e.duration || null,
          url: e.url || e.webpage_url || `https://www.youtube.com/watch?v=${e.id}`,
        })),
      });
    } catch {
      res.json({ success: false, error: 'parse_error' });
    }
  });

  proc.on('error', () => res.json({ success: false, error: 'process_error' }));
});

// ─── API: Saved Playlists ────────────────────────────────────────────────────

app.get('/api/saved-playlists', (req, res) => {
  res.json(settings.savedPlaylists || []);
});

app.post('/api/saved-playlists', (req, res) => {
  const { name, url } = req.body;
  if (!url) return res.json({ success: false });
  const playlists = settings.savedPlaylists || [];
  playlists.push({ id: Date.now(), name: name || url, url });
  settings.savedPlaylists = playlists;
  saveSettings(settings);
  res.json({ success: true, playlists });
});

app.delete('/api/saved-playlists/:id', (req, res) => {
  const id = parseInt(req.params.id);
  settings.savedPlaylists = (settings.savedPlaylists || []).filter(p => p.id !== id);
  saveSettings(settings);
  res.json({ success: true });
});

// ─── API: Custom Playlists ───────────────────────────────────────────────────

app.get('/api/custom-playlists', (req, res) => {
  res.json(settings.customPlaylists || []);
});

app.post('/api/custom-playlists', (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: false });
  const playlists = settings.customPlaylists || [];
  playlists.push({ id: Date.now(), name, urls: [] });
  settings.customPlaylists = playlists;
  saveSettings(settings);
  res.json({ success: true, playlists });
});

app.put('/api/custom-playlists/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { urls } = req.body;
  const playlists = settings.customPlaylists || [];
  const pl = playlists.find(p => p.id === id);
  if (!pl) return res.json({ success: false });
  pl.urls = urls;
  settings.customPlaylists = playlists;
  saveSettings(settings);
  res.json({ success: true });
});

app.delete('/api/custom-playlists/:id', (req, res) => {
  const id = parseInt(req.params.id);
  settings.customPlaylists = (settings.customPlaylists || []).filter(p => p.id !== id);
  saveSettings(settings);
  res.json({ success: true });
});

// ─── API: Download & Queue ───────────────────────────────────────────────────

app.post('/api/cancel', (req, res) => {
  downloadQueue = [];
  queueItems = [];
  processingQueue = false;
  if (activeDownload) {
    const pid = activeDownload.pid;
    activeDownload = null;
    try { process.kill(pid, 'SIGTERM'); } catch {}
    log('\n[SYSTEM] Download cancelled.\n\n');
    broadcast('download-complete', { success: false, cancelled: true });
  }
  broadcastQueueState();
  res.json({ success: true });
});

app.post('/api/download', (req, res) => {
  const { url, langOptions, customName } = req.body;
  if (!processingQueue && downloadQueue.length === 0) queueItems = [];
  makeQueueItem(url, langOptions, customName);
  broadcastQueueState();
  res.json({ success: true });
  processDownloadQueue();
});

app.post('/api/queue', (req, res) => {
  const { urls, customName, items } = req.body;
  if (!processingQueue && downloadQueue.length === 0) queueItems = [];
  if (items && Array.isArray(items) && items.length > 0) {
    items.forEach(item => makeQueueItem(item.url, null, item.customName));
    broadcastQueueState();
    res.json({ success: true, queued: items.length });
    processDownloadQueue();
  } else if (Array.isArray(urls) && urls.length > 0) {
    urls.forEach(url => makeQueueItem(url, null, customName));
    broadcastQueueState();
    res.json({ success: true, queued: urls.length });
    processDownloadQueue();
  } else {
    res.json({ success: false });
  }
});

// ─── API: iOS Shortcuts ──────────────────────────────────────────────────────

const SHORTCUTS_DIR = path.join(DOWNLOAD_PATH, 'shortcuts');
const shortcutJobs  = new Map(); // jobId → { status, filename, error, createdAt }

// Cleanup jobs older than 1 hour
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of shortcutJobs.entries()) {
    if (job.createdAt < cutoff) {
      try { fs.rmSync(path.join(SHORTCUTS_DIR, jobId), { recursive: true, force: true }); } catch {}
      shortcutJobs.delete(jobId);
    }
  }
}, 10 * 60 * 1000);

function runShortcutDownload(jobId, url) {
  const jobDir = path.join(SHORTCUTS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const args = buildDownloadArgs(url, null, null);
  // Override output path to the job-specific dir
  const oIdx = args.indexOf('-o');
  if (oIdx !== -1) args[oIdx + 1] = path.join(jobDir, '%(title)s.%(ext)s');

  log(`\n[SHORTCUTS] Download started: ${url}\n`);

  const proc = spawn(YTDLP_PATH, args);

  proc.stdout.on('data', (data) => {
    const filtered = data.toString().split('\n').filter(l => !l.startsWith('WARNING:')).join('\n');
    log(filtered);
  });
  proc.stderr.on('data', () => {});

  proc.on('close', (code) => {
    const job = shortcutJobs.get(jobId);
    if (!job) return;
    if (code === 0 || code === 1) {
      try {
        const files = fs.readdirSync(jobDir).filter(f => !f.startsWith('.'));
        if (files.length > 0) {
          job.status   = 'done';
          job.filename = files[0];
          log(`[SHORTCUTS] Ready for download: ${files[0]}\n\n`);
        } else {
          job.status = 'error';
          job.error  = 'No file produced';
        }
      } catch {
        job.status = 'error';
        job.error  = 'Could not read output dir';
      }
    } else {
      job.status = 'error';
      job.error  = `yt-dlp exit code ${code}`;
      log(`[SHORTCUTS] Download failed (code ${code})\n\n`);
    }
  });

  proc.on('error', () => {
    const job = shortcutJobs.get(jobId);
    if (job) { job.status = 'error'; job.error = 'Process spawn failed'; }
  });
}

app.post('/api/shortcuts/download', (req, res) => {
  const url = (req.body && req.body.url) || '';
  if (!url) return res.status(400).json({ success: false, error: 'Missing url' });

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  shortcutJobs.set(jobId, { status: 'pending', filename: null, createdAt: Date.now() });

  res.json({ success: true, jobId, pollUrl: `/api/shortcuts/status/${jobId}` });
  runShortcutDownload(jobId, url);
});

app.get('/api/shortcuts/status/:jobId', (req, res) => {
  const job = shortcutJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const resp = { success: true, status: job.status };
  if (job.status === 'done' && job.filename) {
    resp.filename    = job.filename;
    resp.downloadUrl = `${req.protocol}://${req.get('host')}/api/shortcuts/file/${req.params.jobId}/${encodeURIComponent(job.filename)}`;
  }
  if (job.status === 'error') resp.error = job.error;
  res.json(resp);
});

app.get('/api/shortcuts/file/:jobId/:filename', (req, res) => {
  const job = shortcutJobs.get(req.params.jobId);
  if (!job || job.status !== 'done') return res.status(404).send('Not found');
  const filename = path.basename(decodeURIComponent(req.params.filename));
  const filePath = path.join(SHORTCUTS_DIR, req.params.jobId, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.sendFile(filePath);
});

// ─── API: Cookies ────────────────────────────────────────────────────────────

app.get('/api/cookies-status', (req, res) => {
  res.json({ active: fs.existsSync(COOKIES_PATH) });
});

app.post('/api/upload-cookies', express.text({ type: '*/*', limit: '10mb' }), (req, res) => {
  if (!req.body) return res.json({ success: false });
  const dir = path.dirname(COOKIES_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(COOKIES_PATH, req.body);
  res.json({ success: true });
});

app.delete('/api/cookies', (req, res) => {
  try {
    if (fs.existsSync(COOKIES_PATH)) fs.unlinkSync(COOKIES_PATH);
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ─── API: yt-dlp update ──────────────────────────────────────────────────────

app.post('/api/update-ytdlp', (req, res) => {
  const proc = spawn(YTDLP_PATH, ['-U']);
  log('[SYSTEM] Checking for yt-dlp updates...\n');

  proc.stdout.on('data', (data) => log(data.toString()));
  proc.stderr.on('data', (data) => log(data.toString()));

  proc.on('close', (code) => {
    if (code === 0) {
      log('[SYSTEM] yt-dlp is up to date!\n\n');
    } else {
      log(`[SYSTEM] Update check completed with code ${code}\n\n`);
    }
  });

  res.json({ success: true });
});

// ─── Fallback to index.html ──────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────────────────────

if (!fs.existsSync(DOWNLOAD_PATH)) fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`yt-dlp-web running on http://0.0.0.0:${PORT}`);
  console.log(`API key: ${settings.apiKey}`);
  console.log(`Use header: Authorization: Bearer ${settings.apiKey}`);
});
