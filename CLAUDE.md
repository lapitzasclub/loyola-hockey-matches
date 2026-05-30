# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start           # dev server (Vite, port 5173), proxies /api/* and /signalr/*
npm run build       # production build → dist/
npm run serve       # preview local build
npm run lint        # ESLint on www/**/*.js (must pass before committing)

npm run android:sync   # build + cap sync android (sync web assets to Capacitor)
npm run android:run    # android:sync + cap run android (deploy to connected device)
npm run android:open   # open Android Studio

npm run cf:dev      # build + wrangler pages dev dist (Cloudflare runtime locally)
npm run cf:deploy   # build + wrangler pages deploy dist
```

Run `npm run lint` and `npm run build` before every commit, Android sync, or Cloudflare deploy.

## Architecture

This is a **dual-target hybrid app**: a single shared frontend (`www/`) that runs as both an Android Capacitor app and a web SPA on Cloudflare Pages.

### Source layout

- `www/` — all frontend source (**Vite root** — all module imports resolve from here, not the project root)
  - `core/` — app bootstrap, navigation, SignalR init, pull-to-refresh, back-button coordination
  - `components/` — all UI rendering (matches, standings, team selector, match detail, player detail)
  - `config/runtime.js` — **single source of truth for runtime target detection**
  - `services.js` — data access boundary: legacy FVP endpoints, SignalR hub bus
  - `servicesCompetitionCatalog.js` — Loyola competition catalog, in-memory cache, team aggregation
  - `servicesShared.js` — shared transport constants (FVP base URL, headers)
  - `state/equipos.js` — selected team and Loyola teams state
  - `utils/` — helpers, calendar, env detection, API cache, standings helpers
  - `styles/` — per-component CSS + `theme.css` (accordion/tab tokens)
  - `i18n.js` — all visible text; use `t(...)` for any user-facing string
- `functions/` — Cloudflare Pages Functions (backend proxy)
  - `api/` — closed allowlist proxy to FVP ASMX legacy endpoints
  - `signalr/[[route]].js` — full SignalR proxy for web runtime
- `android/` — Capacitor Android project (do not edit directly; sync via `npm run android:sync`)
- `dist/` — generated build output, not versioned

### Dual-target network policy

This is the most critical invariant in the codebase. All transport decisions must go through `www/config/runtime.js`:

| Runtime | FVP API | SignalR |
|---|---|---|
| `android-native` | Direct ASMX (`getLegacyApiMode() === 'direct'`) | Direct `digitalsport.online` |
| `web` | Via `/api/*` proxy | Via `/signalr/*` proxy |

**Never** call external hosts directly from new web-runtime code. Any new data access must check `getLegacyApiMode()`. A common past bug: a helper used `getAppApiUrl()` instead of `getLegacyApiMode()`, which forced Android through Cloudflare.

When touching network code, validate all four scenarios: team selector, calendar/standings, match detail, and both Android and web runtimes.

The FVP ASMX endpoints exposed by the Cloudflare proxy (closed allowlist):
- `GetCompeticiones`, `GetParametrosCompeticion`
- `GetCalendarioCompeticion`, `GetClasificacionCompeticion`
- `GetParametrosPartido`, `GetEstadisticaPartido`, `GetEstadisticasJugador`

### SignalR bus architecture

SignalR event handlers are registered **globally at startup** in `www/core/main.js` (not inside the match detail component). They forward all hub events onto an internal bus via `emitPartidoHubEvent()` in `www/services.js`. The match detail subscribes via `subscribePartidoHubEvents()` and filters by `idPartido`. This split was made deliberately after discovering that late registration of handlers inside the modal caused missed initial events (`recibirEventosIniciales`, etc.). Do not move handler registration back into the modal.

### Match detail module map

`www/components/partidoDetalle.js` is the main coordinator for the match modal. It has been progressively split — do not add logic here; extract to existing satellite modules instead:

- `partidoDetalleRenderCoordinator.js` — orchestrates main modal render
- `partidoDetalleState.js` — state update and normalization
- `partidoDetalleRender.js` — base render, skeletons, summary, penalties
- `partidoDetalleAlineaciones.js` / `partidoDetalleEventos.js` — lineups and events
- `partidoDetalleJugadorSubview.js` — player subview + stats hydration
- `partidoDetalleJugadorData.js` / `partidoDetalleJugadorView.js` / `partidoDetalleJugadorStats.js` — player data, compact header, stats render
- `partidoDetallePlayerLinks.js` — click bindings that trigger player navigation
- **Note:** navigation into coaching staff (`cuerpo técnico`) from lineups is intentionally disabled — that player subview is broken upstream.
- `partidoDetalleNavigation.js` — internal navigation between team/match/player views
- `partidoDetalleTabs.js` + `uiTabs.js` — shared tab system (also used by team detail)

### Team detail module map

- `equipoDetalle.js` — team summary, match list render
- `equipoDetalleSubview.js` — integrated subview inside shared modal
- `equipoDetalleRoster.js` / `equipoDetalleStats.js` / `equipoDetalleLineupsHub.js`
- `detalleModalShell.js` — shared modal shell for both team and match detail

### Shared modal navigation

The shared modal (`detalleModalShell.js`) hosts three views: `equipo`, `partido`, `jugador`. Navigation flows: `clasificación → equipo → partido → jugador → partido → equipo`. Back button coordination (web and Android native) is in `www/core/mobileBackCoordinator.js`.

### Accordion component

All accordions (team selector, standings groups, player stats) share `www/components/accordion.js` using `details/summary` elements. CSS tokens for accordion geometry/color live in `www/styles/theme.css`.

## Conventions

- All visible text must use `t(...)` from `www/i18n.js`.
- JSDoc in Spanish on public functions; only where the `why` is non-obvious.
- Prefer `globalThis` over `window` when touching newer or shared code.
- Match and standings ordering must use `Fecha` + `Hora` (not `Orden`) to handle rescheduled/postponed matches correctly — see `www/utils/helpers.js` for the canonical comparator.
- CSS scoping bugs have bitten before: define theme variables under `body[data-theme="light"]` / `body[data-theme="dark"]`, not globally.
- `dist/`, `.wrangler/`, and `tmp_*.js` are not versioned.

## Vite dev proxy

`vite.config.js` proxies `/api/*` → FVP ASMX and `/signalr/*` → `digitalsport.online/signalr` during local dev. It also runs a plugin to copy `www/assets/sidebar-loyola/` → `dist/assets/sidebar-loyola/` at build time (Capacitor needs these assets without a manual duplicate in `www/public/`).
