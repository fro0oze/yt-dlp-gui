# Home, Queue & Terminal Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `web/` scaffold (Vite/React/Tailwind, dev proxy, auth bridge — already built and merged) into the app's real first two screens — Home (paste a URL, pick a format, add to queue) and Queue (live status of pending/active/done/error items) — plus the floating terminal button/sheet that streams the raw yt-dlp log, all wired to the real backend over its existing WebSocket and HTTP API.

**Architecture:** A simple two-view shell (`App.jsx`) switches between `Home` and `Queue` via local state — no router, per the design spec's client-side-view-switching decision. `@tanstack/react-query` manages request/response state (the one-shot settings fetch, the format-toggle mutation, the add-to-queue mutation); a small hand-rolled WebSocket pub/sub module (`ws/client.js`) — not React Query — carries the server's live push events (`queue-update`, `terminal`), since those already arrive unprompted over the existing `/ws` connection and don't fit a request/response model. `platform.js` is a pure, dependency-free function used only to choose what to *show* on Home (an icon/label) — the backend keeps accepting any URL unchanged. The floating terminal button uses `@radix-ui/react-dialog` for its slide-in panel, styled by hand with Tailwind rather than shadcn's CLI generator (consistent with the previous plan's approach).

**Tech Stack:** React 19 (plain JSX), `@tanstack/react-query` ^5.102.8 (new), `@radix-ui/react-dialog` ^1.1.23 (new). No router, no Motion, no cmdk, no shadcn CLI — all reserved for a later plan.

**Spec:** `docs/superpowers/specs/2026-09-13-frontend-rework-design.md` (§4 Home/Queue/Terminal screens, §5 palette, §7 platform detection)

## Global Constraints

- `npm` is not installed in this sandbox — only `node` and `corepack`. Every install/build/run command is `corepack npm ...`, never bare `npm`.
- No test framework exists or should be introduced. Verification is: `corepack npm run build` succeeding, `node --check` on files with browser-only globals, bundle-content `grep`, and `curl`/WebSocket checks against the real running backend — exactly as each task's steps specify. A throwaway Node script using the built-in `assert` module is fine for verifying a pure function's logic in one task (Task 3) as long as it is deleted afterward and never committed — that is a verification aid, not a test framework.
- The backend (`server/server.js`) is unchanged by this plan. `POST /api/download` takes `{ url, langOptions, customName }` — format is **not** a per-request field; it comes from the server-side `settings.format`, changed via `POST /api/settings`. Any task touching the download flow must respect this — do not invent a `format` field on the download request body.
- `GET /api/settings` returns the raw settings object directly (no wrapper). The `queue-update` WebSocket event's `data` shape is `{ remaining: number, items: [{ id, url, customName, status, progress, error }] }` (see `server/server.js`'s `broadcastQueueState`). The `terminal` event's `data` is a raw string chunk, not JSON. Do not invent different shapes.
- Every new file goes under `web/src/`. This plan does not touch `server/`, `public/`, `Dockerfile`, or `docker-compose.yml`.
- Real backend needed for verification: start it with `DOWNLOAD_PATH=/tmp/<scratch-dir> node server/server.js` from the repo root (as in prior plans), read its printed API key from stdout, stop it when done with each task's checks.
- **Safety rule, non-negotiable:** this sandbox shares its process namespace and port 3000 with a real, separately-managed Docker container running this same project's production instance (started via `docker-compose`, `restart: unless-stopped`, `cwd` `/app`, `DOWNLOAD_PATH=/downloads`). Before starting any backend instance for verification, run `pgrep -af "node server/server.js"` first. If a `node server/server.js` process is already running, do **not** kill it, do not assume it is your own leftover test instance, and do not start a second one on the same port — check `cat /proc/<pid>/cwd` and `cat /proc/<pid>/environ | tr '\0' '\n' | grep DOWNLOAD_PATH`: a `cwd` of `/app` and `DOWNLOAD_PATH=/downloads` mean it is the live production instance, not yours. In that case, either use `PORT=3999` (or any free port) for your own throwaway verification instance instead of 3000, or — if a task's check specifically depends on the default-port dev proxy (Task 8's `vite.config.js` proxy target is hardcoded to `localhost:3000`) — skip that specific sub-check, note in your report exactly why, and let the earlier tasks' own port-3000-independent checks stand as sufficient evidence. Only kill a `node server/server.js` process you are certain you started yourself in this same task (i.e., you have its exact PID from your own `&` background-launch command in this task).

---

### Task 1: Finish porting the dark-theme palette

**Files:**
- Modify: `web/src/styles.css`

**Interfaces:**
- Produces: the remaining Tailwind color tokens from the design spec's palette — `text-3/4/5`, `success` (already present), `danger-light`, `amber`, `sky`, `violet`, `orange`, `orange-light`, `rose`, `terminal` — plus `font-mono`. Task 7 (`TerminalSheet.jsx`) is the first consumer of `text-terminal` and `font-mono`; Task 6 (`Queue.jsx`) is a candidate consumer of the status accents but this plan keeps Queue's status colors to the tokens already present (`success`, `danger`, `indigo`) to stay minimal — the newly-ported accents are made available for a later plan's use, not force-consumed here just to prove them.

- [ ] **Step 1: Replace the full contents of `web/src/styles.css`**

Current contents:

```css
@import "tailwindcss";

@theme {
  --color-bg-0: rgb(13 13 15);
  --color-bg-1: rgb(24 24 27);
  --color-bg-2: rgb(39 39 42);
  --color-text-0: rgb(250 250 250);
  --color-text-1: rgb(232 232 237);
  --color-text-2: rgb(161 161 170);
  --color-success: rgb(34 197 94);
  --color-danger: rgb(239 68 68);
  --color-indigo: rgb(99 102 241);
}
```

Replace with (remaining values copied verbatim from `public/styles.css`'s `:root` block, same RGB-triplet-to-`rgb()` conversion as the existing tokens):

```css
@import "tailwindcss";

@theme {
  --color-bg-0: rgb(13 13 15);
  --color-bg-1: rgb(24 24 27);
  --color-bg-2: rgb(39 39 42);
  --color-text-0: rgb(250 250 250);
  --color-text-1: rgb(232 232 237);
  --color-text-2: rgb(161 161 170);
  --color-text-3: rgb(139 139 148);
  --color-text-4: rgb(113 113 122);
  --color-text-5: rgb(100 100 109);
  --color-success: rgb(34 197 94);
  --color-danger: rgb(239 68 68);
  --color-danger-light: rgb(248 113 113);
  --color-indigo: rgb(99 102 241);
  --color-amber: rgb(251 191 36);
  --color-sky: rgb(56 189 248);
  --color-violet: rgb(167 139 250);
  --color-orange: rgb(251 146 60);
  --color-orange-light: rgb(253 186 116);
  --color-rose: rgb(252 165 165);
  --color-terminal: rgb(134 239 172);

  --font-mono: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
}
```

- [ ] **Step 2: Verify**

Run: `cd web && corepack npm run build`
Expected: no errors (this is a pure CSS addition — no class in the current source uses the new tokens yet, so the build succeeding with no syntax error is the correct and complete check here; a later task, Task 7, is what actually proves Tailwind emits a working utility from one of these new tokens, via its own build+grep step).

- [ ] **Step 3: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/src/styles.css
git commit -m "feat: port remaining dark-theme palette tokens"
```

---

### Task 2: Harden the API client's error contract and add the TanStack Query provider

**Files:**
- Modify: `web/package.json`, `web/src/api/client.js`, `web/src/main.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `apiFetch(path, options)` now **rejects** (throws) when the final response has a non-2xx status, instead of always resolving — this is what makes `@tanstack/react-query`'s `isError`/`error` fields meaningful for every later task's queries and mutations. A `QueryClientProvider` wraps the whole app in `main.jsx`, so any component can call `useQuery`/`useMutation` from `@tanstack/react-query` without further setup. `App.jsx` is deliberately **not** touched by this task — it still uses its Task-2-era `useEffect`/`apiFetch` placeholder logic unchanged; Task 8 replaces `App.jsx` wholesale, so changing its internals here would be immediately thrown away.

- [ ] **Step 1: Add the dependency**

In `web/package.json`, the `dependencies` block currently reads:

```json
  "dependencies": {
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
```

Replace with:

```json
  "dependencies": {
    "@tanstack/react-query": "^5.102.8",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
```

- [ ] **Step 2: Harden `apiFetch`'s error contract**

Replace the full contents of `web/src/api/client.js`. Current contents:

```js
const API_KEY_STORAGE = 'ytdlpweb.apiKey';

function getStoredKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export async function apiFetch(path, options = {}) {
  const opts = { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } };
  const key = getStoredKey();
  if (key) opts.headers['Authorization'] = `Bearer ${key}`;

  let res = await fetch(`/api${path}`, opts);
  if (res.status === 401) {
    const current = getStoredKey();
    if (current && current !== key) {
      opts.headers['Authorization'] = `Bearer ${current}`;
      res = await fetch(`/api${path}`, opts);
    } else {
      const entered = prompt('API-Key erforderlich (siehe Server-Log beim Start):');
      if (entered) {
        localStorage.setItem(API_KEY_STORAGE, entered);
        opts.headers['Authorization'] = `Bearer ${entered}`;
        res = await fetch(`/api${path}`, opts);
      }
    }
  }
  return res.json();
}
```

Replace with (only the last two lines change — the unconditional `return res.json();` becomes a status check):

```js
const API_KEY_STORAGE = 'ytdlpweb.apiKey';

function getStoredKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export async function apiFetch(path, options = {}) {
  const opts = { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } };
  const key = getStoredKey();
  if (key) opts.headers['Authorization'] = `Bearer ${key}`;

  let res = await fetch(`/api${path}`, opts);
  if (res.status === 401) {
    const current = getStoredKey();
    if (current && current !== key) {
      opts.headers['Authorization'] = `Bearer ${current}`;
      res = await fetch(`/api${path}`, opts);
    } else {
      const entered = prompt('API-Key erforderlich (siehe Server-Log beim Start):');
      if (entered) {
        localStorage.setItem(API_KEY_STORAGE, entered);
        opts.headers['Authorization'] = `Bearer ${entered}`;
        res = await fetch(`/api${path}`, opts);
      }
    }
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed: ${res.status}`);
  }
  return data;
}
```

- [ ] **Step 3: Add the QueryClientProvider**

Replace the full contents of `web/src/main.jsx`. Current contents:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Replace with:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './styles.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Verify**

Run: `cd web && corepack npm install` (picks up the new dependency)
Expected: no errors.

Run: `corepack npm run build`
Expected: no errors (proves `main.jsx`'s new import resolves and `App.jsx`, untouched, still works unchanged under the new provider).

Verify the error-throwing contract by inspection and by exercising the real backend's status codes (browser-only `fetch`/`localStorage` mean this can't run under plain Node, same constraint as prior tasks on this file): start the real backend, note its key, then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/settings                                    # expect 401
curl -s -H "Authorization: Bearer <key>" -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/settings    # expect 200
```
Trace by hand in your report: a `401` with no valid key and a cancelled/empty prompt leaves `res` as the original 401 response — `data` is its JSON error body, `res.ok` is `false`, so the new code now `throw`s instead of returning that error body as if it were success data (the old behavior). A `200` response has `res.ok === true`, so `data` is returned normally, unchanged from before. Stop the backend afterward.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/package.json web/package-lock.json web/src/api/client.js web/src/main.jsx
git commit -m "feat: throw on non-2xx apiFetch responses, add TanStack Query provider"
```

---

### Task 3: Platform detection

**Files:**
- Create: `web/src/platform.js`

**Interfaces:**
- Produces: `detectPlatform(url)` — a pure function, no imports, no side effects. Returns `{ platform: 'youtube' | 'instagram' | 'tiktok' | 'generic', label: string, capabilities: { quality: boolean, subtitles: boolean, multiAudio: boolean, playlist: boolean } }`. Detection is by hostname only (a video vs. a Shorts URL on the same host get the same capabilities, per the design spec's table — path-level distinctions aren't needed). An empty string, or a string that doesn't parse as a URL, returns the generic result rather than throwing. Task 5 (`Home.jsx`) is the consumer.

- [ ] **Step 1: Create `web/src/platform.js`**

```js
const GENERIC = { platform: 'generic', label: 'Generisch', capabilities: { quality: true, subtitles: false, multiAudio: false, playlist: false } };

export function detectPlatform(url) {
  if (!url) return GENERIC;

  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return GENERIC;
  }

  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return { platform: 'youtube', label: 'YouTube', capabilities: { quality: true, subtitles: true, multiAudio: true, playlist: true } };
  }
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    return { platform: 'instagram', label: 'Instagram', capabilities: { quality: true, subtitles: false, multiAudio: false, playlist: false } };
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    return { platform: 'tiktok', label: 'TikTok', capabilities: { quality: true, subtitles: false, multiAudio: false, playlist: false } };
  }

  return GENERIC;
}
```

- [ ] **Step 2: Verify with a throwaway assertion script**

Create a temporary file `web/src/platform.verify.mjs` (this file is a verification aid only — it must be deleted before committing, not part of the shipped code):

```js
import assert from 'node:assert/strict';
import { detectPlatform } from './platform.js';

assert.equal(detectPlatform('https://www.youtube.com/watch?v=abc').platform, 'youtube');
assert.equal(detectPlatform('https://youtu.be/abc').platform, 'youtube');
assert.equal(detectPlatform('https://www.youtube.com/shorts/abc').platform, 'youtube');
assert.equal(detectPlatform('https://www.instagram.com/reel/abc/').platform, 'instagram');
assert.equal(detectPlatform('https://www.tiktok.com/@user/video/123').platform, 'tiktok');
assert.equal(detectPlatform('https://example.com/video').platform, 'generic');
assert.equal(detectPlatform('').platform, 'generic');
assert.equal(detectPlatform('not a url').platform, 'generic');
assert.equal(detectPlatform('https://www.youtube.com/watch?v=abc').capabilities.subtitles, true);
assert.equal(detectPlatform('https://www.tiktok.com/@user/video/123').capabilities.subtitles, false);

console.log('all platform.js assertions passed');
```

Run: `node web/src/platform.verify.mjs`
Expected: `all platform.js assertions passed`, exit code 0.

Then delete the verification file: `rm web/src/platform.verify.mjs` — do not commit it.

- [ ] **Step 3: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/src/platform.js
git status --porcelain web/src/  # confirm platform.verify.mjs is NOT listed (already deleted)
git commit -m "feat: add client-side platform detection"
```

---

### Task 4: WebSocket pub/sub client

**Files:**
- Create: `web/src/ws/client.js`

**Interfaces:**
- Produces: `subscribe(listener)` — registers `listener(msg)` to be called with every parsed `{ type, data }` message the backend pushes over `/ws`, and returns an unsubscribe function (`() => void`), matching the shape a React `useEffect` cleanup expects. Lazily opens exactly one shared `WebSocket` connection on the first `subscribe` call; reconnects automatically 2 seconds after a close. Tasks 6 and 7 (`Queue.jsx`, `TerminalSheet.jsx`) are the consumers.

- [ ] **Step 1: Create `web/src/ws/client.js`**

```js
const listeners = new Set();
let socket = null;

function connect() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${proto}//${window.location.host}/ws`);

  socket.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    listeners.forEach((listener) => listener(msg));
  });

  socket.addEventListener('close', () => {
    setTimeout(connect, 2000);
  });
}

export function subscribe(listener) {
  if (!socket) connect();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
```

- [ ] **Step 2: Verify**

This file uses browser-only globals (`window`, `WebSocket`) and can't be executed under plain Node — same constraint as `api/client.js`. Verify syntax only:

Run: `node --check web/src/ws/client.js`
Expected: no output, exit code 0.

Verify the runtime contract this code depends on is real: the backend's `/ws` endpoint actually broadcasts `{"type":"queue-update",...}` and `{"type":"terminal",...}` JSON messages, exactly the shape `JSON.parse(event.data)` expects. Node 20's global `WebSocket` is experimental and requires a flag — write this as a temporary file (e.g. `/tmp/ws-check.mjs`, delete it afterward — it is a one-off check, not part of the app):

```js
const ws = new WebSocket('ws://localhost:3000/ws');
ws.addEventListener('open', () => console.log('OPEN'));
ws.addEventListener('message', (e) => console.log('MSG', e.data));
setTimeout(() => process.exit(0), 3000);
```

With the real backend already started in the background, run: `node --experimental-websocket /tmp/ws-check.mjs`
Expected: at least `OPEN` prints (a `MSG` line only appears if a download is actively running during that 3-second window, which is not required for this check — `OPEN` alone confirms the connection and endpoint are real). Delete `/tmp/ws-check.mjs` afterward.

- [ ] **Step 3: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/src/ws/client.js
git commit -m "feat: add WebSocket pub/sub client for live server events"
```

---

### Task 5: Home screen

**Files:**
- Create: `web/src/screens/Home.jsx`

**Interfaces:**
- Consumes: `apiFetch` from `web/src/api/client.js` (Task 2's hardened version), `detectPlatform` from `web/src/platform.js` (Task 3), `useQuery`/`useMutation`/`useQueryClient` from `@tanstack/react-query` (available since Task 2 added the dependency and provider).
- Produces: `Home` — default export, a self-contained screen component with no props. Task 8 (`App.jsx`) is the consumer.

- [ ] **Step 1: Create `web/src/screens/Home.jsx`**

```jsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';
import { detectPlatform } from '../platform.js';

export default function Home() {
  const [url, setUrl] = useState('');
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch('/settings'),
  });
  const format = settingsQuery.data ? settingsQuery.data.format : 'mp3';

  const setFormat = useMutation({
    mutationFn: (nextFormat) => apiFetch('/settings', { method: 'POST', body: JSON.stringify({ format: nextFormat }) }),
    onSuccess: (_data, nextFormat) => {
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, format: nextFormat }));
    },
  });

  const addToQueue = useMutation({
    mutationFn: () => apiFetch('/download', { method: 'POST', body: JSON.stringify({ url }) }),
    onSuccess: () => setUrl(''),
  });

  const platform = detectPlatform(url);

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL eingeben..."
          className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
        />
        <span className="text-text-2 self-center">{platform.label}</span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => setFormat.mutate('mp3')}
          aria-pressed={format === 'mp3'}
          className={format === 'mp3' ? 'bg-indigo text-text-0 px-4 py-2 rounded' : 'bg-bg-1 text-text-2 px-4 py-2 rounded'}
        >
          MP3
        </button>
        <button
          type="button"
          onClick={() => setFormat.mutate('mp4')}
          aria-pressed={format === 'mp4'}
          className={format === 'mp4' ? 'bg-indigo text-text-0 px-4 py-2 rounded' : 'bg-bg-1 text-text-2 px-4 py-2 rounded'}
        >
          MP4
        </button>
      </div>
      <button
        type="button"
        onClick={() => addToQueue.mutate()}
        disabled={!url || addToQueue.isPending}
        className="mt-3 bg-indigo text-text-0 px-4 py-2 rounded disabled:opacity-50"
      >
        {addToQueue.isPending ? 'Wird hinzugefügt...' : 'Zur Queue hinzufügen'}
      </button>
      {addToQueue.isError && <p className="text-danger mt-2">{addToQueue.error.message}</p>}
    </div>
  );
}
```

Note: `POST /api/download` does not take a `format` field — format is the server-side `settings.format`, changed here via the `setFormat` mutation's `POST /api/settings` call, exactly mirroring the existing (`public/modules/settings.js`) frontend's `updateFormatButtons` pattern of persisting the format immediately on click, before any download is queued.

- [ ] **Step 2: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Zur Queue hinzufügen" web/dist/assets/*.js` and `grep -c "bg-indigo" web/dist/assets/*.css`
Expected: both find at least one match — confirms the component compiled in and its Tailwind classes were emitted.

- [ ] **Step 3: Verify the mutations against the real backend**

Start the real backend in the background, note its key.

Run: `curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"format":"mp4"}' http://localhost:3000/api/settings`
Expected: `{"success":true}` — this is exactly what `setFormat`'s `mutationFn` sends and expects to succeed.

Run: `curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' http://localhost:3000/api/download`
Expected: `{"success":true}` — matches `addToQueue`'s `mutationFn`. Cancel it afterward with `curl -s -H "Authorization: Bearer <key>" -X POST http://localhost:3000/api/cancel` and stop the backend.

- [ ] **Step 4: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/src/screens/Home.jsx
git commit -m "feat: add Home screen with format toggle and add-to-queue"
```

---

### Task 6: Queue screen

**Files:**
- Create: `web/src/screens/Queue.jsx`

**Interfaces:**
- Consumes: `subscribe` from `web/src/ws/client.js` (Task 4).
- Produces: `Queue` — default export, self-contained screen component, no props. Task 8 (`App.jsx`) is the consumer.

- [ ] **Step 1: Create `web/src/screens/Queue.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { subscribe } from '../ws/client.js';

const STATUS_LABEL = { pending: 'Wartet', active: 'Lädt', done: 'Fertig', error: 'Fehler' };
const STATUS_CLASS = { pending: 'text-text-2', active: 'text-indigo', done: 'text-success', error: 'text-danger' };

export default function Queue() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'queue-update') {
        setItems(msg.data.items);
      }
    });
  }, []);

  if (items.length === 0) {
    return <div className="p-4 text-text-2">Queue ist leer.</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className="bg-bg-1 rounded px-3 py-2 flex justify-between gap-2">
          <span className="text-text-0 truncate">{item.customName || item.url}</span>
          <span className={STATUS_CLASS[item.status] || 'text-text-2'}>
            {STATUS_LABEL[item.status] || item.status}
            {item.status === 'active' && item.progress ? ` ${item.progress}%` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Queue ist leer" web/dist/assets/*.js`
Expected: at least one match.

- [ ] **Step 3: Verify the WS payload shape this component depends on is real**

Start the real backend in the background, note its key. Queue a real download so a `queue-update` broadcast fires:

```bash
curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' http://localhost:3000/api/download
```

While that's running, connect and print one message. Node 20's global `WebSocket` is experimental and requires a flag — write this as a temporary file (e.g. `/tmp/ws-queue-check.mjs`, delete it afterward — not part of the app):

```js
const ws = new WebSocket('ws://localhost:3000/ws');
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'queue-update') {
    console.log(JSON.stringify(msg.data));
    process.exit(0);
  }
});
setTimeout(() => process.exit(1), 5000);
```

Run: `node --experimental-websocket /tmp/ws-queue-check.mjs`
Expected: prints an object with a `remaining` number and an `items` array whose entries have `id`, `url`, `status` — exactly the fields `Queue.jsx` reads. Then cancel the download (`POST /api/cancel`, with the auth header), stop the backend, and delete `/tmp/ws-queue-check.mjs`.

- [ ] **Step 4: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/src/screens/Queue.jsx
git commit -m "feat: add Queue screen with live WebSocket status"
```

---

### Task 7: Floating terminal button and sheet

**Files:**
- Modify: `web/package.json`
- Create: `web/src/components/TerminalSheet.jsx`

**Interfaces:**
- Consumes: `subscribe` from `web/src/ws/client.js` (Task 4); `text-terminal` and `font-mono` Tailwind tokens from `web/src/styles.css` (Task 1); `@radix-ui/react-dialog` (new dependency, added in this task).
- Produces: `TerminalSheet` — default export, self-contained, no props, renders its own always-visible floating trigger button plus a controlled overlay/panel. Task 8 (`App.jsx`) is the consumer; mounted once, unconditionally, alongside whichever screen is active.

- [ ] **Step 1: Add the dependency**

In `web/package.json`, the `dependencies` block (after Task 2's edit) reads:

```json
  "dependencies": {
    "@tanstack/react-query": "^5.102.8",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
```

Replace with:

```json
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.23",
    "@tanstack/react-query": "^5.102.8",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
```

- [ ] **Step 2: Create `web/src/components/TerminalSheet.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { subscribe } from '../ws/client.js';

export default function TerminalSheet() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState('');
  const [progress, setProgress] = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'terminal') {
        setLog((prev) => prev + msg.data);
      } else if (msg.type === 'queue-update') {
        const active = msg.data.items.find((item) => item.status === 'active');
        setProgress(active && active.progress ? Number(active.progress) : null);
      }
    });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Terminal öffnen"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo text-text-0 flex items-center justify-center shadow-lg"
        >
          {progress !== null ? `${Math.round(progress)}%` : '▶'}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 w-full sm:w-[480px] bg-bg-1 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <Dialog.Title className="text-text-0 font-semibold">Terminal</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-text-2" aria-label="Schließen">×</button>
            </Dialog.Close>
          </div>
          <pre ref={logRef} className="flex-1 overflow-y-auto text-terminal font-mono text-xs whitespace-pre-wrap">
            {log || '(keine Ausgabe)'}
          </pre>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 3: Verify by build + bundle inspection**

Run: `cd web && corepack npm install` (picks up `@radix-ui/react-dialog`)
Expected: no errors.

Run: `corepack npm run build`
Expected: no errors.

Run: `grep -o "Terminal öffnen" web/dist/assets/*.js`, `grep -c "text-terminal" web/dist/assets/*.css`, `grep -c "font-mono\|Cascadia" web/dist/assets/*.css`
Expected: all find at least one match — this is the proof (deferred from Task 1) that the ported `--color-terminal` and `--font-mono` tokens actually produce working Tailwind utilities once something in the source references them.

- [ ] **Step 4: Verify the terminal stream contract against the real backend**

Start the real backend in the background, note its key. Trigger some terminal output (any yt-dlp invocation logs to the `terminal` WS event):

```bash
curl -s -H "Authorization: Bearer <key>" -X POST http://localhost:3000/api/update-ytdlp
```

Connect and print terminal messages. Node 20's global `WebSocket` is experimental and requires a flag — write this as a temporary file (e.g. `/tmp/ws-terminal-check.mjs`, delete it afterward):

```js
const ws = new WebSocket('ws://localhost:3000/ws');
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'terminal') {
    console.log('TERMINAL CHUNK:', JSON.stringify(msg.data));
  }
});
setTimeout(() => process.exit(0), 4000);
```

Run: `node --experimental-websocket /tmp/ws-terminal-check.mjs`
Expected: at least one `TERMINAL CHUNK:` line printing a raw string (not a JSON object) — confirms `msg.data` is the plain string `TerminalSheet.jsx`'s `setLog((prev) => prev + msg.data)` expects, not a structured object. Stop the backend afterward and delete `/tmp/ws-terminal-check.mjs`.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/package.json web/package-lock.json web/src/components/TerminalSheet.jsx
git commit -m "feat: add floating terminal button and log sheet"
```

---

### Task 8: App shell — wire Home, Queue, and the terminal sheet together

**Files:**
- Modify: `web/src/App.jsx`

**Interfaces:**
- Consumes: `Home` (Task 5), `Queue` (Task 6), `TerminalSheet` (Task 7) — all default exports, no props.
- Produces: the final `App` for this plan — a two-view nav shell. This supersedes the Plan-2-era placeholder entirely (that placeholder's own plan explicitly documented it as throwaway once real screens existed). Nothing later in this plan builds on `App.jsx`.

- [ ] **Step 1: Replace the full contents of `web/src/App.jsx`**

Current contents:

```jsx
import { useEffect, useState } from 'react';
import { apiFetch } from './api/client.js';

export default function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    apiFetch('/settings')
      .then((data) => setStatus(data && data.format ? 'connected' : 'disconnected'))
      .catch(() => setStatus('disconnected'));
  }, []);

  const statusText = status === 'checking' ? 'Verbinde...' : status === 'connected' ? 'Verbunden' : 'Nicht verbunden';
  const statusClass = status === 'connected' ? 'text-success' : status === 'disconnected' ? 'text-danger' : 'text-text-2';

  return (
    <div className="min-h-screen bg-bg-0 text-text-0 p-8">
      <h1 className="text-2xl font-semibold">yt-dlp-web</h1>
      <p className={statusClass}>{statusText}</p>
    </div>
  );
}
```

Replace with:

```jsx
import { useState } from 'react';
import Home from './screens/Home.jsx';
import Queue from './screens/Queue.jsx';
import TerminalSheet from './components/TerminalSheet.jsx';

export default function App() {
  const [view, setView] = useState('home');

  return (
    <div className="min-h-screen bg-bg-0 text-text-0">
      <nav className="flex gap-2 p-4 border-b border-bg-1">
        <button
          type="button"
          onClick={() => setView('home')}
          className={view === 'home' ? 'text-text-0 font-semibold' : 'text-text-2'}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setView('queue')}
          className={view === 'queue' ? 'text-text-0 font-semibold' : 'text-text-2'}
        >
          Queue
        </button>
      </nav>
      {view === 'home' ? <Home /> : <Queue />}
      <TerminalSheet />
    </div>
  );
}
```

Note: this deliberately drops the "apiFetch throws on error" catch handling that `App.jsx` used to do itself — `Home.jsx`'s `useQuery`/`useMutation` calls now handle their own error states (Task 5's `addToQueue.isError` display), so `App.jsx` no longer needs to.

- [ ] **Step 2: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Home\b" web/dist/assets/*.js | head -1` and `grep -o "Queue ist leer" web/dist/assets/*.js` and `grep -o "Terminal öffnen" web/dist/assets/*.js`
Expected: all three find matches — confirms all three screens/components are actually included in the final bundle via `App.jsx`'s imports (not just individually buildable in isolation, as their own tasks already proved).

- [ ] **Step 3: Full end-to-end smoke check against the real backend**

Start the real backend in the background, note its key, and the Vite dev server (`cd web && corepack npm run dev`, note its port). Confirm the whole chain end to end:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:<dev-port>/                                                    # expect 200 (Vite serves the app shell)
curl -s -H "Authorization: Bearer <key>" http://localhost:<dev-port>/api/settings                                        # expect real settings JSON, proxied through to the real backend
```

Stop both background processes afterward.

- [ ] **Step 4: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-home-queue-screens
git add web/src/App.jsx
git commit -m "feat: wire Home, Queue, and terminal sheet into the app shell"
```
