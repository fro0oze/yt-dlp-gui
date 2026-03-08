# YouTube Downloader

A modern Electron-based GUI for [yt-dlp](https://github.com/yt-dlp/yt-dlp) — download videos and audio from YouTube and 1000+ other platforms, with no command line required.

## Download

**[→ Latest Release](https://github.com/fro0oze/yt-dlp-gui/releases/latest)**

Just download and run the `.exe` installer. No setup needed — yt-dlp and FFmpeg are downloaded automatically on first launch.

---

## Features

- 🎵 **MP3 / MP4** — Audio extraction (128/192/320 kbps) or video download with quality selection
- 📺 **Subtitles** — Download separately or embed into MP4/MKV
- 🖼️ **Thumbnail embedding** — Embed cover art into MP3/MP4
- ⚡ **Speed limit & download delay** — Control bandwidth and playlist pacing
- 🔁 **Skip existing files** — No duplicate downloads
- 🌐 **Proxy support** — Route downloads through a proxy server
- 🛠️ **Custom yt-dlp arguments** — Full control for advanced users
- 🔔 **Desktop notifications** — Get notified when downloads complete
- 🌍 **German / English UI**
- 🔄 **Auto-updates** — Both the app and yt-dlp update automatically
- 📦 **Self-contained** — yt-dlp and FFmpeg are auto-downloaded on first run

---

## Usage

1. Paste a URL into the input field
2. Select **MP3** or **MP4**
3. Click **Download**
4. Monitor progress in the terminal output

All settings (download path, quality, subtitles, proxy, etc.) are accessible via the **Settings** button.

---

## Settings Overview

| Setting | Description |
|---|---|
| Download Path | Where files are saved (default: Desktop) |
| Audio Quality | 128 / 192 / 320 kbps |
| Video Quality | Best / 1080p / 720p / 480p / 360p |
| Embed Thumbnail | Embeds cover art into the file |
| Subtitles | Off / Separate file / Embedded (MP4 or MKV) |
| Subtitle Language | e.g. `de`, `en`, `fr` |
| Skip Existing | Skips files already downloaded |
| Download Delay | Seconds to wait between playlist items |
| Speed Limit | e.g. `1M`, `500K` |
| Proxy | e.g. `http://proxy:8080` |
| Custom Arguments | Any additional yt-dlp flags |
| Verbose Mode | Shows full yt-dlp debug output |
| Node.js JS Runtime | Enables Node.js for YouTube format extraction |

---

## Automatic Dependency Management

On first launch, the app automatically downloads:

- **yt-dlp.exe** — from the official [yt-dlp GitHub releases](https://github.com/yt-dlp/yt-dlp/releases/latest)
- **ffmpeg.exe + ffprobe.exe** — from [gyan.dev FFmpeg essentials](https://www.gyan.dev/ffmpeg/builds/)

Binaries are stored in `%APPDATA%\YouTube Downloader\bin\` and persist across app updates.

On every startup, yt-dlp is automatically updated to the latest version.

If automatic download fails, a dialog will appear with the download links and manual instructions.

---

## Auto-Update

The app uses `electron-updater` to check for new releases on startup. When an update is available:

1. A dialog appears asking to download and install
2. The update downloads in the background (progress shown in terminal)
3. On the next restart, the update is applied automatically

---

## Development

### Requirements

- Node.js 20+
- npm
- Windows

### Setup

```bash
git clone https://github.com/fro0oze/yt-dlp-gui.git
cd yt-dlp-gui
npm install
npm start
```

DevTools open automatically in development mode.

### Build

```bash
npm run build:win
```

Output: `dist/` folder.

### Release

Use the included `release.cmd` script to bump the version, commit, tag and push in one step:

```
release.cmd
```

This triggers GitHub Actions, which builds the `.exe` installer and publishes a new GitHub Release automatically.

### Project Structure

```
yt-dlp-gui/
├── .github/
│   └── workflows/
│       └── release.yml      # GitHub Actions: build & publish on tag push
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge
│   └── renderer/
│       ├── index.html       # UI layout
│       ├── styles.css       # Styling
│       └── renderer.js      # Frontend logic
├── build/
│   └── icon.ico             # App icon
├── release.cmd              # Release helper script (dev only)
└── package.json
```

### Technologies

| Package | Purpose |
|---|---|
| Electron 39 | Desktop framework |
| electron-builder | Packaging & installer |
| electron-updater | Auto-update via GitHub Releases |
| electron-store | Persistent settings |
| axios | File downloads with progress |
| 7zip-bin | FFmpeg archive extraction |

---

## License

MIT — © Thomas
