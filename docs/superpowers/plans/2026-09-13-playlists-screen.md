# Playlists Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Playlists screen to the `web/` React app — manage saved YouTube playlists, drill into a playlist's entries, and select a subset to add to the download queue. This is the fourth nav tab, alongside Home, Queue, and Settings.

**Architecture:** One new screen, `web/src/screens/Playlists.jsx`, added as a fourth nav tab in `App.jsx`. It has two internal views toggled by local state (`'list'` / `'entries'`) — no router, matching the app's existing client-side view-switching convention. The list view manages saved playlists (`GET/POST/DELETE /api/saved-playlists`); the entries view fetches a playlist's video list on demand (`GET /api/playlist-info`) and lets the user select a subset to queue (`POST /api/queue`). Every mutation that can return an HTTP-200-with-`{success:false}` response explicitly checks `data.success` and throws if false — this repo's `apiFetch` only throws on non-2xx HTTP status, and the previous plan's final review found and fixed exactly this gap after the fact, so this plan bakes the check in from the start rather than waiting to rediscover it.

**Tech Stack:** React 19 (plain JSX), `@tanstack/react-query` (already installed). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-13-frontend-rework-design.md` (§4 Playlists screen)

## Global Constraints

- `npm` is not installed in this sandbox — only `node` and `corepack`. Every install/build/run command is `corepack npm ...`, never bare `npm`.
- **Safety rule, non-negotiable:** this sandbox shares its process/port namespace with a separately-managed live Docker container that may be running this project's production instance on port 3000 (`restart: unless-stopped`, cwd `/app`, `DOWNLOAD_PATH=/downloads`). Before starting ANY `node server/server.js`, run `pgrep -af "node server/server.js"` first. If one is already running, identify it via `cat /proc/<pid>/cwd` and `cat /proc/<pid>/environ | tr '\0' '\n' | grep DOWNLOAD_PATH` before touching it — a `cwd` of `/app` and `DOWNLOAD_PATH=/downloads` means it's the live production instance: do not kill it, do not start a second instance on port 3000. Use `PORT=3999` for your own throwaway test instance if one is already running. Only kill a process whose PID you captured from your own `&` background-launch command in the same task — and confirm you've stopped it before you finish.
- No test framework exists or should be introduced. Verification is `corepack npm run build` succeeding, bundle-content `grep`, and `curl` against a real running backend, exactly as each task's steps specify.
- This plan does not touch `server/server.js`, `public/`, `Dockerfile`, or `docker-compose.yml` — every backend endpoint used here already exists and is unchanged.
- Scope is **saved YouTube playlists only** — the backend's separate "custom playlists" feature (`/api/custom-playlists`, user-curated arbitrary URL lists, unrelated to fetching a real YouTube playlist's entries) is out of scope for this plan, matching the same MVP-scope discipline used for Home/Queue/Settings in earlier plans.
- Real backend response shapes used by this plan, confirmed by reading `server/server.js` directly during planning — do not invent different shapes:
  - `GET /api/saved-playlists` → a raw array `[{ id, name, url }, ...]` (no wrapper).
  - `POST /api/saved-playlists` with `{ url }` (and optional `name`) → `{ success: true, playlists: [...] }` on success, `{ success: false }` if `url` is missing.
  - `DELETE /api/saved-playlists/:id` → `{ success: true }`.
  - `GET /api/playlist-info?url=<encoded>` → `{ success: true, title, count, entries: [{ id, title, duration, url }] }` on success, or `{ success: false, error: 'fetch_failed' | 'not_playlist' | 'parse_error' | 'No URL provided' }` — this is an HTTP-200 response either way; a failed fetch is NOT a non-2xx status, so `apiFetch` will not throw for it — the calling code must check `.success` itself.
  - `POST /api/queue` with `{ items: [{ url, customName }] }` → `{ success: true, queued: <count> }` or `{ success: false }` if `items` is empty/missing.

---

### Task 1: Playlists screen scaffold, nav tab, and the saved-playlists list view

**Files:**
- Create: `web/src/screens/Playlists.jsx`
- Modify: `web/src/App.jsx`

**Interfaces:**
- Produces: `Playlists` — default export, no props, self-contained. `App.jsx` gets a fourth nav button/view (`'playlists'`). Task 2 extends this file's return statement to add the `'entries'` view alongside the `'list'` view this task creates; Task 3 adds the add-to-queue action inside that entries view. Both later tasks anchor on this task's exact code.

- [ ] **Step 1: Create `web/src/screens/Playlists.jsx`**

```jsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';

function useSavedPlaylists() {
  return useQuery({ queryKey: ['saved-playlists'], queryFn: () => apiFetch('/saved-playlists') });
}

export default function Playlists() {
  const savedQuery = useSavedPlaylists();
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState('');
  const [view, setView] = useState('list');
  const [activePlaylist, setActivePlaylist] = useState(null);

  const addPlaylist = useMutation({
    mutationFn: async (url) => {
      const data = await apiFetch('/saved-playlists', { method: 'POST', body: JSON.stringify({ url }) });
      if (!data.success) throw new Error('Playlist konnte nicht gespeichert werden.');
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['saved-playlists'], data.playlists);
      setNewUrl('');
    },
  });

  const removePlaylist = useMutation({
    mutationFn: (id) => apiFetch(`/saved-playlists/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(['saved-playlists'], (prev) => (prev || []).filter((p) => p.id !== id));
    },
  });

  function openPlaylist(playlist) {
    setActivePlaylist(playlist);
    setView('entries');
  }

  if (savedQuery.isPending) {
    return <div className="p-4 text-text-2">Lade Playlists...</div>;
  }
  if (savedQuery.isError) {
    return <div className="p-4 text-danger">Playlists konnten nicht geladen werden.</div>;
  }

  const playlists = savedQuery.data || [];

  return (
    <div className="p-4 flex flex-col gap-4 max-w-xl">
      {view === 'list' && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Playlist-URL..."
              className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
            />
            <button
              type="button"
              onClick={() => newUrl.trim() && addPlaylist.mutate(newUrl.trim())}
              disabled={!newUrl.trim() || addPlaylist.isPending}
              className="bg-indigo text-text-0 px-4 py-2 rounded disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
          {addPlaylist.isError && <p className="text-danger">{addPlaylist.error.message}</p>}
          {removePlaylist.isError && <p className="text-danger">{removePlaylist.error.message}</p>}

          {playlists.length === 0 ? (
            <p className="text-text-2">Keine gespeicherten Playlists.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {playlists.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-bg-1 px-3 py-2 rounded">
                  <button type="button" onClick={() => openPlaylist(p)} className="text-text-0 truncate text-left flex-1">
                    {p.name}
                  </button>
                  <button type="button" onClick={() => removePlaylist.mutate(p.id)} className="text-danger px-2">×</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the Playlists nav tab to `web/src/App.jsx`**

Locate the exact current contents of `web/src/App.jsx`:

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

Replace with:

```jsx
import { useState } from 'react';
import Home from './screens/Home.jsx';
import Queue from './screens/Queue.jsx';
import Settings from './screens/Settings.jsx';
import Playlists from './screens/Playlists.jsx';
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
          onClick={() => setView('playlists')}
          className={view === 'playlists' ? 'text-text-0 font-semibold' : 'text-text-2'}
        >
          Playlists
        </button>
        <button
          type="button"
          onClick={() => setView('settings')}
          className={view === 'settings' ? 'text-text-0 font-semibold' : 'text-text-2'}
        >
          Settings
        </button>
      </nav>
      {view === 'home' ? <Home /> : view === 'queue' ? <Queue /> : view === 'playlists' ? <Playlists /> : <Settings />}
      <TerminalSheet />
    </div>
  );
}
```

- [ ] **Step 3: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Keine gespeicherten Playlists" web/dist/assets/*.js`
Expected: at least one match.

- [ ] **Step 4: Verify against the real backend**

Start the real backend in the background (per the safety rule above), note its API key.

Run: `curl -s -H "Authorization: Bearer <key>" http://localhost:3000/api/saved-playlists`
Expected: `[]` (or an existing array, if this backend instance already has saved playlists from prior testing) — a raw array, no wrapper, matching what `useSavedPlaylists` expects.

Run: `curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"name":"Test","url":"https://www.youtube.com/playlist?list=PLtest123"}' http://localhost:3000/api/saved-playlists`
Expected: `{"success":true,"playlists":[{"id":<number>,"name":"Test","url":"https://www.youtube.com/playlist?list=PLtest123"}]}`.

Run: `curl -s -H "Authorization: Bearer <key>" -X DELETE http://localhost:3000/api/saved-playlists/<the id from the previous response>`
Expected: `{"success":true}`. Confirm with a follow-up `GET /api/saved-playlists` that the array no longer contains that entry. Stop the backend afterward.

- [ ] **Step 5: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-playlists-screen
git add web/src/screens/Playlists.jsx web/src/App.jsx
git commit -m "feat: add Playlists screen with saved-playlist list view"
```

---

### Task 2: Playlist entries drill-down view

**Files:**
- Modify: `web/src/screens/Playlists.jsx`

**Interfaces:**
- Consumes: `apiFetch`, `activePlaylist`/`setActivePlaylist`/`view`/`setView` (all already in scope from Task 1).
- Produces: the `'entries'` view — fetches and renders a playlist's video entries with checkboxes, a select-all/none pair, and a text filter. No new exports; this task extends the same default export. Task 3 adds the "add selected to queue" action inside this view — it does not replace this task's work.

- [ ] **Step 1: Add the entries query hook**

Immediately after `useSavedPlaylists`'s function definition (before `export default function Playlists()`), add:

```jsx
function useEntries(url) {
  return useQuery({
    queryKey: ['playlist-entries', url],
    queryFn: () => apiFetch(`/playlist-info?url=${encodeURIComponent(url)}`),
    enabled: !!url,
  });
}
```

- [ ] **Step 2: Add entries-view state and handlers**

Inside the `Playlists` function component, immediately after the `openPlaylist` function from Task 1, add:

```jsx
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterText, setFilterText] = useState('');

  const entriesQuery = useEntries(view === 'entries' && activePlaylist ? activePlaylist.url : null);

  function toggleEntry(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll(entries) {
    setSelectedIds(new Set(entries.map((e) => e.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function backToList() {
    setView('list');
    setActivePlaylist(null);
    setSelectedIds(new Set());
    setFilterText('');
  }
```

- [ ] **Step 3: Add the entries view's JSX**

Locate the exact end of Task 1's list-view block and the container's closing tags:

```jsx
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

Replace with (this inserts the new entries-view block between the closing `)}` of the list view and the closing `</div>` of the container — nothing in the list-view block itself changes):

```jsx
            </div>
          )}
        </>
      )}

      {view === 'entries' && activePlaylist && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={backToList} className="text-text-2">‹ Zurück</button>
            <span className="text-text-0 font-semibold truncate">{activePlaylist.name}</span>
          </div>

          {entriesQuery.isPending && <p className="text-text-2">Lade Einträge...</p>}
          {entriesQuery.isError && <p className="text-danger">Einträge konnten nicht geladen werden.</p>}
          {entriesQuery.data && !entriesQuery.data.success && (
            <p className="text-danger">{entriesQuery.data.error || 'Playlist konnte nicht geladen werden.'}</p>
          )}

          {entriesQuery.data && entriesQuery.data.success && (
            <>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => selectAll(entriesQuery.data.entries)} className="text-text-2">Alle</button>
                <button type="button" onClick={selectNone} className="text-text-2">Keine</button>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filtern..."
                  className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
                />
                <span className="text-text-2">{selectedIds.size} ausgewählt</span>
              </div>
              <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {entriesQuery.data.entries
                  .filter((e) => e.title.toLowerCase().includes(filterText.toLowerCase()))
                  .map((e) => (
                    <label key={e.id} className="flex items-center gap-2 bg-bg-1 px-3 py-2 rounded">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleEntry(e.id)} />
                      <span className="text-text-0 truncate flex-1">{e.title}</span>
                    </label>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "Lade Einträge" web/dist/assets/*.js` and `grep -o "ausgewählt" web/dist/assets/*.js`
Expected: both find at least one match.

- [ ] **Step 5: Verify the entries contract against the real backend**

Start the real backend in the background, note its key.

Run: `curl -s -H "Authorization: Bearer <key>" "http://localhost:3000/api/playlist-info?url=https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4k8wIdgY7bldbdNAsN"`
Expected: `{"success":true,"title":"...","count":<N>,"entries":[{"id":"...","title":"...","duration":...,"url":"..."}, ...]}` — a real public YouTube playlist; if this exact list ID has become unavailable, substitute any known-public playlist URL, the point is confirming the response shape only. Note that a real network fetch to YouTube is involved here — this is expected and matches how Task 6 of a prior plan (Queue screen) already validated a similar live-network endpoint.

Run: `curl -s -H "Authorization: Bearer <key>" "http://localhost:3000/api/playlist-info?url=https://example.com/not-a-playlist"`
Expected: `{"success":false,"error":"not_playlist"}` or similar — confirms the HTTP-200-with-`success:false` shape this task's `entriesQuery.data && !entriesQuery.data.success` branch handles. Stop the backend afterward.

- [ ] **Step 6: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-playlists-screen
git add web/src/screens/Playlists.jsx
git commit -m "feat: add playlist entries drill-down with selection and filter"
```

---

### Task 3: Add selected entries to the queue, and final integration check

**Files:**
- Modify: `web/src/screens/Playlists.jsx`

**Interfaces:**
- Consumes: `entriesQuery`, `selectedIds` (both from Task 2).
- Produces: the final piece of this plan — an "add to queue" action inside the entries view. This is the last task; it also performs a whole-file consistency check.

- [ ] **Step 1: Add the add-to-queue mutation**

Inside the `Playlists` function component, immediately after the `backToList` function from Task 2, add:

```jsx
  const addSelectedToQueue = useMutation({
    mutationFn: async () => {
      const items = entriesQuery.data.entries
        .filter((e) => selectedIds.has(e.id))
        .map((e) => ({ url: e.url, customName: null }));
      const data = await apiFetch('/queue', { method: 'POST', body: JSON.stringify({ items }) });
      if (!data.success) throw new Error('Konnte nicht zur Queue hinzugefügt werden.');
      return data;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
    },
  });
```

- [ ] **Step 2: Add the button to the entries view's JSX**

Locate the exact end of the entries list `<div>` from Task 2:

```jsx
              <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {entriesQuery.data.entries
                  .filter((e) => e.title.toLowerCase().includes(filterText.toLowerCase()))
                  .map((e) => (
                    <label key={e.id} className="flex items-center gap-2 bg-bg-1 px-3 py-2 rounded">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleEntry(e.id)} />
                      <span className="text-text-0 truncate flex-1">{e.title}</span>
                    </label>
                  ))}
              </div>
            </>
          )}
```

Replace with:

```jsx
              <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {entriesQuery.data.entries
                  .filter((e) => e.title.toLowerCase().includes(filterText.toLowerCase()))
                  .map((e) => (
                    <label key={e.id} className="flex items-center gap-2 bg-bg-1 px-3 py-2 rounded">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleEntry(e.id)} />
                      <span className="text-text-0 truncate flex-1">{e.title}</span>
                    </label>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => addSelectedToQueue.mutate()}
                disabled={selectedIds.size === 0 || addSelectedToQueue.isPending}
                className="bg-indigo text-text-0 px-4 py-2 rounded disabled:opacity-50 self-start"
              >
                {addSelectedToQueue.isPending ? 'Wird hinzugefügt...' : `${selectedIds.size} zur Queue hinzufügen`}
              </button>
              {addSelectedToQueue.isError && <p className="text-danger">{addSelectedToQueue.error.message}</p>}
            </>
          )}
```

- [ ] **Step 3: Verify by build + bundle inspection**

Run: `cd web && corepack npm run build`
Expected: no errors.

Run: `grep -o "zur Queue hinzufügen" web/dist/assets/*.js`
Expected: at least one match.

- [ ] **Step 4: Verify against the real backend**

Start the real backend in the background, note its key.

Run: `curl -s -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"items":[{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","customName":null}]}' http://localhost:3000/api/queue`
Expected: `{"success":true,"queued":1}` — matches exactly what `addSelectedToQueue`'s `mutationFn` sends and expects. Cancel it afterward with `curl -s -H "Authorization: Bearer <key>" -X POST http://localhost:3000/api/cancel` and stop the backend.

- [ ] **Step 5: Final whole-file consistency check**

Read the complete final `web/src/screens/Playlists.jsx` (all three tasks' worth of content) top to bottom once, and confirm: exactly one `useState`/`useMutation`/`useQuery` import line, no duplicate function/variable declarations, both the `'list'` and `'entries'` view blocks are present and mutually exclusive (never both rendered at once), all three mutations (`addPlaylist`, `removePlaylist`, `addSelectedToQueue`) appear exactly once, and there is no leftover placeholder text. Run `corepack npm run build` one final time to confirm the fully-assembled file still compiles cleanly.

- [ ] **Step 6: Commit**

```bash
cd /opt/yt-dlp-web/.claude/worktrees/frontend-playlists-screen
git add web/src/screens/Playlists.jsx
git commit -m "feat: add selected playlist entries to queue"
```
