const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const { app, dialog, shell, clipboard } = require('electron');
const axios = require('axios');

const execFileAsync = promisify(execFile);

module.exports = function createDependencies({ log, getWindow, binDir, ytdlpPath, ffmpegPath, ffprobePath }) {

  async function downloadFile(url, destPath, filename) {
    return new Promise(async (resolve, reject) => {
      try {
        log(`[DOWNLOAD] Fetching ${filename}...\n`);

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
              log(`[DOWNLOAD] Progress: ${progress}%\n`);
              lastProgress = progress;
            }
          }
        });

        response.data.pipe(writer);
        writer.on('finish', () => {
          log(`[DOWNLOAD] ${filename} downloaded successfully!\n`);
          resolve();
        });
        writer.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  async function downloadYtDlp() {
    try {
      log('[SYSTEM] yt-dlp.exe not found. Downloading latest release...\n');

      const releaseResponse = await axios.get(
        'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',
        { timeout: 10000 }
      );

      const asset = releaseResponse.data.assets.find(a => a.name === 'yt-dlp.exe');
      if (!asset) throw new Error('yt-dlp.exe not found in latest release');

      await downloadFile(asset.browser_download_url, ytdlpPath, 'yt-dlp.exe');
      log('[SUCCESS] yt-dlp.exe installed!\n\n');
      return true;

    } catch (error) {
      log(`[ERROR] Failed to download yt-dlp: ${error.message}\n\n`);
      return false;
    }
  }

  async function downloadFFmpeg() {
    try {
      log('[SYSTEM] FFmpeg tools not found. Downloading...\n');

      const ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z';
      const tempPath = path.join(binDir, 'ffmpeg-temp.7z');

      await downloadFile(ffmpegUrl, tempPath, 'ffmpeg-essentials.7z');

      log('[SYSTEM] Extracting FFmpeg (this may take a moment)...\n');

      let sevenZipPath;
      if (app.isPackaged) {
        sevenZipPath = path.join(process.resourcesPath, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
      } else {
        sevenZipPath = path.join(__dirname, '..', '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
      }

      if (!fs.existsSync(sevenZipPath)) throw new Error(`7za.exe not found at: ${sevenZipPath}`);

      log(`[DEBUG] Using 7za.exe from: ${sevenZipPath}\n`);
      log(`[DEBUG] Extracting to: ${binDir}\n`);

      try {
        const { stdout, stderr } = await execFileAsync(sevenZipPath, ['x', tempPath, `-o${binDir}`, '-y']);
        if (stdout) log(stdout);
        if (stderr) log(stderr);
      } catch (execError) {
        log(`[ERROR] Extraction error: ${execError.message}\n`);
        throw execError;
      }

      log('[SYSTEM] Extraction complete. Locating FFmpeg binaries...\n');

      const extractedDir = fs.readdirSync(binDir).find(f => {
        const fullPath = path.join(binDir, f);
        return f.startsWith('ffmpeg-') && f.includes('essentials_build') && fs.statSync(fullPath).isDirectory();
      });

      if (!extractedDir) throw new Error('Could not find extracted ffmpeg folder');

      log(`[DEBUG] Found extracted folder: ${extractedDir}\n`);

      const ffmpegBinDir = path.join(binDir, extractedDir, 'bin');
      const srcFfmpeg = path.join(ffmpegBinDir, 'ffmpeg.exe');
      const srcFfprobe = path.join(ffmpegBinDir, 'ffprobe.exe');

      if (!fs.existsSync(srcFfmpeg) || !fs.existsSync(srcFfprobe)) {
        throw new Error(`FFmpeg binaries not found in: ${ffmpegBinDir}`);
      }

      fs.copyFileSync(srcFfmpeg, ffmpegPath);
      fs.copyFileSync(srcFfprobe, ffprobePath);
      log('[SUCCESS] FFmpeg tools installed!\n');

      log('[SYSTEM] Cleaning up temporary files...\n');
      try {
        fs.unlinkSync(tempPath);
        fs.rmSync(path.join(binDir, extractedDir), { recursive: true, force: true });
        log('[SYSTEM] Cleanup complete!\n\n');
      } catch (cleanupErr) {
        log(`[WARNING] Cleanup failed: ${cleanupErr.message}\n\n`);
      }

      return true;

    } catch (error) {
      log(`[ERROR] Failed to download/extract FFmpeg: ${error.message}\n`);
      log(`[ERROR] Stack trace:\n${error.stack}\n\n`);
      return false;
    }
  }

  function showManualDownloadDialog() {
    const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest';
    const ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z';

    clipboard.writeText(`${ytdlpUrl}\n${ffmpegUrl}`);

    const response = dialog.showMessageBoxSync(getWindow(), {
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

    if (response === 0) shell.openExternal(ytdlpUrl);
    else if (response === 1) shell.openExternal(ffmpegUrl);

    app.quit();
  }

  async function ensureDependencies() {
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    let ytdlpOk = fs.existsSync(ytdlpPath);
    let ffmpegOk = fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath);

    if (!ytdlpOk) ytdlpOk = await downloadYtDlp();
    if (!ffmpegOk) ffmpegOk = await downloadFFmpeg();

    if (!ytdlpOk || !ffmpegOk) {
      showManualDownloadDialog();
      return false;
    }

    return true;
  }

  function updateYtDlp() {
    const updateProcess = spawn(ytdlpPath, ['-U'], { windowsHide: true });

    log('[SYSTEM] Checking for yt-dlp updates...\n');

    updateProcess.stdout.on('data', (data) => log(data.toString()));
    updateProcess.stderr.on('data', (data) => log(data.toString()));

    updateProcess.on('close', (code) => {
      if (code === 0) {
        log('[SYSTEM] yt-dlp is up to date!\n\n');
      } else {
        log(`[SYSTEM] Update check completed with code ${code}\n\n`);
      }
    });
  }

  return { ensureDependencies, updateYtDlp };
};
