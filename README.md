# YouTube Downloader

A self-hosted web GUI for [yt-dlp](https://github.com/yt-dlp/yt-dlp) — download videos and audio from YouTube and 1000+ other platforms from any browser on your network, with no command line required.

Runs as a small Docker container (Node/Express backend + vanilla JS frontend), so it's easy to put on a home server or NAS and use from desktop or phone.

---

## Features

- 🎵 **MP3 / MP4** — Audio extraction (128/192/320 kbps) or video download with quality selection
- 📺 **Subtitles** — Embed subtitles directly into MKV with per-download language selection
- 🔊 **Multi-Audio** — Select and embed multiple audio languages into MKV
- 🖼️ **Thumbnail embedding** — Embed cover art into MP3/MP4
- ⚡ **Speed limit & download delay** — Control bandwidth and playlist pacing
- 🔁 **Skip existing files** — No duplicate downloads
- 🌐 **Proxy support** — Route downloads through a proxy server
- 📃 **Playlists & queue** — Save YouTube playlists, browse/select entries, batch-queue downloads
- 🍪 **Cookie upload** — Use your browser cookies for private playlists & age-restricted content
- 📱 **iOS Shortcuts endpoint** — Trigger downloads from the Shortcuts app and pull the finished file
- 🛠️ **Custom yt-dlp arguments** — Full control for advanced users
- 🌍 **German / English UI**
- 📟 **Live terminal** — Streamed yt-dlp output over WebSocket
- 📐 **Responsive** — Usable on desktop and mobile

---

## Quick Start (Docker)

```bash
git clone https://github.com/fro0oze/yt-dlp-gui.git yt-dlp-web
cd yt-dlp-web
cp .env.example .env
# edit .env — at minimum set DOWNLOAD_PATH to where downloads should land on the host
docker compose up -d --build
```

Then open `http://<host>:80`.

`docker-compose.yml` builds the image locally, exposes it on port 80, and mounts two volumes:

| Host path                      | Container path | Purpose                          |
|---------------------------------|-----------------|-----------------------------------|
| `${DOWNLOAD_PATH}` (from `.env`) | `/downloads`    | Finished downloads                |
| `./data`                        | `/data`         | Persisted settings + cookies      |

---

## Configuration

Set these in `.env` (copied from `.env.example`) before building:

| Variable                | Default    | Description                                      |
|--------------------------|------------|---------------------------------------------------|
| `PORT`                  | `3000`     | Port the server listens on inside the container   |
| `DOWNLOAD_PATH`         | `./downloads` | Host folder mounted to `/downloads`            |
| `DEFAULT_FORMAT`        | `mp3`      | Initial format (`mp3` or `mp4`)                   |
| `DEFAULT_AUDIO_QUALITY` | `192`      | Initial audio bitrate (`128` / `192` / `320`)     |
| `DEFAULT_VIDEO_QUALITY` | `best`     | Initial video quality (`best` / `1080` / `720` / `480`) |
| `DEFAULT_LANG`          | `de`       | Initial UI language (`de` or `en`)                |

These are only used to seed `data/settings.json` on first run — after that, changes made in the Settings UI are what's persisted and take precedence.

A few more variables exist for running outside Docker (see [Development](#development) below): `SETTINGS_PATH`, `COOKIES_PATH`, `YTDLP_PATH`, `FFMPEG_DIR`, `DENO_PATH`.

---

## Usage

1. Paste a URL into the input field
2. Select **MP3** or **MP4**, optionally toggle **VPN** (proxy) or **SUB** (subtitles)
3. Click **Download** — or use the **Queue** tab to batch multiple URLs, or the **YouTube** tab to browse a saved playlist and queue selected entries
4. Monitor progress in the terminal panel

All settings (download path defaults, quality, subtitles, proxy list, custom yt-dlp arguments, etc.) are accessible via the **Settings** button.

### Cookies

For private playlists or age-restricted content, export `cookies.txt` with a browser extension like "Get cookies.txt LOCALLY" and upload it under Settings → YouTube Account. It's stored at `data/cookies.txt` (gitignored, never committed) and used for every yt-dlp call until removed.

### iOS Shortcuts

Settings shows a ready-to-copy endpoint (`/api/shortcuts/download`) and your API key. POST `{"url": "..."}` with an `Authorization: Bearer <your-api-key>` header to start a download, then poll the returned `pollUrl` (same header required) until `status` is `done`, and fetch `downloadUrl` (same header required) to pull the file to your device.

---

## Development

### Requirements

- Node.js 20+
- `yt-dlp`, `ffmpeg`/`ffprobe`, and (optionally) `deno` available on `PATH`, or pointed to via `YTDLP_PATH` / `FFMPEG_DIR` / `DENO_PATH`

### Setup

```bash
git clone https://github.com/fro0oze/yt-dlp-gui.git yt-dlp-web
cd yt-dlp-web
npm install
npm start
```

Open `http://localhost:3000`. Settings persist to `data/settings.json`, downloads default to `/downloads` unless `DOWNLOAD_PATH` is set.

### Project Structure

```
yt-dlp-web/
├── server/
│   └── server.js       # Express + WebSocket backend — downloads, queue, playlists, settings, cookies
├── public/
│   ├── index.html       # UI layout
│   ├── styles.css        # Styling (design tokens in :root, dark theme)
│   └── app.js            # Frontend logic — event handlers, WebSocket client, i18n
├── data/                 # Persisted settings.json + cookies.txt (gitignored)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Technologies

| Package  | Purpose                          |
|----------|------------------------------------|
| Express  | HTTP server & static file serving  |
| ws       | WebSocket server for live terminal + queue updates |
| yt-dlp   | Video/audio extraction (installed in the Docker image) |
| ffmpeg   | Audio/video conversion & muxing    |
| deno     | Optional JS runtime for improved yt-dlp format/language detection |

---

## License

MIT — © Thomas
