# UI Rework: Design System, Bottom Navigation, Auth Simplification

## 1. Summary

The React frontend (`web/`) is functionally complete across five screens
(Home, Queue, Playlists, Settings, Terminal-Sheet) but visually is an
unstyled Tailwind skeleton: plain-text nav, no elevation/hierarchy, no
icons, native form controls, and a forced browser `prompt()` for API-key
entry on first use. This plan introduces a small shared design system
(elevated cards, consistent buttons/inputs/toggles, `lucide-react` icons,
a self-hosted Inter font) applied consistently across all screens, moves
navigation to an iOS-style bottom tab bar, and removes the mandatory
API-key gate for browser/PWA use.

Visual direction was validated with the user via mockups (three card/list
surface styles): the user picked the **elevated card** style — soft
shadow, no border, `rounded-2xl` — over a bordered-flat or borderless-
divider alternative.

## 2. Current State (baseline)

- `web/src/App.jsx` — top `<nav>` with four plain-text buttons
  (`text-text-0 font-semibold` / `text-text-2` for active/inactive), no
  icons, no active-state indicator beyond font weight.
- `web/src/styles.css` — Tailwind v4 `@theme` block defines color tokens
  only (`--color-bg-0/1/2`, `--color-text-0..5`, accent colors). No font,
  no radius/shadow scale.
- Every screen (`Home.jsx`, `Queue.jsx`, `Playlists.jsx`, `Settings.jsx`)
  repeats the same inline Tailwind class strings for inputs
  (`bg-bg-1 text-text-0 px-3 py-2 rounded`), buttons
  (`bg-indigo text-text-0 px-4 py-2 rounded disabled:opacity-50`), and
  list rows (`bg-bg-1 rounded px-3 py-2`) — no shared components.
- `Settings.jsx` defines local `ToggleRow` (native `<input type=checkbox>`)
  and `TextRow` components, used only within that file.
- `Queue.jsx` renders status as plain colored text (`STATUS_LABEL` /
  `STATUS_CLASS` maps), no badge/pill styling, no progress bar.
- Delete/remove actions across `Playlists.jsx` and `Settings.jsx` are bare
  `×` text buttons with no defined touch-target size.
- `TerminalSheet.jsx` — Radix `Dialog`, FAB trigger at
  `fixed bottom-6 right-6`, functionally solid, styling matches the rest
  of the app's current bare-bones look.
- `web/index.html` — no font `<link>`, no `font-family` set anywhere, so
  text renders in each platform's default sans-serif.
- `web/package.json` — no icon library, no font package.
- **Auth**: `server/server.js:101` — `app.use('/api', requireApiKey)`
  guards every `/api/*` route, including ones only ever called from the
  app's own browser session (settings, queue, playlists). `requireApiKey`
  (`server.js:94-99`) checks `Authorization: Bearer <token>` against
  `settings.apiKey`, generated once at server startup and only ever
  printed to the server console log.
  `web/src/api/client.js` stores a key in `localStorage`
  (`ytdlpweb.apiKey`) and, on any `401`, falls back to a native
  `window.prompt('API-Key erforderlich (siehe Server-Log beim Start):')`
  — the only way to use the app from a browser that doesn't already have
  the key cached. This is the "forced token entry" the user wants gone.
  The API key remains the intended auth mechanism for the external iOS
  Shortcuts endpoints (`/api/shortcuts/*`, `server.js:720-754`), which are
  called by a device that isn't the app's own browser session and can't
  rely on same-origin/network trust.

## 3. Decisions Made

- **Full-app scope.** Nav, Home, Queue, Playlists, Settings, and the
  Terminal-Sheet all get the new design system in one pass — a partial
  rollout would leave the app visually inconsistent, which is the
  original complaint.
- **Visual direction: minimal/clean (Linear/Vercel-like), dark mode only.**
  No light theme — out of scope, matches current app-wide behavior and
  avoids doubling the color-token surface for no requested benefit.
- **Card style: elevated** (`shadow`, `rounded-2xl`, no border) — chosen
  by the user from three mocked-up alternatives (bordered-flat,
  elevated, borderless-with-dividers).
- **Bottom tab bar, not top nav.** The app runs installed to an iPhone
  homescreen as a standalone PWA; a thumb-reachable bottom bar matches
  that context better than a desktop-style top nav.
- **`lucide-react` for icons.** Small, tree-shakeable, visually matches
  the chosen minimal aesthetic.
- **Inter font, self-hosted via `@fontsource/inter`, not Google Fonts
  CDN.** The app is an offline-capable PWA (`vite-plugin-pwa` +
  Workbox precache); an external font request would be a network
  dependency the service worker doesn't control and could fail or flash
  unstyled text when launched offline from the homescreen. Bundling the
  font into `web/dist` keeps it fully self-hosted and precached like
  everything else.
- **Auth: drop the API-key requirement for browser/PWA use entirely.**
  The web UI will no longer send or require an `Authorization` header.
  Protection for normal use becomes network-level only (the container is
  assumed to run on a trusted LAN, consistent with this being a
  self-hosted single-user tool). The API key stays mandatory, unchanged,
  for the external `/api/shortcuts/*` endpoints, since those are called
  by a device outside the browser session and have no other trust
  signal.
- **New shared UI components live under `web/src/components/ui/`**
  (`Card`, `Button`, `TextInput`, `ToggleRow`, `StatusBadge`,
  `IconButton`), replacing per-screen duplicated Tailwind class strings
  and the local `ToggleRow`/`TextRow` currently defined only inside
  `Settings.jsx`. `TextRow`'s debounce-on-blur pattern is preserved as
  part of the shared `TextInput` usage in `Settings.jsx`, not duplicated
  as a second component.
- **One spec, one implementation plan.** Unlike prior per-screen specs in
  this project's history, this rework is inherently cross-cutting — its
  entire point is visual consistency across screens via shared
  components — so splitting it into multiple specs would risk the
  screens drifting from each other again. The follow-up implementation
  plan will sequence the work in phases (foundation → nav → per-screen →
  auth → verification) without needing separate specs per phase.

## 4. Design System (Foundation)

`web/src/styles.css` additions to the existing `@theme` block:

```css
@theme {
  /* existing color tokens unchanged */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --radius-card: 1rem;      /* rounded-2xl */
  --shadow-card: 0 4px 14px rgba(0, 0, 0, 0.35);
}
```

`web/package.json` additions:
- `lucide-react` (dependency)
- `@fontsource/inter` (dependency) — imported once in `web/src/main.jsx`
  (`import '@fontsource/inter/400.css'` + `500.css` + `600.css` +
  `700.css`, matching the weights actually used: body text, medium
  labels, semibold headings, bold CTA text).

## 5. Shared Components (`web/src/components/ui/`)

- **`Card.jsx`** — `bg-bg-1 rounded-2xl shadow-card p-4` wrapper. Used for
  every list row and every settings group, replacing the ad-hoc
  `bg-bg-1 rounded px-3 py-2` repeated today.
- **`Button.jsx`** — `variant` prop: `primary` (indigo fill, white text —
  today's CTA style), `secondary` (bg-1 fill, text-2 — today's inactive
  toggle style), `ghost` (transparent, text-2 — today's bare text-link
  buttons like "Zurück"). Consolidates the class strings currently
  hand-written per button.
- **`TextInput.jsx`** — the `bg-bg-1 text-text-0 px-3 py-2 rounded`
  input, with a focus-ring state (currently missing entirely — a
  genuine accessibility gap for keyboard/switch-control users).
- **`ToggleRow.jsx`** — promoted out of `Settings.jsx`, restyled as an
  iOS-style switch (rounded track + sliding thumb, using the existing
  indigo accent for the "on" state) instead of a native checkbox.
  Behavior (controlled `checked`/`onChange`) unchanged.
- **`StatusBadge.jsx`** — small pill (`rounded-full px-2 py-0.5 text-xs`)
  colored per status, replacing `Queue.jsx`'s plain colored text. Active
  items additionally render a thin progress bar underneath (existing
  `item.progress` value, just newly visualized).
- **`IconButton.jsx`** — `44×44` touch target wrapping a `lucide-react`
  icon, replacing bare `×` buttons in `Playlists.jsx` and `Settings.jsx`
  (delete playlist, remove proxy) — both a visual and an accessibility
  fix (Apple's minimum touch-target guidance).

Each component is presentational only — no data fetching, no business
logic — so existing screen components keep their current React Query
hooks and mutation logic untouched; only the JSX markup they return
changes.

## 6. Navigation — `BottomTabBar`

`web/src/App.jsx` replaces the top `<nav>` with a new
`web/src/components/BottomTabBar.jsx`:

- Fixed to viewport bottom, four tabs (Home, Queue, Playlists, Settings),
  each a `lucide-react` icon + small label, active tab in indigo.
- `padding-bottom: env(safe-area-inset-bottom)` so it clears the iPhone
  home-indicator area when installed standalone.
- Main content area gets `padding-bottom` sized to the tab bar's height
  so the last item in any scrollable list isn't hidden behind it.
- `TerminalSheet`'s FAB trigger moves from `bottom-6 right-6` to sit
  above the tab bar (`bottom: calc(<tab-bar-height> + 1.5rem + env(safe-area-inset-bottom))`)
  so the two floating elements don't overlap.

## 7. Per-Screen Changes

- **`Home.jsx`**: URL input becomes a `Card`-wrapped `TextInput`; the
  MP3/MP4 toggle becomes a segmented-control pattern built from `Button`
  (`primary` for the active format, `secondary` for the inactive one —
  same as today's classes, just via the shared component); the "Zur
  Queue hinzufügen" CTA becomes a full-width `Button variant="primary"`.
  Platform label (`detectPlatform`) renders as a small `StatusBadge`
  instead of plain text.
- **`Queue.jsx`**: each item becomes a `Card` row; status uses
  `StatusBadge`; active items show a thin progress bar under the title
  using the existing `item.progress` value.
- **`Playlists.jsx`**: saved-playlist rows and entry rows become `Card`s;
  remove/delete actions become `IconButton` (trash icon); the
  select-all/none/filter bar uses `Button variant="ghost"` for
  Alle/Keine.
- **`Settings.jsx`**: each `<section>` becomes a `Card`; `ToggleRow`
  imports the shared component instead of the local one; `TextRow`'s
  inline input is replaced by `TextInput`; the local `ToggleRow`/`TextRow`
  function definitions are deleted from this file (moved, not
  duplicated); proxy-remove and playlist-remove `×` buttons become
  `IconButton`. The API-key section's "Anzeigen"/"Kopieren"/"Neu
  generieren" buttons become `Button` variants; the section's descriptive
  text is updated to reflect that the key is now Shortcuts-only (not
  needed for the web UI itself).
- **`TerminalSheet.jsx`**: Radix `Dialog` structure and log-streaming
  logic are unchanged; header and close button restyled with
  `IconButton`; FAB repositioned per §6.

## 8. Auth Simplification

- **`server/server.js`**: replace the global
  `app.use('/api', requireApiKey);` (line 101) with a scoped mount that
  only guards the Shortcuts endpoints:
  ```js
  app.use('/api/shortcuts', requireApiKey);
  ```
  Every other existing `/api/*` route handler is unchanged — this is
  purely a middleware-mounting change, not a per-route rewrite.
- **`web/src/api/client.js`**: remove `getStoredKey`, `setStoredKey`,
  the `localStorage` key constant, the `Authorization` header
  construction, and the entire `401` → `prompt()` → retry fallback.
  `apiFetch` goes back to a plain `fetch` + JSON-parse + error-throw
  helper, with no auth concern at all.
- **`web/src/screens/Settings.jsx`**: drop the `setStoredKey` import and
  call in `regenerateKey`'s `onSuccess` (dead now that the client no
  longer reads a stored key) — the query-cache update
  (`queryClient.setQueryData(['settings'], ...)`) is untouched, since the
  displayed key still comes from server-side `settings.apiKey`.

## 9. Testing / Verification Plan

No automated test suite exists in this project (consistent with every
prior plan). Verification is manual:

- `npm run build` (in `web/`) succeeds with the new dependencies and
  font import.
- Visual check via `npm run dev` at a phone-sized viewport (browser
  responsive mode, ~390×844): bottom tab bar renders, active tab
  highlights correctly per screen, content isn't clipped behind the tab
  bar, Terminal FAB doesn't overlap the tab bar.
- Each screen's mutations (format toggle, queue add, playlist add/
  remove, settings toggles, proxy add/remove, cookies upload, API-key
  regenerate) still work through the restyled components — behavior
  parity, not just visual parity.
- Auth: with the server running, confirm `/api/settings` (or any other
  non-Shortcuts route) succeeds with **no** `Authorization` header;
  confirm `/api/shortcuts/download` still returns `401` without a valid
  Bearer token and succeeds with one.
- Real iPhone homescreen check (safe-area inset, standalone-mode FAB/tab
  bar placement) is manual, done by the user after merge — same
  sandbox limitation noted in every prior plan.

## 10. Out of Scope

- Light mode / theme toggle.
- Any change to business logic, API contracts, or WebSocket message
  shapes — this is a presentational + auth-scoping rework only.
- Re-introducing i18n (dropped in the production-cutover plan; not
  revisited here).
- Rate limiting or any other replacement protection for the now-open
  `/api/*` routes beyond network-level trust — explicitly accepted as
  this project's security model per the user's decision in §3.
