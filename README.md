# YT-DLP GUI

Modern Electron-based GUI for yt-dlp with integrated terminal output and automatic dependency management.

## Features

- 🎥 Download videos/audio from YouTube and other platforms
- 📦 Integrated terminal output (no external CMD window)
- ⚙️ Configurable settings (download path, format, custom arguments)
- 🔄 Auto-update yt-dlp on startup
- 📥 **Automatic download of yt-dlp and FFmpeg** on first run
- 💾 Persistent settings with electron-store
- 🎨 Modern dark theme UI
- ✅ Automatic error recovery and button state management

## Requirements

- Node.js 18+ and npm
- Windows OS
- Internet connection (for first-time setup)

## Installation

1. **Clone/Download the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

   On first run, the app will automatically:
   - Download yt-dlp.exe from GitHub (latest release)
   - Download and extract FFmpeg essentials
   - Show progress in terminal

4. **If automatic download fails:**
   - A dialog will appear with download links
   - Manual downloads:
     - yt-dlp: https://github.com/yt-dlp/yt-dlp/releases/latest
     - FFmpeg: https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z
   - Extract and place `yt-dlp.exe`, `ffmpeg.exe`, and `ffprobe.exe` in the `bin/` folder

## Build Executable

To create a standalone .exe:

```bash
npm run build:win
```

The installer will be in the `dist/` folder.

## Project Structure

```
yt-dlp-gui/
├── src/
│   ├── main.js              # Electron main process (IPC, downloads, yt-dlp spawning)
│   ├── preload.js           # Secure IPC bridge
│   └── renderer/
│       ├── index.html       # GUI layout
│       ├── styles.css       # Styling
│       └── renderer.js      # Frontend logic
├── bin/                     # Auto-populated on first run
│   ├── yt-dlp.exe          # (auto-downloaded)
│   ├── ffmpeg.exe          # (auto-downloaded)
│   └── ffprobe.exe         # (auto-downloaded)
├── package.json
└── README.md
```

## Usage

1. **Enter URL**: Paste YouTube or other supported video URL
2. **Click Download**: Starts download with current settings
3. **Settings**: 
   - Change download path (default: Desktop)
   - Select format (MP3/MP4)
   - Add custom yt-dlp arguments
4. **Terminal**: View real-time download progress and system messages
5. **Open Folder**: Quick access to download directory

## Settings

Settings are stored persistently in:
- Windows: `%APPDATA%/yt-dlp-gui/config.json`

Default settings:
- **Download Path**: User Desktop
- **Format**: MP3 (audio only)
- **Custom Args**: Empty

## Automatic Dependency Management

### First Run
- App checks for `yt-dlp.exe`, `ffmpeg.exe`, `ffprobe.exe`
- Missing files are automatically downloaded
- Progress shown in terminal
- Manual fallback if download fails

### Updates
- yt-dlp: Auto-updates via `yt-dlp -U` on each startup
- FFmpeg: Manual update required (stable tool, rarely needs updates)

## Custom Arguments Examples

```bash
# Download playlist items 1-5
--playlist-start 1 --playlist-end 5

# Limit download speed
--limit-rate 1M

# Download subtitles
--write-subs --sub-lang en

# Best quality
-f bestvideo+bestaudio
```

## Error Handling

- **Exit Code 1**: Download button automatically resets
- **Network errors**: Manual download dialog with links
- **Missing dependencies**: Auto-download or manual fallback

## Troubleshooting

**Auto-download fails**
- Check internet connection
- Try manual download from provided links
- Check firewall/proxy settings

**Download fails with exit code 1**
- Check URL validity
- Verify custom arguments syntax
- Check terminal for detailed error messages
- Button will automatically reset

**FFmpeg not found during download**
- App automatically passes `--ffmpeg-location` to yt-dlp
- Ensure ffmpeg.exe and ffprobe.exe are in bin/ folder

## Development

**Enable DevTools**
- DevTools automatically open in development mode
- Remove `mainWindow.webContents.openDevTools();` in `main.js` to disable

**Debug Downloads**
- Check console in DevTools (renderer process)
- Check terminal output (main process)
- Check `bin/` folder for downloaded files

## Technologies

- **Electron 28**: Desktop framework
- **electron-store**: Settings persistence
- **axios**: HTTP downloads with progress
- **node-7z**: FFmpeg archive extraction
- **yt-dlp**: Download engine
- **Node.js child_process**: Process spawning

## Dependencies

### Runtime
- `electron-store`: Configuration management
- `axios`: File downloads
- `node-7z`: Archive extraction

### Dev
- `electron`: Framework
- `electron-builder`: Packaging

## License

MIT

## Author

Thomas - IT Administrator @ Cargoboard

## Changelog

### v1.1.0
- ✨ Added automatic yt-dlp download from GitHub
- ✨ Added automatic FFmpeg download and extraction
- ✨ Added download progress indicators
- ✨ Added manual fallback with clickable links
- 🐛 Fixed download button not resetting on error (exit code 1)
- 🔧 Added FFmpeg location auto-detection
