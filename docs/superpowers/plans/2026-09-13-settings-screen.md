# Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Settings screen to the `web/` React app — every global (non-per-download) setting the backend already supports: quality/format defaults, cookies management, proxy configuration, custom yt-dlp args, the Deno/verbose toggles, app language, and — the single most valuable piece, since it currently requires shelling into the server or reading Docker logs — viewing and regenerating the API key.

**Architecture:** One new screen, `web/src/screens/Settings.jsx`, added as a third nav tab in `App.jsx` alongside Home and Queue. All simple fields (toggles, selects, blur-committed text/number inputs) go through one reusable `useMutation` that PATCHes `POST /api/settings` and updates the shared `['settings']` React Query cache on success — the same pattern `Home.jsx` already established for the format toggle. Cookies and proxy management use their own dedicated endpoints (`/api/upload-cookies`, `/api/cookies-status`, `/api/toggle-proxy`) since their shapes don't fit the generic patch. The API-key section calls the existing `/api/settings/regenerate-key` endpoint and — critically — updates the browser's own stored key so the current session doesn't lock itself out after rotating it.

**Tech Stack:** React 19 (plain JSX), `@tanstack/react-query` (already installed), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-13-frontend-rework-design.md` (§4 Settings screen, §6 API & Auth for the key-regeneration UX)

## Global Constraints

- `npm` is not installed in this sandbox — only `node` and `corepack`. Every install/build/run command is `corepack npm ...`, never bare `npm`.
- **Safety rule, non-negotiable:** this sandbox shares its process/port namespace with a separately-managed live Docker container that may be running this project's production instance on port 3000 (`restart: unless-stopped`, cwd `/app`, `DOWNLOAD_PATH=/downloads`). Before starting ANY `node server/server.js`, run `pgrep -af "node server/server.js"` first. If one is already running, identify it via `cat /proc/<pid>/cwd` and `cat /proc/<pid>/environ | tr '\0' '\n' | grep DOWNLOAD_PATH` before touching it — a `cwd` of `/app` and `DOWNLOAD_PATH=/downloads` means it's the live production instance: do not kill it, do not start a second instance on port 3000. Use `PORT=3999` for your own throwaway test instance if one is already running. Only kill a process whose PID you captured from your own `&` background-launch command in the same task.
- No test framework exists or should be introduced. Verification is `corepack npm run build` succeeding, bundle-content `grep`, and `curl` against a real running backend, exactly as each task's steps specify.
- This plan does not touch `server/server.js`, `public/`, `Dockerfile`, or `docker-compose.yml` — every backend endpoint used here already exists and is unchanged.
- `POST /api/settings` strips `apiKey` from the request body server-side (it cannot be set through the generic patch) — the API key is only ever changed via `POST /api/settings/regenerate-key`. Do not attempt to PATCH `apiKey` through the generic settings mutation.
- `GET /api/settings` returns the raw settings object directly (no wrapper) with (at least) these fields relevant to this plan: `audioQuality` ('128'|'192'|'320'), `videoQuality` ('best'|'1080'|'720'|'480'), `mkvContainer` (bool), `embedThumbnail` (bool), `speedLimit` (string, e.g. '5M' or ''), `subtitlesEnabled` (bool), `appLang` ('de'|'en'), `skipExisting` (bool), `downloadDelay` (string, seconds), `clearBetweenItems` (bool), `proxy` (string), `proxyEnabled` (bool), `savedProxies` (string[]), `customArgs` (string), `verbose` (bool), `jsRuntime` (bool), `apiKey` (string). Do not invent fields not in this list.

---

### Task 1: Settings screen scaffold, nav tab, and the generic-patch fields

**Files:**
- Create: `web/src/screens/Settings.jsx`
- Modify: `web/src/App.jsx`

**Interfaces:**
- Produces: `Settings` — default export, no props, self-contained. `App.jsx` gets a third nav button/view (`'settings'`) alongside the existing `'home'`/`'queue'`. Later tasks in this plan (2, 3, 4) extend `Settings.jsx`'s existing return statement with additional `<section>` blocks — they do not replace this task's work.

- [ ] **Step 1: Create `web/src/screens/Settings.jsx`**

```jsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';

function useSettingsQuery() {
  return useQuery({ queryKey: ['settings'], queryFn: () => apiFetch('/settings') });
}

function usePatchSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch) => apiFetch('/settings', { method: 'POST', body: JSON.stringify(patch) }),
    onSuccess: (_data, patch) => {
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, ...patch }));
    },
  });
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 gap-4">
      <span className="text-text-1">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5" />
    </label>
  );
}

function TextRow({ label, value, onCommit, placeholder }) {
  const [local, setLocal] = useState(value);
  return (
    <label className="flex flex-col gap-1 py-2">
      <span className="text-text-1">{label}</span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onCommit(local); }}
        placeholder={placeholder}
        className="bg-bg-1 text-text-0 px-3 py-2 rounded"
      />
    </label>
  );
}

export default function Settings() {
  const settingsQuery = useSettingsQuery();
  const patch = usePatchSettings();
  const s = settingsQuery.data;

  if (settingsQuery.isPending) {
    return <div className="p-4 text-text-2">Lade Einstellungen...</div>;
  }
  if (settingsQuery.isError || !s) {
    return <div className="p-4 text-danger">Einstellungen konnten nicht geladen werden.</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-6 max-w-xl">
      <section>
        <h2 className="text-text-0 font-semibold mb-2">Audio &amp; Video</h2>
        <label className="flex flex-col gap-1 py-2">
          <span className="text-text-1">Audioqualität</span>
          <select
            value={s.audioQuality}
            onChange={(e) => patch.mutate({ audioQuality: e.target.value })}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            <option value="128">128 kbps</option>
            <option value="192">192 kbps</option>
            <option value="320">320 kbps</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 py-2">
          <span className="text-text-1">Videoqualität</span>
          <select
            value={s.videoQuality}
            onChange={(e) => patch.mutate({ videoQuality: e.target.value })}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            <option value="best">Beste verfügbar</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
          </select>
        </label>
        <ToggleRow label="MKV-Container erzwingen" checked={s.mkvContainer} onChange={(v) => patch.mutate({ mkvContainer: v })} />
        <ToggleRow label="Thumbnail einbetten" checked={s.embedThumbnail} onChange={(v) => patch.mutate({ embedThumbnail: v })} />
        <ToggleRow label="Untertitel herunterladen" checked={s.subtitlesEnabled} onChange={(v) => patch.mutate({ subtitlesEnabled: v })} />
        <TextRow label="Geschwindigkeitslimit" value={s.speedLimit} onCommit={(v) => patch.mutate({ speedLimit: v })} placeholder="z.B. 5M, leer = unbegrenzt" />
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">Allgemein</h2>
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
        <ToggleRow label="Bestehende Dateien überspringen" checked={s.skipExisting} onChange={(v) => patch.mutate({ skipExisting: v })} />
        <ToggleRow label="Terminal auto-leeren" checked={s.clearBetweenItems} onChange={(v) => patch.mutate({ clearBetweenItems: v })} />
        <TextRow label="Pause zwischen Downloads (Sekunden)" value={s.downloadDelay} onCommit={(v) => patch.mutate({ downloadDelay: v })} placeholder="0" />
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">Erweitert</h2>
        <TextRow label="Eigene yt-dlp Argumente" value={s.customArgs} onCommit={(v) => patch.mutate({ customArgs: v })} placeholder="z.B. --playlist-start 1" />
        <ToggleRow label="Deno JS-Runtime" checked={s.jsRuntime} onChange={(v) => patch.mutate({ jsRuntime: v })} />
        <ToggleRow label="Ausführliche Ausgabe" checked={s.verbose} onChange={(v) => patch.mutate({ verbose: v })} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add the Settings nav tab to `web/src/App.jsx`**

Locate the exact current contents of `web/src/App.jsx`:

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

Replace with:

```jsx
import { useState } from 'react';
import Home from './screens/Home.jsx';
import Queue from './screens/Queue.jsx';
import Settings from './screens/Settings.jsx';
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
        <button
          type="button"
          onClick={() => setView('settings')}
          className={view === 'settings' ? 'text-text-0 font-semibold' : 'text-text-2'}
        >
          Settings
        </button>
      </nav>
      {view === 'home' ? <Home /> : view === 'queue' ? <Queue /> : <Settings />}
      <TerminalSheet />
    </div>
  );
}
```

- [ ] **Step 3: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Audioqualität" web/dist/assets/*.js` and `grep -o "Eigene yt-dlp Argumente" web/dist/assets/*.js`
Expected: both find at least one match.

- [ ] **Step 4: Verify the generic-patch mutation against the real backend**

Start the real backend in the background (per the safety rule above), note its API key.

Run: `curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"audioQuality":"320","clearBetweenItems":false}' http://localhost:3000/api/settings`
Expected: `{"success":true}`.

Run: `curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/settings`
Expected: the returned JSON has `"audioQuality":"320"` and `"clearBetweenItems":false` — exactly the shape `Settings.jsx`'s `useSettingsQuery` will receive and render from. Restore them afterward with `curl ... -d '{"audioQuality":"192","clearBetweenItems":true}' ...` (the defaults) and stop the backend.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-settings-screen
git add web/src/screens/Settings.jsx web/src/App.jsx
git commit -m "feat: add Settings screen with core toggles and nav tab"
```

---

### Task 2: Cookies section

**Files:**
- Modify: `web/src/screens/Settings.jsx`

**Interfaces:**
- Consumes: `apiFetch` (already imported in this file from Task 1).
- Produces: a new `<section>` inside `Settings`'s existing return statement — status display, file upload, remove button. No new exports; this task extends the same default export.

- [ ] **Step 1: Add a cookies-status query and mutations**

Inside `Settings.jsx`, immediately after the `usePatchSettings` function definition (before `function ToggleRow`), add:

```jsx
function useCookiesStatus() {
  return useQuery({ queryKey: ['cookies-status'], queryFn: () => apiFetch('/cookies-status') });
}
```

- [ ] **Step 2: Add upload/remove mutations and the cookies section's JSX**

Inside the `Settings` function component, immediately after the line `const s = settingsQuery.data;`, add:

```jsx
  const cookiesStatus = useCookiesStatus();
  const queryClient = useQueryClient();

  const uploadCookies = useMutation({
    mutationFn: (text) => apiFetch('/upload-cookies', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cookies-status'] }),
  });

  const removeCookies = useMutation({
    mutationFn: () => apiFetch('/cookies', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cookies-status'] }),
  });

  function handleCookiesFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => uploadCookies.mutate(reader.result);
    reader.readAsText(file);
    e.target.value = '';
  }
```

Then, inside the JSX returned by `Settings`, immediately after the `</section>` that closes the "Erweitert" section (the last section from Task 1), add a new section:

```jsx
      <section>
        <h2 className="text-text-0 font-semibold mb-2">YouTube Account</h2>
        <p className="text-text-2">
          Cookies: {cookiesStatus.data && cookiesStatus.data.active ? <span className="text-success">aktiv</span> : <span className="text-text-2">nicht aktiv</span>}
        </p>
        <div className="flex gap-2 mt-2">
          <label className="bg-bg-1 text-text-0 px-4 py-2 rounded cursor-pointer">
            Hochladen
            <input type="file" accept=".txt" onChange={handleCookiesFile} className="hidden" />
          </label>
          {cookiesStatus.data && cookiesStatus.data.active && (
            <button type="button" onClick={() => removeCookies.mutate()} className="bg-bg-1 text-text-0 px-4 py-2 rounded">
              Entfernen
            </button>
          )}
        </div>
      </section>
```

- [ ] **Step 3: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "YouTube Account" web/dist/assets/*.js`
Expected: at least one match.

- [ ] **Step 4: Verify against the real backend**

Start the real backend in the background, note its key.

Run: `curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/cookies-status`
Expected: `{"active":false}` (assuming no cookies file exists in your scratch `DOWNLOAD_PATH`/`SETTINGS_PATH` env — this task doesn't need a real cookies.txt, just confirm the endpoint shape matches what `useCookiesStatus` expects).

Run: `curl -s -H "Authorization: Bearer <key>" -H "Content-Type: text/plain" -X POST --data "# Netscape HTTP Cookie File" http://localhost:3000/api/upload-cookies`
Expected: `{"success":true}`.

Run: `curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/cookies-status`
Expected: `{"active":true}`.

Run: `curl -s -H "Authorization: Bearer <key>" -X DELETE http://localhost:3000/api/cookies`
Expected: `{"success":true}`, and a follow-up `cookies-status` call returns `{"active":false}` again. Stop the backend afterward.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-settings-screen
git add web/src/screens/Settings.jsx
git commit -m "feat: add cookies upload/status/remove to Settings"
```

---

### Task 3: Proxy section

**Files:**
- Modify: `web/src/screens/Settings.jsx`

**Interfaces:**
- Consumes: `apiFetch`, `s` (the settings object, already in scope from Task 1).
- Produces: a new `<section>` for proxy configuration. No new exports.

- [ ] **Step 1: Add a toggle-proxy mutation**

Inside the `Settings` function component, immediately after the `removeCookies` mutation from Task 2, add:

```jsx
  const [proxyInput, setProxyInput] = useState('');

  const toggleProxy = useMutation({
    mutationFn: (body) => apiFetch('/toggle-proxy', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (_data, body) => {
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, ...body }));
    },
  });

  function addProxy() {
    const value = proxyInput.trim();
    if (!value) return;
    const existing = s.savedProxies || [];
    if (existing.includes(value)) return;
    const savedProxies = [value, ...existing];
    setProxyInput('');
    toggleProxy.mutate({ proxyEnabled: s.proxyEnabled, proxy: value, savedProxies });
  }

  function removeProxy(value) {
    const savedProxies = (s.savedProxies || []).filter((p) => p !== value);
    const proxy = s.proxy === value ? '' : s.proxy;
    toggleProxy.mutate({ proxyEnabled: s.proxyEnabled, proxy, savedProxies });
  }
```

`useState` is already imported in this file (used by `TextRow`); no import changes needed.

- [ ] **Step 2: Add the proxy section's JSX**

Immediately after the "YouTube Account" `</section>` added in Task 2, add:

```jsx
      <section>
        <h2 className="text-text-0 font-semibold mb-2">Proxy</h2>
        <ToggleRow
          label="Proxy verwenden"
          checked={s.proxyEnabled}
          onChange={(v) => toggleProxy.mutate({ proxyEnabled: v, proxy: s.proxy, savedProxies: s.savedProxies })}
        />
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={proxyInput}
            onChange={(e) => setProxyInput(e.target.value)}
            placeholder="socks5://user:pass@127.0.0.1:1080"
            className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
          />
          <button type="button" onClick={addProxy} className="bg-bg-1 text-text-0 px-4 py-2 rounded">
            +
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          {(s.savedProxies || []).map((p) => (
            <div key={p} className="flex justify-between items-center bg-bg-1 px-3 py-2 rounded">
              <span className={p === s.proxy ? 'text-text-0' : 'text-text-2'}>{p}</span>
              <button type="button" onClick={() => removeProxy(p)} className="text-danger">×</button>
            </div>
          ))}
        </div>
      </section>
```

- [ ] **Step 3: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Proxy verwenden" web/dist/assets/*.js`
Expected: at least one match.

- [ ] **Step 4: Verify against the real backend**

Start the real backend in the background, note its key.

Run: `curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"proxyEnabled":true,"proxy":"socks5://127.0.0.1:1080","savedProxies":["socks5://127.0.0.1:1080"]}' http://localhost:3000/api/toggle-proxy`
Expected: `{"success":true}`.

Run: `curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/settings`
Expected: the response has `"proxyEnabled":true`, `"proxy":"socks5://127.0.0.1:1080"`, `"savedProxies":["socks5://127.0.0.1:1080"]` — exactly what `toggleProxy`'s `onSuccess` writes into the cache. Restore with `curl ... -d '{"proxyEnabled":false,"proxy":"","savedProxies":[]}' ...` and stop the backend.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-settings-screen
git add web/src/screens/Settings.jsx
git commit -m "feat: add proxy configuration to Settings"
```

---

### Task 4: API key section, update-ytdlp button, and final integration check

**Files:**
- Modify: `web/src/api/client.js`, `web/src/screens/Settings.jsx`

**Interfaces:**
- Produces: `setStoredKey(key)` exported from `api/client.js` — used so the browser's own stored key stays in sync after the user regenerates it (otherwise the current session would immediately 401 itself out, since the old key it's still sending would no longer match). `Settings.jsx` gets its final section (API key + update-ytdlp) — this is the last task touching this file in this plan.

- [ ] **Step 1: Export a key-setter from `api/client.js`**

Locate the exact current contents of `web/src/api/client.js`:

```js
const API_KEY_STORAGE = 'ytdlpweb.apiKey';

function getStoredKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export async function apiFetch(path, options = {}) {
```

Replace with:

```js
const API_KEY_STORAGE = 'ytdlpweb.apiKey';

function getStoredKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function setStoredKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export async function apiFetch(path, options = {}) {
```

(Everything else in this file — the 401-retry/replay logic — stays exactly as-is; only the new exported function is added, and the existing `prompt()` branch's inline `localStorage.setItem(API_KEY_STORAGE, entered)` call is untouched, left as its own inline write rather than refactored to call the new helper — that refactor isn't needed for this task and would be unrelated scope.)

- [ ] **Step 2: Add the API-key section's state and mutation**

In `Settings.jsx`, add `setStoredKey` to the existing import from `../api/client.js`:

Locate:
```jsx
import { apiFetch } from '../api/client.js';
```

Replace with:
```jsx
import { apiFetch, setStoredKey } from '../api/client.js';
```

Then, inside the `Settings` function component, immediately after the `removeProxy` function from Task 3, add:

```jsx
  const [showKey, setShowKey] = useState(false);

  const regenerateKey = useMutation({
    mutationFn: () => apiFetch('/settings/regenerate-key', { method: 'POST' }),
    onSuccess: (data) => {
      setStoredKey(data.apiKey);
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, apiKey: data.apiKey }));
    },
  });

  const updateYtDlp = useMutation({
    mutationFn: () => apiFetch('/update-ytdlp', { method: 'POST' }),
  });

  function handleRegenerateKey() {
    if (window.confirm('Neuen API-Key generieren? Der alte Key wird sofort ungültig.')) {
      regenerateKey.mutate();
    }
  }
```

- [ ] **Step 3: Add the API-key section's JSX**

Immediately after the "Proxy" `</section>` added in Task 3, add:

```jsx
      <section>
        <h2 className="text-text-0 font-semibold mb-2">API-Key</h2>
        <p className="text-text-2 text-sm">Für iOS Shortcuts, Tasker & Co. — als <code>Authorization: Bearer &lt;Key&gt;</code> Header mitschicken.</p>
        <div className="flex gap-2 mt-2 items-center">
          <code className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded overflow-x-auto whitespace-nowrap">
            {showKey ? s.apiKey : '••••••••••••••••••••••••••••••••••••••••••••••••'}
          </code>
          <button type="button" onClick={() => setShowKey((v) => !v)} className="bg-bg-1 text-text-0 px-3 py-2 rounded">
            {showKey ? 'Verbergen' : 'Anzeigen'}
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(s.apiKey)}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            Kopieren
          </button>
        </div>
        <button
          type="button"
          onClick={handleRegenerateKey}
          disabled={regenerateKey.isPending}
          className="mt-2 bg-danger text-text-0 px-4 py-2 rounded disabled:opacity-50"
        >
          {regenerateKey.isPending ? 'Wird erneuert...' : 'Neu generieren'}
        </button>
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">Wartung</h2>
        <button
          type="button"
          onClick={() => updateYtDlp.mutate()}
          disabled={updateYtDlp.isPending}
          className="bg-bg-1 text-text-0 px-4 py-2 rounded disabled:opacity-50"
        >
          {updateYtDlp.isPending ? 'Prüfe...' : 'yt-dlp aktualisieren'}
        </button>
      </section>
```

- [ ] **Step 4: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Neu generieren" web/dist/assets/*.js` and `grep -o "yt-dlp aktualisieren" web/dist/assets/*.js`
Expected: both find at least one match.

- [ ] **Step 5: Verify the key-regeneration flow against the real backend**

Start the real backend in the background, note its printed key as `<key1>`.

Run: `curl -s -H "Authorization: Bearer <key1>" -X POST http://localhost:3000/api/settings/regenerate-key`
Expected: `{"success":true,"apiKey":"<key2, a different 48-hex-char string>"}`.

Run: `curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <key1>" http://localhost:3000/api/settings`
Expected: `401` — confirms the old key is now invalid, which is exactly why `setStoredKey` must run in `regenerateKey`'s `onSuccess` (without it, the browser would keep sending the now-dead `<key1>` and get logged out of its own session after clicking "Neu generieren").

Run: `curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <key2>" http://localhost:3000/api/settings`
Expected: `200`. Stop the backend afterward.

- [ ] **Step 6: Final whole-file review pass**

Read the complete final `web/src/screens/Settings.jsx` (all four tasks' worth of content) top to bottom once, and confirm: no duplicate `const queryClient = ...` declarations (Task 2 introduces it, Tasks 3/4 reuse the same one), no duplicate `useState` imports, every mutation from every task is present exactly once, and the file has no leftover placeholder text. Run `corepack npm run build` one final time to confirm the fully-assembled file still compiles cleanly.

- [ ] **Step 7: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-settings-screen
git add web/src/api/client.js web/src/screens/Settings.jsx
git commit -m "feat: add API key display/regenerate and yt-dlp update to Settings"
```
