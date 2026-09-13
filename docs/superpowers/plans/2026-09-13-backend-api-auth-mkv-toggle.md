# Backend API-Key Auth + MKV Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add API-key authentication to every `/api/*` endpoint and an explicit, independent MKV-container toggle to the download pipeline — the two backend-only, additive changes the frontend rewrite depends on.

**Architecture:** A single random API key is generated on first run and persisted in `settings.json`. One Express middleware, mounted on the `/api` path prefix, rejects any request whose `Authorization: Bearer <key>` header doesn't match. The existing (currently unauthenticated) vanilla-JS frontend in `public/` is patched minimally so the live app keeps working end-to-end while the React rewrite (later plans) is built — it attaches the stored key to every request and prompts once for it on a 401. The MKV toggle is a new boolean settings field consumed only inside the existing MP4 branch of `buildDownloadArgs`.

**Tech Stack:** Node.js, Express (existing `server/server.js`), Node's built-in `crypto` module. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-13-frontend-rework-design.md` (see §6 API & Auth, §8 Backend Changes)

## Global Constraints

- Backend changes are additive only — the queue engine, yt-dlp arg building outside the MKV branch, WS broadcast shape, and existing endpoint behavior stay unchanged (spec §8).
- Single shared API key protects the whole `/api/*` surface — no per-user accounts, no login page (spec §3, §6).
- When subtitles or multi-audio are enabled, MKV output stays forced regardless of the new toggle — the toggle only has an effect when both are off (spec §8, as clarified).
- No automated test framework exists in this repo (`package.json` has no `test` script, no test runner is installed) — verification in this plan is via `curl` against a running dev server, matching the spec's manual-verification approach (spec §11). Do not introduce a test framework as part of this plan.

---

### Task 1: Generate and persist the API key on startup

**Files:**
- Modify: `server/server.js:1-6` (add `crypto` require), `server/server.js:60` (key bootstrap), `server/server.js:773-775` (startup log)

**Interfaces:**
- Produces: `generateApiKey()` function (returns a 48-hex-char string); guarantees `settings.apiKey` is always a non-empty string after startup, for Tasks 2-3 to rely on.

- [ ] **Step 1: Add the `crypto` require**

In `server/server.js`, the top of the file currently reads:

```js
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
```

Add `crypto` to this block:

```js
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
```

- [ ] **Step 2: Add `generateApiKey()` right after the settings persistence functions**

Locate this existing block (around line 54-58):

```js
function saveSettings(settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}
```

Add immediately after it:

```js
function generateApiKey() {
  return crypto.randomBytes(24).toString('hex');
}
```

- [ ] **Step 3: Ensure a key exists right after settings load**

Locate:

```js
let settings = loadSettings();
```

Replace with:

```js
let settings = loadSettings();
if (!settings.apiKey) {
  settings.apiKey = generateApiKey();
  saveSettings(settings);
}
```

- [ ] **Step 4: Log the key on every startup**

Locate the startup block near the bottom of the file:

```js
if (!fs.existsSync(DOWNLOAD_PATH)) fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`yt-dlp-web running on http://0.0.0.0:${PORT}`);
});
```

Replace with:

```js
if (!fs.existsSync(DOWNLOAD_PATH)) fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`yt-dlp-web running on http://0.0.0.0:${PORT}`);
  console.log(`API key: ${settings.apiKey}`);
  console.log(`Use header: Authorization: Bearer ${settings.apiKey}`);
});
```

- [ ] **Step 5: Verify manually**

Run: `rm -f /opt/yt-dlp-web/data/settings.json && DOWNLOAD_PATH=/tmp/ytdlp-test-downloads node /opt/yt-dlp-web/server/server.js`
Expected: console prints `API key: <48 hex chars>` and `Use header: Authorization: Bearer <same key>`. Stop the server (Ctrl+C), start it again the same way (without deleting `settings.json` this time), confirm the **same** key prints both times (proves persistence, not regeneration on every boot).

- [ ] **Step 6: Commit**

```bash
cd /opt/yt-dlp-web
git add server/server.js
git commit -m "feat: generate and persist a per-instance API key on startup"
```

---

### Task 2: Require the API key on every `/api/*` route

**Files:**
- Modify: `server/server.js:79-82` (mount point)

**Interfaces:**
- Consumes: `settings.apiKey` (from Task 1, always a non-empty string by the time this middleware runs).
- Produces: every route under `/api` now returns `401 { success: false, error: 'unauthorized' }` unless the caller sends a matching `Authorization: Bearer <key>` header. Static file serving (`public/`) and the SPA fallback route are unaffected.

- [ ] **Step 1: Add the middleware and mount it**

Locate:

```js
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
```

Replace with:

```js
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function requireApiKey(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && token === settings.apiKey) return next();
  res.status(401).json({ success: false, error: 'unauthorized' });
}

app.use('/api', requireApiKey);
```

This must be placed after `express.static` (so the SPA/assets stay public) and before the first `app.get('/api/...')` route definition later in the file.

- [ ] **Step 2: Verify it fails (rejects) before any client sends a key**

Start the server: `DOWNLOAD_PATH=/tmp/ytdlp-test-downloads node /opt/yt-dlp-web/server/server.js` (in one terminal/background), then run:

`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/settings`

Expected: `401`

- [ ] **Step 3: Verify it passes with the correct key**

Copy the key printed at startup, then run:

`curl -s -H "Authorization: Bearer <paste-key>" http://localhost:3000/api/settings`

Expected: HTTP 200 with the settings JSON body (not the 401 error shape).

- [ ] **Step 4: Verify a wrong key is still rejected**

`curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer wrong-key" http://localhost:3000/api/settings`

Expected: `401`

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web
git add server/server.js
git commit -m "feat: require API key bearer auth on all /api routes"
```

---

### Task 3: Add a regenerate-key endpoint and harden the settings endpoint

**Files:**
- Modify: `server/server.js:391-395` (existing `POST /api/settings`), add a new route directly after it

**Interfaces:**
- Consumes: `generateApiKey()` (Task 1), `requireApiKey` (Task 2, already covers this route via the `/api` mount).
- Produces: `POST /api/settings/regenerate-key` → `{ success: true, apiKey: <new key> }`; `POST /api/settings` can no longer be used to set an arbitrary `apiKey` via the request body.

- [ ] **Step 1: Strip `apiKey` from the generic settings-update body**

Locate:

```js
app.post('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  saveSettings(settings);
  res.json({ success: true });
});
```

Replace with:

```js
app.post('/api/settings', (req, res) => {
  const { apiKey, ...rest } = req.body;
  settings = { ...settings, ...rest };
  saveSettings(settings);
  res.json({ success: true });
});
```

- [ ] **Step 2: Add the regenerate endpoint immediately after it**

```js
app.post('/api/settings/regenerate-key', (req, res) => {
  settings.apiKey = generateApiKey();
  saveSettings(settings);
  console.log(`New API key generated: ${settings.apiKey}`);
  res.json({ success: true, apiKey: settings.apiKey });
});
```

- [ ] **Step 3: Verify the settings endpoint ignores a client-supplied key**

With the server running and `<key>` = the current valid key:

```bash
curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"apiKey":"attacker-supplied-value","downloadDelay":"5"}' \
  http://localhost:3000/api/settings
curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/settings | grep -o '"apiKey":"[^"]*"'
```

Expected: second command still prints the original `<key>`, not `attacker-supplied-value`; `downloadDelay` did get updated to `"5"` (confirming the rest of the body still applies normally).

- [ ] **Step 4: Verify regeneration works and rotates the key**

```bash
curl -s -H "Authorization: Bearer <key>" -X POST http://localhost:3000/api/settings/regenerate-key
```

Expected: `{"success":true,"apiKey":"<new 48-hex-char key, different from <key>>"}`. Then confirm the *old* key is now rejected:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <key>" http://localhost:3000/api/settings
```

Expected: `401`.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web
git add server/server.js
git commit -m "feat: add API key regeneration endpoint, block key override via settings"
```

---

### Task 4: Add an independent MKV-container toggle

**Files:**
- Modify: `server/server.js:19-40` (`DEFAULT_SETTINGS`), `server/server.js:181-186` (MP4 branch's non-subtitle `else`)

**Interfaces:**
- Produces: `settings.mkvContainer` (boolean, default `false`). When `true` and `settings.format === 'mp4'` and subtitles/multi-audio are *not* active, `buildDownloadArgs` emits `--merge-output-format mkv` instead of `mp4`. No effect when subtitles/multi-audio are active (that branch already forces `mkv` and is untouched).

- [ ] **Step 1: Add the default**

Locate `DEFAULT_SETTINGS` (starts `const DEFAULT_SETTINGS = {`). Find the line:

```js
  videoQuality: process.env.DEFAULT_VIDEO_QUALITY || 'best',
```

Add directly after it:

```js
  videoQuality: process.env.DEFAULT_VIDEO_QUALITY || 'best',
  mkvContainer: false,
```

- [ ] **Step 2: Use it in the non-subtitle MP4 branch**

Locate, inside `buildDownloadArgs`, the `else` branch that runs when subtitles are *not* enabled:

```js
    } else {
      args.push('-f', `${videoFilter}+bestaudio/best`);
      args.push('--merge-output-format', 'mp4');
      args.push('--ppa', 'Merger+ffmpeg:-c:v copy -c:a aac');
    }
```

Replace with:

```js
    } else {
      args.push('-f', `${videoFilter}+bestaudio/best`);
      args.push('--merge-output-format', settings.mkvContainer ? 'mkv' : 'mp4');
      args.push('--ppa', 'Merger+ffmpeg:-c:v copy -c:a aac');
    }
```

Do not touch the `if (settings.subtitlesEnabled && langOptions)` branch above it — it already hard-codes `mkv` and must keep doing so regardless of this toggle (spec §8).

- [ ] **Step 3: Verify the default (off) behavior is unchanged**

With the server running and `<key>` = current key:

```bash
curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/settings | grep -o '"mkvContainer":[a-z]*'
```

Expected: `"mkvContainer":false`.

- [ ] **Step 4: Verify toggling it changes the merge format**

Add a temporary debug line right before `return args;` inside `buildDownloadArgs` — `console.log('ARGS:', args.join(' '));` — then:

```bash
curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"format":"mp4","mkvContainer":true}' http://localhost:3000/api/settings
curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' http://localhost:3000/api/download
```

Expected: the server's stdout log line contains `--merge-output-format mkv`. Then set `mkvContainer` back to `false` via the same settings POST and repeat the download call; expected: log line now contains `--merge-output-format mp4`. Remove the temporary `console.log` debug line afterward — it was for verification only, not part of the shipped code. Let the test download run to completion or cancel it with `curl -s -H "Authorization: Bearer <key>" -X POST http://localhost:3000/api/cancel` once you've confirmed the args line.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web
git add server/server.js
git commit -m "feat: add independent MKV-container toggle for MP4 downloads"
```

---

### Task 5: Bridge the existing (pre-rewrite) frontend so it keeps working

**Files:**
- Modify: `public/modules/api.js` (entire file, currently 8 lines)

**Interfaces:**
- Consumes: nothing new from earlier tasks beyond the fact that `/api/*` now requires a bearer key (Tasks 2-3).
- Produces: `api(method, path, body)` — same signature and return shape as before (a `Promise` resolving to the parsed JSON body) — so no other file in `public/modules/*` needs to change.

- [ ] **Step 1: Replace the file**

Current content:

```js
// ─── API ──────────────────────────────────────────────────────────────────────

export async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    return res.json();
}
```

Replace with:

```js
// ─── API ──────────────────────────────────────────────────────────────────────

const API_KEY_STORAGE = 'ytdlpweb.apiKey';

function getStoredKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
}

export async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const key = getStoredKey();
    if (key) opts.headers['Authorization'] = `Bearer ${key}`;
    if (body) opts.body = JSON.stringify(body);

    let res = await fetch(`/api${path}`, opts);
    if (res.status === 401) {
        const entered = prompt('API-Key erforderlich (siehe Server-Log beim Start):');
        if (entered) {
            localStorage.setItem(API_KEY_STORAGE, entered);
            opts.headers['Authorization'] = `Bearer ${entered}`;
            res = await fetch(`/api${path}`, opts);
        }
    }
    return res.json();
}
```

- [ ] **Step 2: Verify it fails without a stored key**

In a browser, open the app's origin (e.g. `http://localhost:3000`) with dev tools open, run `localStorage.removeItem('ytdlpweb.apiKey')`, reload the page.
Expected: a native `prompt()` dialog appears asking for the API key (triggered by the first `api()` call the app makes on load, e.g. loading settings).

- [ ] **Step 3: Verify it passes once the key is entered**

Paste the key from the server's startup log into the prompt and confirm.
Expected: the app finishes loading normally (settings populate, playlists load, no repeated prompts on subsequent actions like adding a queue item or opening Settings).

- [ ] **Step 4: Verify the key persists across reloads**

Reload the page again.
Expected: no prompt appears (the key is read from `localStorage` and requests succeed silently).

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web
git add public/modules/api.js
git commit -m "fix: attach stored API key to requests from the existing frontend"
```
