# Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the React frontend (`web/`) the one actually served in production — wire `server/server.js` to serve `web/dist`, package the build into the Docker image, and delete the old `public/` frontend it replaces.

**Architecture:** No new components. Two one-line changes in `server/server.js` (static root + catch-all path), a new build stage in `Dockerfile` + a new `.dockerignore`, a small JSX deletion in `Settings.jsx` (drop a non-functional language dropdown), and deletion of the now-unused `public/` directory + matching README updates.

**Tech Stack:** Express (static serving), Docker multi-stage build, React/Vite (no new deps).

**Spec:** `docs/superpowers/specs/2026-09-13-production-cutover-design.md`

## Global Constraints

- No automated test suite exists in this project — verification in every
  task is manual and concrete (curl checks, build success, grep checks).
- **Port/process safety (hard rule, established earlier this session):**
  production may run as a bare `node server/server.js` process not
  visible to `docker ps`. Before starting ANY test server or container in
  any task: run `pgrep -af "node server/server.js"` and inspect
  `/proc/<pid>/cwd` for any hit pointing at a production deployment.
  Never bind a test server/container to port 3000 or port 80 — always
  use a distinct high port (this plan uses `18081` for the bare-node
  test in Task 1, `18080` for the Docker container test in Task 3).
  Never point `DOWNLOAD_PATH`/`SETTINGS_PATH`/`COOKIES_PATH` (or their
  Docker-volume equivalents) at the real `/downloads` or `./data` — use
  scratch paths under `/tmp`. Stop and remove every test server/
  container/image after its task's verification completes.
- `docker-compose.yml` is not touched by this plan (per spec §4/§10) —
  no task modifies it.
- `web/src/api/settings` schema / backend `appLang` field is not touched
  — only the `Settings.jsx` UI element that renders it is removed (spec
  §6, §3).
- Every deletion in this plan (`public/`) is git-tracked and therefore
  recoverable via git history — no task needs a backup step beyond the
  commit itself.

---

### Task 1: Backend cutover — serve `web/dist` instead of `public/`

**Files:**
- Modify: `server/server.js:92`, `server/server.js:803-804`

**Interfaces:**
- Produces: `server/server.js` now serves static assets from
  `web/dist` and falls back to `web/dist/index.html` for unmatched
  routes. No new exports or functions — this is a path-string change in
  two existing lines. Task 3 (Docker) packages this same server code
  unchanged; Task 2 (public/ deletion) relies on this task having
  already landed, since deleting `public/` while the server still points
  at it would 404 everything.

- [ ] **Step 1: Locate and change the static-serving line**

Current (`server/server.js:92`):

```js
app.use(express.static(path.join(__dirname, '..', 'public')));
```

Replace with:

```js
app.use(express.static(path.join(__dirname, '..', 'web', 'dist')));
```

- [ ] **Step 2: Locate and change the catch-all fallback**

Current (`server/server.js:803-804`):

```js
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
```

Replace with:

```js
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'dist', 'index.html'));
});
```

- [ ] **Step 3: Build the new frontend so there's something to serve**

Run: `cd web && corepack npm install && corepack npm run build`
Expected: succeeds, produces `web/dist/index.html`,
`web/dist/manifest.webmanifest`, `web/dist/sw.js`, and
`web/dist/icons/*`. (This build output is gitignored — it's a local
artifact for this task's verification, not something this task commits.
Task 3's Docker build stage regenerates it inside the image.)

- [ ] **Step 4: Safety check before starting a test server**

Run: `pgrep -af "node server/server.js"`
Expected: no output (no other instance of this server is running under
this exact process name). If it DOES print a match, stop — read the
Global Constraints port-safety rule above, inspect
`/proc/<pid>/cwd`/`/proc/<pid>/environ` for that PID, and do not proceed
until you're certain it's unrelated to this task before touching
anything.

- [ ] **Step 5: Start a test server on a safe port and verify**

Run (from the repo root, in the background):

```bash
PORT=18081 \
DOWNLOAD_PATH=/tmp/cutover-test-downloads \
SETTINGS_PATH=/tmp/cutover-test-settings.json \
COOKIES_PATH=/tmp/cutover-test-cookies.txt \
node server/server.js &
```

Expected: logs `yt-dlp-web running on http://0.0.0.0:18081` with no
crash.

Run: `curl -s localhost:18081/ | head -5`
Expected: HTML starting with `<!doctype html>` and containing
`YT Downloader` in a `<title>` tag (this is `web/dist/index.html`, not
the old `public/index.html` — confirm by checking the response does NOT
contain `yt-dlp-web` as a bare `<title>`, which was the old frontend's
title text).

Run: `curl -s localhost:18081/api/settings | head -c 200`
Expected: a JSON object (e.g. starts with `{"format"`) — confirms the
static-serving change didn't shadow the API routes registered before the
catch-all.

Run: `curl -s -o /dev/null -w "%{http_code}" localhost:18081/manifest.webmanifest`
Expected: `200`

Run: `curl -s -o /dev/null -w "%{http_code}" localhost:18081/icons/icon-192.png`
Expected: `200`

- [ ] **Step 6: Stop the test server**

Run: `kill %1` (or find the PID via `pgrep -af "node server/server.js"`
scoped to this exact test and `kill` it) — confirm with
`pgrep -af "node server/server.js"` that it's gone before moving on.

- [ ] **Step 7: Commit**

```bash
git add server/server.js
git commit -m "feat: serve web/dist instead of public/"
```

---

### Task 2: Docker multi-stage build

**Files:**
- Modify: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: nothing from Task 1 directly (this task's Dockerfile changes
  work regardless of what `server/server.js` currently points at — it
  simply builds `web/` and packages whatever `server/server.js` already
  is), but is meaningless to test correctly before Task 1 lands (the
  packaged server wouldn't serve the newly-built frontend). Do this task
  after Task 1.
- Produces: a Docker image that runs the same server code as Task 1, now
  including a built `web/dist` instead of `public/`. Task 3 (public/
  deletion) doesn't depend on this task, but should logically follow it
  in this plan's ordering.

- [ ] **Step 1: Add the `.dockerignore` file**

Create `.dockerignore` at the repo root:

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

- [ ] **Step 2: Add the build stage to `Dockerfile`**

Current `Dockerfile` (full file):

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

# Install deno
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY public/ ./public/

RUN mkdir -p /downloads /data

EXPOSE 3000

CMD ["node", "server/server.js"]
```

Replace with:

```dockerfile
FROM node:20-slim AS web-builder

WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm install
COPY web/ ./
RUN npm run build

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

# Install deno
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY --from=web-builder /web/dist ./web/dist

RUN mkdir -p /downloads /data

EXPOSE 3000

CMD ["node", "server/server.js"]
```

- [ ] **Step 3: Safety check before building/running a test container**

Run: `pgrep -af "node server/server.js"`
Expected: no output. If it prints a match, stop and investigate per the
Global Constraints port-safety rule before proceeding.

- [ ] **Step 4: Build the image**

Run: `docker build -t cutover-test .`
Expected: both stages complete with no errors; final output ends with
something like `Successfully tagged cutover-test:latest` (or the
buildx-equivalent success line).

- [ ] **Step 5: Run a test container on a safe port with scratch volumes**

Run:

```bash
mkdir -p /tmp/cutover-test-downloads /tmp/cutover-test-data
docker run -d --name cutover-test \
  -p 18080:3000 \
  -v /tmp/cutover-test-downloads:/downloads \
  -v /tmp/cutover-test-data:/data \
  cutover-test
```

Expected: prints a container ID, no immediate exit. Confirm with
`docker ps --filter name=cutover-test` that it's `Up`.

- [ ] **Step 6: Verify the containerized server**

Run: `curl -s localhost:18080/ | head -5`
Expected: same `<!doctype html>` / `YT Downloader` title as Task 1's
Step 5 check.

Run: `curl -s localhost:18080/api/settings | head -c 200`
Expected: a JSON object.

Run: `curl -s -o /dev/null -w "%{http_code}" localhost:18080/manifest.webmanifest`
Expected: `200`

- [ ] **Step 7: Tear down the test container and image**

```bash
docker rm -f cutover-test
docker rmi cutover-test
rm -rf /tmp/cutover-test-downloads /tmp/cutover-test-data
```

Confirm with `docker ps -a --filter name=cutover-test` that nothing
remains.

- [ ] **Step 8: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: multi-stage Docker build for web/dist"
```

---

### Task 3: Delete `public/` and update `README.md`

**Files:**
- Delete: `public/` (11 files: `index.html`, `styles.css`, `app.js`,
  `modules/api.js`, `modules/dom.js`, `modules/download.js`,
  `modules/i18n.js`, `modules/modal.js`, `modules/playlists.js`,
  `modules/queue.js`, `modules/settings.js`, `modules/state.js`,
  `modules/tabs.js`, `modules/terminal.js`, `modules/toast.js`,
  `modules/websocket.js`)
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1 must already be merged (server.js no longer
  references `public/`) — deleting it first would break the server.
- Produces: nothing other tasks consume. This is the last content task
  in the plan.

- [ ] **Step 1: Confirm Task 1 already landed**

Run: `grep -n "'public'" server/server.js`
Expected: no output (no remaining reference to `public` as a path
segment in `server.js`). If this prints anything, stop — Task 1 hasn't
actually landed correctly; do not delete `public/` yet.

- [ ] **Step 2: Delete the old frontend**

```bash
git rm -r public/
```

Expected: git reports 11 files deleted (or however many exist at deletion
time — if the count differs from the list above, that's fine, just
confirm the whole directory is gone, not a partial deletion).

Run: `test -d public && echo "STILL EXISTS" || echo "gone"`
Expected: `gone`

- [ ] **Step 3: Update `README.md` line 5**

Current:

```markdown
Runs as a small Docker container (Node/Express backend + vanilla JS frontend), so it's easy to put on a home server or NAS and use from desktop or phone.
```

Replace with:

```markdown
Runs as a small Docker container (Node/Express backend + React frontend), so it's easy to put on a home server or NAS and use from desktop or phone.
```

- [ ] **Step 4: Remove the "German / English UI" feature bullet**

Current (in the Features list):

```markdown
- 🌍 **German / English UI**
```

Delete this line entirely.

- [ ] **Step 5: Replace the "New frontend (in development)" section**

Current (`README.md`, the section right after "### Setup" / before
"### Project Structure"):

```markdown
### New frontend (in development)

A React/Vite rewrite lives in `web/` and is not yet wired into production. To run it against the real backend during development:

```bash
# terminal 1 — the existing backend
npm start

# terminal 2 — the new frontend's dev server (proxies /api and /ws to :3000)
cd web
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).
```

Replace with:

```markdown
### Frontend dev server

The frontend (`web/`) has its own dev server with hot reload, proxying `/api` and `/ws` to the backend:

```bash
# terminal 1 — the backend
npm start

# terminal 2 — the frontend dev server
cd web
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). This is
for frontend development only — in production (and via `npm start`
alone) the backend serves the built `web/dist` directly, no separate
frontend process needed.
```

- [ ] **Step 6: Update the project-structure diagram**

Current:

```markdown
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
```

Replace with:

```markdown
```
yt-dlp-web/
├── server/
│   └── server.js       # Express + WebSocket backend — downloads, queue, playlists, settings, cookies
├── web/
│   ├── src/              # React frontend (screens, components, API/WS clients)
│   └── public/icons/     # App icons (favicon, PWA manifest icons)
├── data/                 # Persisted settings.json + cookies.txt (gitignored)
├── Dockerfile
├── docker-compose.yml
└── package.json
```
```

- [ ] **Step 7: Verify the README no longer references the old frontend**

Run: `grep -n -i "vanilla JS\|German / English UI\|not yet wired into production" README.md`
Expected: no output.

Run: `grep -n "public/" README.md`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "chore: remove old public/ frontend, update README"
```

(The `public/` deletion from Step 2 is already staged by `git rm -r`
— this just adds the README changes to the same commit.)

---

### Task 4: Remove the non-functional i18n dropdown

**Files:**
- Modify: `web/src/screens/Settings.jsx:213-223`

**Interfaces:**
- Consumes: nothing from other tasks in this plan.
- Produces: nothing other tasks consume. Independent of Tasks 1-3 — can
  be done in any order relative to them, included last here only for
  narrative flow.

- [ ] **Step 1: Locate and remove the language dropdown**

Current (`web/src/screens/Settings.jsx:213-223`):

```jsx
        <label className="flex flex-col gap-1 py-2">
          <span className="text-text-1">App-Sprache</span>
          <select
            value={s.appLang}
            onChange={(e) => patch.mutate({ appLang: e.target.value })}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
```

Delete this entire `<label>...</label>` block. The surrounding
`<section>` (in the "Allgemein" section, alongside
"Bestehende Dateien überspringen", "Terminal auto-leeren", and
"Pause zwischen Downloads") is untouched — only this one `<label>` block
is removed. Do not touch `s.appLang` anywhere else (the backend setting
field itself is out of scope per Global Constraints).

- [ ] **Step 2: Verify the build still succeeds**

Run: `cd web && corepack npm run build`
Expected: succeeds with no errors (confirms no leftover reference to the
removed block, e.g. no orphaned variable or unclosed JSX tag).

- [ ] **Step 3: Verify the dropdown is actually gone**

Run: `grep -n "App-Sprache\|appLang" web/src/screens/Settings.jsx`
Expected: no output.

Run: `grep -n "App-Sprache" web/dist/assets/*.js`
Expected: no output (confirms it didn't survive into the built bundle
either).

- [ ] **Step 4: Commit**

```bash
git add web/src/screens/Settings.jsx
git commit -m "fix: remove non-functional language dropdown from Settings"
```

---
