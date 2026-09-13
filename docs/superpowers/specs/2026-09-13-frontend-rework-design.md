# yt-dlp-web Frontend Rework — Design Spec

Date: 2026-09-13
Status: Approved by user (conversational), pending written-spec review

## 1. Summary

Full UI/UX rework of the yt-dlp-web frontend. Goal: a downloader that is
trivially simple for a non-technical user on the happy path (paste URL,
pick format, download), while every advanced yt-dlp capability the backend
already supports (or is being extended to support) stays one click away —
never buried in a settings maze. Adds PWA installability (iPhone home
screen + desktop), a floating/collapsible terminal instead of an
always-visible log panel, automatic source-platform detection
(YouTube/Shorts/Instagram/TikTok/generic) that adapts which controls are
shown, and a formal API-key-protected HTTP API so external tools (iOS
Shortcuts, share-sheet automations, Tasker, etc.) can queue downloads.

Design references: [autobrr/qui](https://github.com/autobrr/qui) (React +
Radix/shadcn + Tailwind + TanStack Query + Motion + cmdk stack, dashboard
IA, dark theme) and Hyperplexed (YouTube channel; front-end
micro-interaction / glassmorphism aesthetic).

## 2. Current State (baseline)

- Backend: `server/server.js` — Express + `ws`, single-process yt-dlp
  spawning, sequential FIFO download queue (`downloadQueue`/`queueItems`),
  settings persisted to `/data/settings.json`, cookies file support,
  proxy support, custom yt-dlp args, an existing (unauthenticated)
  `/api/download`, `/api/queue`, `/api/languages`, `/api/playlist-info`,
  `/api/shortcuts/*` HTTP surface, and WebSocket broadcast (`terminal`,
  `queue-update`, `download-complete`) at `/ws`.
- Frontend: `public/` — vanilla JS ES modules (`app.js` +
  `modules/*.js`), hand-written dark theme in `styles.css` (already has a
  tuned, AA-contrast-checked color token system under `:root`), a
  split-pane layout with the terminal permanently visible on the right,
  tab bar (Queue / YouTube playlists), a Settings modal, a language/subtitle
  picker modal, i18n module supporting `de`/`en` (default `de`).
- No authentication anywhere. Assumed reachable only because it's
  self-hosted on a private network today; the PWA/mobile use case changes
  that assumption (see §6).

## 3. Decisions Made

These were resolved via clarifying questions before design and are not
open for re-litigation without explicit user request:

| Decision | Choice |
|---|---|
| Frontend stack | Full rewrite: React 19 + Vite + Tailwind + Radix/shadcn + TanStack Query + Motion + Sonner + cmdk (matches qui) |
| Terminal trigger | Floating button, bottom-right, shows live progress ring while a download is active; click opens log as a side panel (desktop) / bottom sheet (mobile) |
| Network exposure | LAN/VPN only (e.g. Tailscale) — no login screen |
| API protection | Single generated API key (Bearer token) protecting all `/api/*` endpoints |
| Multi-platform URLs | Auto-detected client-side; UI hides controls that don't apply to the detected platform |
| Queue concurrency | Stays sequential (one yt-dlp process at a time) |
| Theme | Dark mode only, no light-mode toggle |

## 4. Information Architecture

Single-page app, client-side view switching (no full reloads):

- **Desktop:** slim left sidebar — Home / Queue / Playlists icons, Settings
  gear pinned at the bottom — plus a main content area. Sidebar collapses
  to icon-only under a width breakpoint.
- **Mobile / PWA (iPhone):** bottom tab bar — Home / Queue / Playlists —
  with Settings reached via a gear icon in the top bar, matching iOS app
  conventions.
- Same component tree for both; layout switches via breakpoint/container
  query, not a separate mobile build.

### Home screen
1. URL input. On paste/input, runs client-side platform detection (§7) and
   shows a platform icon + label next to the field.
2. Format quick-pick: big Audio (MP3) / Video (MP4) buttons.
3. **Advanced** — a collapsible strip directly below the format pick
   (never a modal), collapsed by default, expansion state remembered.
   Contents adapt to detected platform:
   - Always available: quality, MKV-container toggle (new — see §8),
     embed-thumbnail, speed limit.
   - YouTube-only: subtitle language picker, audio-track language picker,
     playlist detection/expansion.
   - Instagram/TikTok/generic: format + quality only, everything
     YouTube-specific hidden rather than shown-and-useless.
4. **Add to Queue** button.
5. A `cmdk`-powered quick-add (⌘K / Ctrl+K anywhere in the app): paste a
   URL, hit Enter, it's queued with current defaults — power-user path
   that never requires leaving the keyboard.

### Queue screen
Existing pending/active/done/error list, restyled with Motion-animated
add/remove/reorder (replacing the current manual drag-class CSS), per-item
retry, same underlying data contract as today (`queue-update` WS event).

### Playlists screen
Existing saved/custom YouTube playlist management, functionally unchanged.

### Terminal
Not a screen — floating button per §3. Opens the raw yt-dlp/log stream
(current `terminal` WS event) in a `Sheet` (Radix), side on desktop /
bottom on mobile. Progress ring on the button itself reflects the active
item's `progress` field from `queue-update` while closed.

### Settings
Desktop: a routed panel. Mobile: a `Sheet`. Holds global, non-per-download
settings: proxy list, custom yt-dlp args, cookies upload/status, Deno JS
runtime toggle, verbose logging, app language, download delay,
skip-existing, and the API key (§6) with a regenerate button and a
copy-paste curl example.

## 5. Visual Design System

- Reuse the existing CSS custom-property palette (`--c-bg-0/1/2`, text
  tiers, accent colors) verbatim as Tailwind theme tokens — it's already
  tuned and AA-contrast-checked; no new palette invented.
- Depth via **subtle** glass: `backdrop-blur` + translucent border on
  cards (queue items, the advanced strip, the terminal sheet) — used
  sparingly, not on every surface.
- Motion with purpose via `motion`: format-button spring-on-select, queue
  item enter/exit/reorder animation, smooth (non-jumpy) progress-ring
  interpolation. No decorative animation beyond that.
- One accent per state, not per element: `--c-indigo` for primary
  actions; `--c-success` / `--c-danger` / `--c-amber` reserved strictly
  for queue status dots.
- Typography: system-ui stack (Inter fallback) replacing the current
  Segoe UI stack for body text; monospace retained for the terminal.
- Components: Radix/shadcn primitives — `Dialog` (language/subtitle
  picker), `Sheet` (terminal; Settings on mobile), `Command` (cmdk
  quick-add), `Sonner` (replacing the current toast module).

## 6. API & Auth

- On first run (or on demand), the server generates a random API key,
  persisted in `settings.json`, shown in Settings with a regenerate
  action and a ready-to-copy `curl` example.
- New Express middleware checks `Authorization: Bearer <key>` on every
  `/api/*` route (mutating and read). The web UI stores the key (browser
  storage) after first entry/load and attaches it automatically.
- `/api/shortcuts/*` endpoints fold into the same check — the iOS
  Shortcuts action adds the header.
- Scope stays a single shared key (single-user, LAN/VPN-only tool per
  §3) — no per-user accounts, no login page.

## 7. Platform Detection

Pure client-side function, URL → `{ platform, icon, capabilities }`:

| Pattern | Platform | Capabilities shown |
|---|---|---|
| `youtube.com/watch`, `/shorts/`, `youtu.be` | YouTube | full: quality, subtitles, multi-audio, MKV, playlist |
| `instagram.com/reel`, `/p/`, `/tv/` | Instagram | format + quality only |
| `tiktok.com/...` | TikTok | format + quality only |
| anything else | Generic | format + quality only |

This mapping only controls which UI controls render — the backend keeps
accepting any URL yt-dlp itself supports, unchanged. No server-side
platform branching is introduced.

## 8. Backend Changes

The rewrite is frontend-only; backend changes are additive, not a
rewrite:

1. API-key middleware (§6) on `/api/*`.
2. Serve the built Vite bundle (`web/dist`) instead of `public/` via
   `express.static`.
3. New explicit MKV-container toggle in settings/request payload,
   plumbed into `buildDownloadArgs`: currently MKV only happens as a
   side-effect of `subtitlesEnabled` on MP4; expose it as its own
   independent switch so a user can force an MKV container without
   subtitles/multi-audio being involved. When subtitles or multi-audio
   *are* enabled, MKV stays forced regardless of the toggle's state, as
   today — embedding subtitles requires it — so the toggle only has an
   effect while both are off.
4. Everything else — queue engine, sequential processing, yt-dlp arg
   building, WS broadcast shape, settings persistence, cookies, proxy,
   shortcuts jobs — stays as-is. No behavior change to existing endpoints
   beyond the auth check and the new MKV field.

## 9. PWA & Responsive

- `manifest.json`: name, icon set (including iOS-required sizes),
  `display: standalone`, theme/background colors from the existing
  palette. Apple-specific meta tags already partly present in
  `index.html` carry over/get completed.
- Service worker scope is deliberately narrow: cache built JS/CSS/fonts
  for instant reloads plus an offline fallback screen. It does **not**
  attempt offline downloading — the queue only exists on the server, and
  pretending otherwise invites a stale-cache/sync-conflict trap.
- Responsive via Tailwind breakpoints + container queries for the
  sidebar↔bottom-tab-bar switch and the advanced-strip column count. One
  component tree, no separate mobile build.

## 10. Migration Plan

1. New `web/` directory: Vite + React 19 + Tailwind + Radix/shadcn +
   TanStack Query + Motion + Sonner + cmdk.
2. `server/server.js`: add API-key middleware, add MKV toggle handling,
   switch static serving to `web/dist`. No other backend restructuring.
3. `docker-compose.yml` / `Dockerfile`: add a Vite build stage
   (multi-stage build) so the container still ships one static bundle +
   the Node server; `docker-compose up` behavior is unchanged for the
   end user.
4. i18n (`de`/`en`, default `de`) carries over as a JSON dictionary + hook
   in the new stack, preserving current default behavior.
5. Old `public/` is deleted once the new UI reaches feature parity (fully
   recoverable via git history; not deleted before parity is confirmed).

## 11. Testing / Verification Plan

No existing automated test suite for this project; verification is
manual and concrete:

- Paste each URL type (YouTube video, Shorts, playlist, Instagram,
  TikTok) → confirm the correct capability set renders.
- Run one real MP3 download, one MP4, one MKV+subtitles+multi-audio, and
  one queue-of-3 end-to-end against real yt-dlp.
- Confirm an unauthenticated `curl` against `/api/download` is rejected;
  confirm the UI's stored key round-trips correctly after regenerating
  the key in Settings.
- Confirm the PWA installs correctly and reads well on an actual iPhone
  (or Safari responsive mode) and at a typical desktop width.
- Confirm the floating terminal button's progress ring tracks real
  `queue-update` progress, and that opening/closing it doesn't drop any
  buffered log lines.

## 12. Out of Scope

- Parallel/concurrent downloads (queue stays sequential, per §3).
- Light mode / theme toggle.
- Multi-user accounts or a login page (single shared API key only).
- Any server-side special-casing per platform beyond what yt-dlp already
  handles — platform detection is a UI-only concern (§7).
