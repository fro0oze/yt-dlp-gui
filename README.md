# YouTube Downloader

A self-hosted web GUI for [yt-dlp](https://github.com/yt-dlp/yt-dlp) — download videos and audio from YouTube, TikTok, Instagram and 1000+ other platforms from any browser on your network, with no command line required.

Runs as a small Docker container (Node/Express backend + React frontend), so it's easy to put on a home server or NAS and use from desktop or phone.

---

## Features

- 🎵 **MP3 / MP4** — Audio extraction (128/192/320 kbps) or video download with quality selection
- 📺 **Subtitles** — Embed subtitles directly into MKV with per-download language selection
- 🔊 **Multi-Audio** — Select and embed multiple audio languages into MKV
- 🖼️ **Thumbnail embedding** — Embed cover art into MP3/MP4
- ⚡ **Speed limit & download delay** — Control bandwidth and playlist pacing
- 🔁 **Skip existing files** — No duplicate downloads
- 🌐 **Proxy support** — Route downloads through a proxy server
- 📃 **Playlists** — Paste a playlist URL (anything with a `list=` parameter) and it's automatically expanded into individual downloads, grouped together in the Queue with the first few entries shown and the rest collapsible
- 📱 **Save to Photos** — One tap on a finished video download saves it straight into the iOS/Android Photos app via the Web Share API
- 🍪 **Cookie upload** — Use your browser cookies for private content & age-restricted videos
- 🔗 **iOS Shortcuts integration** — Trigger downloads from the Shortcuts app (including from the Share Sheet), poll for completion, and pull the finished file — includes TikTok/Instagram bot-check bypass and browser-compatible video codec selection (see [iOS Shortcuts](#ios-shortcuts))
- 🛠️ **Custom yt-dlp arguments** — Full control for advanced users
- 📟 **Live terminal** — Streamed yt-dlp output over WebSocket
- 📊 **Activity logging** — Every `/api/*` request and active download/Shortcuts job is logged to `docker logs`
- 📐 **Responsive** — Usable on desktop and mobile, installable as a PWA

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

`docker-compose.yml` names the container `downloader`, builds the image locally, exposes it on port 80, and mounts two volumes:

| Host path                      | Container path | Purpose                          |
|---------------------------------|-----------------|-----------------------------------|
| `${DOWNLOAD_PATH}` (from `.env`) | `/downloads`    | Finished downloads                |
| `./data`                        | `/data`         | Persisted settings + cookies      |

Finished downloads are `chown`ed to uid `3000` / gid `100` (`users`) so they're writable/manageable from outside the container — adjust `chownDownload()` in `server/server.js` if your host uses different IDs.

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

1. Paste a URL into the input field on **Home** — a playlist URL is detected automatically and queues every entry at once
2. Select **MP3** or **MP4**
3. Tap **Zur Queue hinzufügen** — progress, errors (with one-tap retry), and playlist groups all show up in the **Queue** tab
4. Once an MP4 download finishes, tap the save icon on it to send it straight to your Photos app (requires HTTPS — see below)
5. Watch raw yt-dlp output live in the terminal sheet (the terminal icon in the bottom bar, or on any Queue entry)

All settings (quality, subtitles, proxy list, custom yt-dlp arguments, API key, etc.) are accessible via the **Settings** tab.

### Cookies

For private content or age-restricted videos, export `cookies.txt` with a browser extension like "Get cookies.txt LOCALLY" and upload it under Settings → YouTube Account. It's stored at `data/cookies.txt` (gitignored, never committed) and used for every yt-dlp call until removed.

### Save to Photos

The "In Fotos speichern" button (shown on finished MP4 downloads in the Queue) fetches the file and hands it to the OS via `navigator.share`, which on iOS Safari opens the native share sheet with a "Save Video" action straight into Photos. **This requires the app to be served over HTTPS** (or `localhost`) — `navigator.clipboard`/`navigator.share` don't exist in insecure contexts, so the paste button and this feature both quietly disable themselves over plain HTTP. Put the app behind a reverse proxy, Tailscale, or similar if you're not already on HTTPS.

To avoid failures on this step, video downloads exclude AV1/VP9 formats and only pick H.264/HEVC — see [iOS Shortcuts](#ios-shortcuts) below for why.

### iOS Shortcuts

Settings shows a ready-to-copy endpoint (`/api/shortcuts/download`) and your API key. POST `{"url": "..."}` with an `Authorization: Bearer <your-api-key>` header to start a download, then poll the returned `pollUrl` (same header required) until `status` is `done`, and fetch `downloadUrl` (same header required) to pull the file to your device. Finished files land in `<DOWNLOAD_PATH>/Downloader/` (working files live in the container's `/tmp`, never on the downloads volume).

A few things worth knowing when building a Shortcut around this:

- **Video codec**: MP4 downloads deliberately exclude AV1/VP9 (YouTube's default "best" formats) in favor of H.264/HEVC, because AV1 isn't importable into iOS Photos on most iPhones — without this, "Save to Photo Album" in Shortcuts fails silently.
- **Bot checks**: TikTok (and likely Instagram) require browser impersonation to get past their anti-scraping challenge; the Docker image installs `curl_cffi` for this, so no extra Shortcut-side workaround is needed.
- **Share Sheet time limit**: iOS gives Shortcuts run from the Share Sheet only a short execution window. A single Shortcut that posts the URL *and* polls in a loop *and* saves to Photos can exceed that budget, especially for platforms needing a video+audio merge (YouTube/Instagram take noticeably longer than TikTok's single-stream downloads) and get killed with a generic "a problem occurred" error. Consider splitting into:
  1. A minimal Share Sheet shortcut that just POSTs the URL and shows a notification (fast, always safe).
  2. A separate shortcut run directly from the Shortcuts app / a Home Screen icon (no Share Sheet time limit) that polls and saves to Photos.

---

## Development

### Requirements

- Node.js 20+
- `yt-dlp`, `ffmpeg`/`ffprobe`, `curl_cffi` (for TikTok/Instagram), and (optionally) `deno` available on `PATH`, or pointed to via `YTDLP_PATH` / `FFMPEG_DIR` / `DENO_PATH`

### Setup

```bash
git clone https://github.com/fro0oze/yt-dlp-gui.git yt-dlp-web
cd yt-dlp-web
npm install
npm start
```

Open `http://localhost:3000`. Settings persist to `data/settings.json`, downloads default to `/downloads` unless `DOWNLOAD_PATH` is set.

### Frontend

The React/Vite frontend lives in `web/`. To run it against the real backend during development:

```bash
# terminal 1 — the backend
npm start

# terminal 2 — the frontend's dev server (proxies /api and /ws to :3000)
cd web
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

### Project Structure

```
yt-dlp-web/
├── server/
│   └── server.js       # Express + WebSocket backend — downloads, queue, playlists, Shortcuts, settings, cookies
├── web/
│   └── src/             # React frontend — screens, components, API/WebSocket clients
├── data/                 # Persisted settings.json + cookies.txt (gitignored)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Technologies

| Package    | Purpose                          |
|------------|------------------------------------|
| Express    | HTTP server & static file serving  |
| ws         | WebSocket server for live terminal + queue updates |
| yt-dlp     | Video/audio extraction (installed in the Docker image) |
| ffmpeg     | Audio/video conversion & muxing    |
| curl_cffi  | Browser impersonation for extractors with bot checks (TikTok, Instagram) |
| deno       | Optional JS runtime for improved yt-dlp format/language detection |

---

## License

MIT — © Thomas
