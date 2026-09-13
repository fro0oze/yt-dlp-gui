# Production Cutover: Serve `web/dist`, Retire `public/`

## 1. Summary

The React frontend rework (`web/`) is complete and merged: Home, Queue,
Settings, Playlists, Terminal, and PWA support all landed across six prior
plans. This plan makes it the frontend that actually ships — building it
into the Docker image, wiring the Express server to serve it, and deleting
the old vanilla-JS frontend it replaces.

## 2. Current State (baseline)

- `Dockerfile`: single stage, `node:20-slim` + system deps (python3,
  ffmpeg, curl, unzip) + yt-dlp + deno, `COPY package.json` + `npm install
  --omit=dev`, `COPY server/`, `COPY public/`. No build step for `web/`,
  no `.dockerignore`.
- `server/server.js:92` — `express.static(path.join(__dirname, '..',
  'public'))`.
- `server/server.js:803-804` — catch-all `app.get('*', ...)` serving
  `public/index.html`.
- `public/` — 11 files: `index.html`, `styles.css`, `app.js`, and 9
  modules under `public/modules/` (including `i18n.js`, a real
  German/English UI-text translation module).
- `web/` — the new React app. Builds via `npm run build` to `web/dist`
  (verified clean at HEAD `1321e67`, includes `manifest.webmanifest`,
  `sw.js`, and the Workbox service worker with `navigateFallbackDenylist:
  [/^\/api\//]`).
- `web/src/screens/Settings.jsx` has a `de`/`en` language `<select>` that
  persists a setting (`appLang`) but has no translation dictionary wired
  up anywhere in `web/` — it currently has zero effect on displayed UI
  text. This is a real feature gap versus `public/`'s working i18n.
- `README.md` documents the old frontend as primary and the new one as
  "in development," with a project-structure diagram showing `public/`.
- `docker-compose.yml` maps host port 80 → container 3000, mounts
  `${DOWNLOAD_PATH}` → `/downloads` and `./data` → `/data`. No changes
  needed here.

## 3. Decisions Made

- **Delete `public/` now**, in this same plan, rather than staging a
  fallback path or waiting for manual production verification first.
  Recoverable via git history if anything is missing.
- **Drop the i18n feature rather than port it.** The language dropdown in
  `Settings.jsx` is removed since it currently does nothing; the
  `appLang` backend setting field is left alone (unused but harmless —
  not worth touching per the project's "don't delete pre-existing dead
  code unless asked" convention, since it isn't literally dead, just
  currently only self-referential).
- **Multi-stage Docker build**, not an external pre-build step. Keeps
  `docker compose up -d --build` a single command with no risk of a
  maintainer shipping a stale `web/dist`.

## 4. Docker Build Changes

Add a build stage to `Dockerfile`, ahead of the existing runtime stage:

```dockerfile
FROM node:20-slim AS web-builder
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm install
COPY web/ ./
RUN npm run build
```

Runtime stage changes: replace `COPY public/ ./public/` with:

```dockerfile
COPY --from=web-builder /web/dist ./web/dist
```

Everything else in the runtime stage (system deps, yt-dlp, deno install,
root `npm install --omit=dev`, `COPY server/`, `mkdir -p /downloads
/data`, `EXPOSE 3000`, `CMD`) is unchanged.

New `.dockerignore` at repo root:

```
node_modules
web/node_modules
web/dist
.git
data
downloads
*.log
.env
docs
.claude
```

Pure build-context hygiene — the existing `Dockerfile` already does
selective `COPY`s (not `COPY .`), so this doesn't change what lands in
the image, only what's sent to the Docker daemon per build.

`docker-compose.yml` is unchanged — same build context, same port
mapping, same volumes.

## 5. Backend Changes

`server/server.js`:
- Line 92: `express.static(path.join(__dirname, '..', 'public'))` →
  `express.static(path.join(__dirname, '..', 'web', 'dist'))`.
- Line 803-804: catch-all `res.sendFile(path.join(__dirname, '..',
  'public', 'index.html'))` → `path.join(__dirname, '..', 'web', 'dist',
  'index.html')`.

No other backend restructuring. Route order (API routes registered
before the catch-all) is unchanged, so this doesn't affect API behavior.

## 6. Frontend Change: Drop the i18n Dropdown

`web/src/screens/Settings.jsx` — remove the `de`/`en` `<select>` element
and its label/wrapper. Leave the `appLang` field in the settings
API/schema untouched (backend-only, harmless).

## 7. Old Frontend Removal

`git rm -r public/` — deletes all 11 files. Recoverable via git history.

## 8. Documentation Updates

`README.md`:
- Line 5: "Node/Express backend + vanilla JS frontend" → "Node/Express
  backend + React frontend".
- Line 22: remove the "🌍 German / English UI" feature bullet.
- The "New frontend (in development)" section (lines 105-119) is
  replaced by the real dev-setup instructions: run the backend (`npm
  start`), then `cd web && npm install && npm run dev` — same commands,
  reframed as the only frontend rather than a preview.
- Project-structure diagram (lines 121-135): `public/` entry replaced
  with `web/` (pointing to its own `src/`, not enumerating every file,
  since it's a real app now, not three flat files).

## 9. Testing / Verification Plan

No automated test suite exists in this project (confirmed at every prior
plan in this rework). Verification is manual and concrete, and everything
below is checkable in this sandbox without a real browser or a real
yt-dlp binary:

- Docker is available in this sandbox (`docker build`/`docker run` both
  work) — verification uses the real image, not a Node-only proxy for
  it. `docker build .` must succeed end-to-end (both stages).
  - **Port safety**: production may run as a bare `node server/server.js`
    process (not necessarily visible to `docker ps` on this daemon) bound
    to host port 3000/80, per this session's established safety rule —
    before starting any test container, run `pgrep -af "node
    server/server.js"` and inspect `/proc/<pid>/cwd` for any hit, and
    regardless, publish the test container on a distinct high port (e.g.
    `-p 18080:3000`), never 3000 or 80, and never point its volumes at
    real `/downloads` or `./data`.
  - Run the built image with test-only bind mounts (empty scratch dirs,
    not the real `data/`/`downloads/`) and confirm:
    - `curl localhost:18080/` returns the new `web/dist/index.html` (not
      the old `public/index.html`, which no longer exists).
    - A couple of existing `/api/*` GET routes (e.g. `/api/settings`,
      `/api/cookies-status`) still return their expected JSON, proving
      the static-serving switch didn't shadow API routes.
    - `/manifest.webmanifest`, `/sw.js`, and `/icons/icon-192.png` are
      all served correctly from `web/dist`.
  - Stop and remove the test container/image artifacts after
    verification — nothing test-related is left running.
- Confirm `public/` no longer exists anywhere in the working tree after
  the `git rm`.
- Confirm the language dropdown is gone from the rendered Settings
  screen (a static check of `Settings.jsx`, since no browser is
  available here).
- **Explicitly out of scope for automated verification here:** an actual
  end-to-end download through the new UI against real yt-dlp, and real
  install-to-homescreen / iPhone testing — same sandbox limitation as
  every prior plan in this rework. The user does this manually after
  merge, as with every previous plan.

## 10. Out of Scope

- Reintroducing i18n/UI translation (a possible future plan, not this
  one).
- Any change to `docker-compose.yml`, download/queue logic, or anything
  under `server/` beyond the two static-serving lines above.
- CI/CD changes (no CI currently exists in this repo).
