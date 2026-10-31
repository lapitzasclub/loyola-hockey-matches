# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

## Estado del proyecto

Rama `v2`: reescritura de la app (React + TypeScript + Ionic + TanStack Query). La v1 (JS plano, rama `main`) queda como referencia de comportamiento en el worktree `../loyola-hockey-matches-v1`; consúltala para ver cómo se comportaba algo, no para copiar código. El plan completo está en `docs/v2/ROADMAP.md` y las sesiones en `docs/v2/roadmap.json`.

## Comandos

```bash
npm start              # dev server (Vite, puerto 5173), proxy de /api y /connection hacia fvpatinaje.eus
npm run build          # tsc --noEmit + vite build → dist/
npm run serve          # preview del build
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (flat) + prettier --check
npm run format         # prettier --write
npm test               # Vitest (unitarios, junto al código en src/**/*.test.ts(x))
npm run e2e            # Playwright: webkit-iphone y chromium-android (compila y sirve con vite preview)

npm run android:sync   # build + cap sync android
npm run android:run    # android:sync + cap run android (dispositivo o emulador)
npm run android:open   # abre Android Studio

npm run cf:dev         # build + wrangler pages dev dist
npm run cf:deploy      # build + wrangler pages deploy dist
```

Antes de cada commit, sync de Android o deploy: `npm run lint`, `npm test` y `npm run build`. Antes de cerrar una sesión del roadmap, además `npm run e2e`.

En Windows, si `cap run android` falla con «"gradlew" no se reconoce», la causa es la variable de entorno `NoDefaultCurrentDirectoryInExePath=1`: quítala en esa terminal o ejecuta `android\gradlew.bat assembleDebug` y haz `adb install -r` del APK.

## Arquitectura

App híbrida de un solo frontend: PWA en Cloudflare Pages (es el producto de iOS) y app Android con Capacitor 7 (`appId` `com.loyola.hockeymatches`, se mantiene para actualizar la v1).

```
src/
  app/            bootstrap, router (IonReactRouter + tabs), providers, CSS núcleo de Ionic
  domain/         tipos y reglas puras (sin React ni fetch)
  api/            cliente HTTP dual-target, esquemas Zod, mappers API→dominio, fixtures
  queries/        hooks TanStack Query (query keys centralizadas)
  live/           Centrifugo: conexión, suscripciones, reducer de eventos → caché
  features/       una carpeta por pantalla (partidos, clasificacion, equipo, partido, jugador, estadisticas)
  ui/             componentes de diseño compartidos
  i18n/           es.json, eu.json
  styles/         tokens CSS y tema claro/oscuro
worker/           Hono: proxy con allowlist + caché + (F6) push
tests/e2e/        Playwright
android/          proyecto Capacitor (no editar a mano; `npm run android:sync`)
functions/        proxy Cloudflare Pages de la v1, solo como referencia hasta F5
public/           iconos, manifest y assets de marca
```

Cada carpeta de `src/` tiene un README corto con su responsabilidad.

### Reglas de arquitectura

- `domain/` no importa React ni red. La lógica con trampas vive ahí, con tests.
- Las pantallas solo consumen hooks de `queries/`. Nunca `fetch` en componentes.
- Un único punto decide el transporte (directo vs proxy): `api/transport.ts`. Android habla directo con `fvpatinaje.eus`; la web pasa por el proxy `/api/*` de Cloudflare. Nunca llamar a hosts externos directamente desde el runtime web.
- El directo (Centrifugo) solo escribe en la caché de TanStack Query (`setQueryData`/`invalidateQueries`); las pantallas no saben que existe.
- Las features no se importan entre sí; lo compartido sube a `ui/`, `domain/` o `queries/`.
- Animar solo `transform` y `opacity`, y respetar `prefers-reduced-motion`.
- Las trampas conocidas de la API (estados, `resultado`, `periodo`, roles…) están en la sección 5 del ROADMAP y deben tener test.

## Convenciones

- Un único UI kit: Ionic. Usa el modo `ios` en iPhone y web, y `md` en Android para que tenga aspecto de Android. Lo decide `modoIonic()` en `ui/plataforma.ts`, que usan `setupIonicReact` en `app/Providers.tsx` y `Pagina`. El estilo fundido es el mismo en los dos modos: los ajustes de `md` van bajo `.md` en `styles/componentes.css`. Nada de otras librerías de componentes; lo que Ionic no traiga se construye en `ui/` sobre sus componentes y tokens.
- TypeScript `strict` (con `noUncheckedIndexedAccess`); `import type` para tipos.
- Todo texto visible usa `t(...)` de i18next; `es.json` y `eu.json` deben tener las mismas claves (hay test).
- Los colores de tema por modo se definen bajo `body[data-theme="light"]` / `body[data-theme="dark"]`, no en `:root` global.
- Ordenar partidos por `fecha` + `hora`, nunca por orden de jornada (aplazados).
- Comentarios y JSDoc en español, solo donde el porqué no sea evidente.
- Prettier manda en el formato (`npm run format`); los `.md` no se formatean.
- No versionados: `dist/`, `.wrangler/`, `playwright-report/`, `test-results/`, `tmp_*.js`.

## Protocolo de roadmap (sesiones con Claude Code)

- El hook `SessionStart` (`.claude/hooks/roadmap.mjs`, cableado en `.claude/settings.json`) muestra la sesión actual: modelo, esfuerzo y prompt inicial. Antes de pegar el prompt: `/model` y `/effort` según indique.
- Al empezar: `node .claude/hooks/roadmap.mjs start SXX`. Al cumplir los criterios de salida: `node .claude/hooks/roadmap.mjs done SXX`.
- Tras marcar una sesión como hecha, el hook `Stop` avisa una vez de la siguiente; conviene abrir sesión nueva (`/clear`).
- `node .claude/hooks/roadmap.mjs status` muestra la tabla y `next` el prompt de la siguiente.
- Si una sesión crece demasiado, se parte añadiendo `SXXb` en `roadmap.json`.
- No marcar una sesión como hecha con criterios de salida sin verificar.
