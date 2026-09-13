# React Frontend Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new React/Vite/Tailwind frontend toolchain in `web/` — build pipeline, ported dark-theme design tokens, a dev-server proxy to the existing Express backend, and an API client carrying the bearer-key auth bridge — proven end-to-end with one minimal page that reports whether it's actually talking to the authenticated backend.

**Architecture:** A new, independent `web/` directory holds a Vite + React 19 app (plain JS/JSX, no TypeScript — matches the rest of this repo's untyped style). Tailwind v4's CSS-first `@theme` block re-declares the existing dark palette from `public/styles.css` as Tailwind color tokens, so later plans style against the same names already in use. Vite's dev server proxies `/api` and `/ws` to the real backend (`http://localhost:3000`) so development happens against the actual running server, not mocks. This plan does not touch `server/`, `public/`, the Dockerfile, or docker-compose — it is purely additive, and the old frontend keeps serving from `/` exactly as it does today. Wiring `web/dist` into production static serving is a later (cutover) plan's job.

**Tech Stack:** Vite 8, React 19 (plain JSX, no TypeScript), Tailwind CSS 4 (`@tailwindcss/vite` plugin, CSS-first `@theme` config, no `tailwind.config.js`). No Radix, shadcn, TanStack Query, Motion, Sonner, or cmdk yet — those are installed in the plan that actually builds the screens using them (Plan 3), not speculatively here.

**Spec:** `docs/superpowers/specs/2026-09-13-frontend-rework-design.md` (§5 Visual Design System for the palette/typography this plan ports; §10 Migration Plan step 1 for the `web/` directory and stack choice)

## Global Constraints

- `npm` is not installed in this sandbox — only `node` and `corepack`. Every `npm` invocation in this plan (and in every task brief) is written as `corepack npm ...`, confirmed working (`corepack npm --version` succeeds, `corepack npm install <pkg>` successfully fetches from the real registry). Implementers MUST use `corepack npm`, never bare `npm`.
- This plan is additive only: it must not modify `server/server.js`, any file under `public/`, `Dockerfile`, or `docker-compose.yml`. Everything lives under a new `web/` directory.
- No TypeScript. Plain `.jsx`/`.js` files, matching the untyped style of the rest of the repo.
- No component library (Radix/shadcn), no TanStack Query, no Motion, no Sonner, no cmdk in this plan — YAGNI: those get installed by the plan that first uses them.
- Root `.gitignore` already ignores `node_modules/` and `dist/` at any depth (no leading `/` in either pattern) — `web/node_modules/` and `web/dist/` are already covered; do not add a second `.gitignore` inside `web/`.
- The real backend (`server/server.js`) must be running on port 3000 for any proxy-based verification step — start it with `DOWNLOAD_PATH=/tmp/<scratch-dir> node server/server.js` from the repo root, exactly as in the previous plan's verification steps, and read its printed API key from stdout for the `Authorization: Bearer <key>` header used in curl checks.
- No automated test framework exists or is to be introduced. Verification is: `corepack npm run build` succeeding, `corepack npm run dev` serving correctly, and `curl` against the dev server (proxied) and the real backend directly, exactly as each task's steps specify.

---

### Task 1: Vite + React scaffold

**Files:**
- Create: `web/package.json`, `web/vite.config.js`, `web/index.html`, `web/src/main.jsx`, `web/src/App.jsx`
- Modify: `README.md` (add a "New frontend (in development)" subsection)

**Interfaces:**
- Produces: a `web/` directory that builds with `corepack npm run build` (from inside `web/`) into `web/dist/`, and serves with `corepack npm run dev`. `App` is the default export of `web/src/App.jsx`, rendered by `web/src/main.jsx` into `#root`. Later tasks in this plan import and extend `App.jsx`.

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "yt-dlp-web-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.1.1",
    "vite": "^8.3.0"
  }
}
```

- [ ] **Step 2: Create `web/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Create `web/index.html`**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>yt-dlp-web</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `web/src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Create `web/src/App.jsx`**

```jsx
export default function App() {
  return (
    <div>
      <h1>yt-dlp-web</h1>
    </div>
  );
}
```

- [ ] **Step 6: Add a dev-instructions subsection to `README.md`**

Locate this exact block:

```
Open `http://localhost:3000`. Settings persist to `data/settings.json`, downloads default to `/downloads` unless `DOWNLOAD_PATH` is set.

### Project Structure
```

Replace with:

```
Open `http://localhost:3000`. Settings persist to `data/settings.json`, downloads default to `/downloads` unless `DOWNLOAD_PATH` is set.

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

### Project Structure
```

- [ ] **Step 7: Install dependencies and verify the build**

Run: `cd web && corepack npm install`
Expected: completes without error, creates `web/node_modules/` and `web/package-lock.json`.

Run: `corepack npm run build` (still inside `web/`)
Expected: completes without error, creates `web/dist/index.html` and `web/dist/assets/*.js`.

- [ ] **Step 8: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/backend-api-auth-mkv-toggle
git add web/package.json web/package-lock.json web/vite.config.js web/index.html web/src/main.jsx web/src/App.jsx README.md
git commit -m "feat: scaffold Vite + React frontend in web/"
```

---

### Task 2: Tailwind v4 with ported dark-theme tokens

**Files:**
- Modify: `web/package.json` (add devDependencies), `web/vite.config.js` (add plugin), `web/src/main.jsx` (import stylesheet)
- Create: `web/src/styles.css`
- Modify: `web/src/App.jsx` (prove the tokens render)

**Interfaces:**
- Consumes: the scaffold from Task 1 (`web/vite.config.js`'s `plugins` array, `web/src/main.jsx`'s import list).
- Produces: Tailwind utility classes `bg-bg-0`, `bg-bg-1`, `bg-bg-2`, `text-text-0`, `text-text-1`, `text-text-2`, `text-success`, `text-danger`, `bg-indigo`/`text-indigo` available everywhere in `web/src/**`, mapped to the exact RGB values from `public/styles.css`'s `:root` block. Later tasks/plans style against these same names.

- [ ] **Step 1: Add Tailwind to `web/package.json`**

In `web/package.json`, the `devDependencies` block currently reads:

```json
  "devDependencies": {
    "@vitejs/plugin-react": "^6.1.1",
    "vite": "^8.3.0"
  }
```

Replace with:

```json
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^6.1.1",
    "tailwindcss": "^4.3.3",
    "vite": "^8.3.0"
  }
```

- [ ] **Step 2: Add the Tailwind Vite plugin**

In `web/vite.config.js`, replace:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

with:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 3: Create `web/src/styles.css` with the ported palette**

These RGB values are copied verbatim from `public/styles.css`'s `:root` block (the `--c-bg-0`, `--c-text-0` etc. custom properties there are `R, G, B` triplets used via `rgb(var(--c-x))` — here they're written as plain `rgb(R G B)` since Tailwind v4's `@theme` values are complete CSS color values, not triplets to wrap):

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

- [ ] **Step 4: Import the stylesheet**

In `web/src/main.jsx`, replace:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
```

with:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
```

- [ ] **Step 5: Prove the tokens render — update `App.jsx`**

Replace the full contents of `web/src/App.jsx`:

```jsx
export default function App() {
  return (
    <div className="min-h-screen bg-bg-0 text-text-0 p-8">
      <h1 className="text-2xl font-semibold">yt-dlp-web</h1>
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `cd web && corepack npm install` (picks up the new Tailwind devDependencies)
Expected: no errors.

Run: `corepack npm run build`
Expected: no errors. Then check that the compiled CSS actually contains the generated utility class (checking for the class *selector* rather than the color value inside it, since a CSS minifier may rewrite `rgb(13 13 15)` to an equivalent hex form like `#0d0d0f` — the selector text itself is not affected by that kind of minification):

Run: `grep -c "bg-bg-0" web/dist/assets/*.css`
Expected: at least one match (proves Tailwind generated the `.bg-bg-0` utility from the `--color-bg-0` token in the `@theme` block — i.e. the theme block was picked up correctly, not just present in source).

- [ ] **Step 7: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/backend-api-auth-mkv-toggle
git add web/package.json web/package-lock.json web/vite.config.js web/src/styles.css web/src/main.jsx web/src/App.jsx
git commit -m "feat: add Tailwind v4 with ported dark-theme tokens"
```

---

### Task 3: Dev-server proxy to the real backend

**Files:**
- Modify: `web/vite.config.js`

**Interfaces:**
- Produces: any request to `http://localhost:5173/api/*` (Vite's default dev port) is forwarded to `http://localhost:3000/api/*`; any WebSocket connection to `ws://localhost:5173/ws` is forwarded to `ws://localhost:3000/ws`. This is what lets the dev server talk to the real, running backend instead of a mock.

- [ ] **Step 1: Add the proxy config**

In `web/vite.config.js`, replace:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

with:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 2: Verify the proxy actually forwards to the real backend**

Start the real backend in the background: `DOWNLOAD_PATH=/tmp/ytdlp-task3-web-downloads node server/server.js` (from the repo root; note its printed API key).

Start the Vite dev server in the background: `cd web && corepack npm run dev` (note the port it prints, typically 5173).

Run (no auth header, through the Vite dev port):
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/settings`
Expected: `401` — proves the request actually reached the real backend's auth middleware (a mock or misconfigured proxy would not produce this specific backend-generated status).

Run (with the correct key, through the Vite dev port):
`curl -s -H "Authorization: Bearer <key>" http://localhost:5173/api/settings`
Expected: HTTP 200 with the real settings JSON body (same shape as querying port 3000 directly).

Stop both background processes afterward.

- [ ] **Step 3: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/backend-api-auth-mkv-toggle
git add web/vite.config.js
git commit -m "feat: proxy dev-server /api and /ws to the real backend"
```

---

### Task 4: API client with the auth bridge

**Files:**
- Create: `web/src/api/client.js`

**Interfaces:**
- Produces: `apiFetch(path, options = {})` — an exported async function. `path` is appended to `/api` (e.g. `apiFetch('/settings')` requests `/api/settings`). Returns a `Promise` resolving to the parsed JSON response body. Stores the API key under the `localStorage` key `ytdlpweb.apiKey` (deliberately the same name used by the existing frontend's equivalent bridge in `public/modules/api.js`, for naming consistency across the two frontends — they run on different origins during development so this doesn't cause any actual sharing). Later tasks/plans import `apiFetch` from this module for every backend call.

- [ ] **Step 1: Create `web/src/api/client.js`**

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

- [ ] **Step 2: Verify what can be verified in this sandbox**

This sandbox has no browser, so `prompt()` and `localStorage` cannot be executed directly (same constraint as the equivalent module in the previous plan's Task 5 — do not attempt to run this file under plain Node; it targets a browser environment and uses browser-only globals).

Verify by inspection and by exercising the server side of the contract:
1. Read the file back and manually trace all three paths: (a) no stored key → `getStoredKey()` returns `''` → falsy → no `Authorization` header sent → if the server responds 401, `prompt()` fires; (b) stored key present → header attached on the first attempt, no prompt; (c) user cancels the prompt (`prompt()` returns `null`) → `if (entered)` is falsy → no retry → falls through to `return res.json()` on the original 401 response (no crash).
2. Confirm the run-time contract this code depends on is real: with the backend running (as in Task 3), `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/settings` (no header) returns `401`, and the same request with `-H "Authorization: Bearer <key>"` returns `200` — this is exactly the distinction the code's `if (res.status === 401)` branches on.
3. Nothing imports this file yet (that happens in Task 5), so `corepack npm run build` would not actually parse it — Vite/Rollup only follows the import graph from `index.html`, and an orphan file is invisible to that build. Instead, check its syntax directly: `node --check web/src/api/client.js`. This works even though the file uses browser-only globals (`prompt`, `localStorage`, `fetch`) — `--check` only parses, it never executes, and `web/package.json`'s `"type": "module"` (from Task 1) makes Node parse this `.js` file as an ES module, matching its `export` syntax.
Expected: no output, exit code 0 (a syntax error would print a `SyntaxError` and exit non-zero).

Document in your report that the `prompt()`/`localStorage` behavior itself could not be executed in this sandbox, same as the prior plan's equivalent task — do not claim you ran it in a browser if you didn't.

- [ ] **Step 3: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/backend-api-auth-mkv-toggle
git add web/src/api/client.js
git commit -m "feat: add frontend API client with auth-key bridge"
```

---

### Task 5: Wire the placeholder page to the real backend

**Files:**
- Modify: `web/src/App.jsx`

**Interfaces:**
- Consumes: `apiFetch` from `web/src/api/client.js` (Task 4).
- Produces: the final proof-of-toolchain deliverable for this plan — a page that actually calls the real backend through the real auth bridge and reports the result. Nothing later in this plan builds on `App.jsx`'s content (Plan 3 replaces it with the real Home screen), so this is an end task, not an interface other tasks consume.

- [ ] **Step 1: Update `App.jsx`**

Replace the full contents of `web/src/App.jsx`:

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

`data.format` is checked (rather than a `success` field) because `GET /api/settings` returns the raw settings object directly — `DEFAULT_SETTINGS` in `server/server.js` always includes a `format` field (`'mp3'` or `'mp4'`), so its presence is a reliable signal that a real, authenticated settings response came back.

- [ ] **Step 2: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Verbunden" web/dist/assets/*.js` and `grep -o "Nicht verbunden" web/dist/assets/*.js`
Expected: both strings found in the built bundle — confirms the status logic compiled in, as a stand-in for browser execution (which this sandbox cannot do).

- [ ] **Step 3: Verify the real end-to-end path with the dev server**

Start the real backend in the background (as in Task 3), note its API key.
Start the Vite dev server in the background: `cd web && corepack npm run dev`.

Run: `curl -s http://localhost:5173/api/settings -H "Authorization: Bearer <key>"`
Expected: the real settings JSON, containing a `"format"` field — this is exactly the response `App.jsx`'s `useEffect` will receive and use to compute `status`.

Stop both background processes afterward.

- [ ] **Step 4: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/backend-api-auth-mkv-toggle
git add web/src/App.jsx
git commit -m "feat: wire placeholder page to the real backend via apiFetch"
```
