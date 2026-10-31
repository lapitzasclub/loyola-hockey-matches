# Deploy en Cloudflare Pages

La web (la PWA, que es el producto de iOS) y su backend van en el mismo proyecto de Pages,
`loyola-hockey-matches`, en **modo avanzado**:

- `dist/` es la SPA de Vite más `sw.js`, `_headers` y `_routes.json`.
- `dist/_worker.js` es el worker Hono de `worker/`, compilado con `vite.worker.config.ts`. Hace de
  proxy con allowlist hacia `fvpatinaje.eus`, caché en el edge, rate limit y paso del WebSocket de
  Centrifugo.
- `_routes.json` hace que solo `/api/*` y `/connection/*` invoquen el worker; lo estático lo sirve
  Pages sin gastar invocaciones.

Las decisiones y los tiempos de caché están en `docs/v2/ROADMAP.md` (sección S11).

## Configuración

Todo está en `wrangler.toml` (`pages_build_output_dir = "dist"`); no hay variables de entorno.

- KV `API_RATE_LIMIT`: guarda solo los bloqueos del rate limit. Si se crea un namespace nuevo,
  actualiza su `id` en `wrangler.toml`.

## Comandos

```bash
npm run cf:dev       # build + wrangler pages dev dist (runtime de Pages en local, puerto 8788)
npm run cf:preview   # build + deploy de la rama v2 → https://v2.loyola-hockey-matches.pages.dev
npm run cf:deploy    # build + deploy de main (producción)
```

Antes de desplegar: `npm run lint`, `npm test`, `npm run build` y `npm run e2e`.

## Verificaciones después del deploy

1. `curl -I <url>/` trae la CSP y `X-Frame-Options: DENY`; `/static/*` es `immutable` y `/sw.js`
   va con `no-cache`.
2. `<url>/api/auth/config` dos veces: la segunda con `x-cache: HIT`.
3. Una ruta fuera de la allowlist (`/api/web/noticias`) da 404.
4. El directo: con un partido en juego, el marcador cambia sin recargar (WebSocket a
   `/connection/websocket`).
5. En Safari de iPhone: «Añadir a pantalla de inicio», abrir la app instalada (sin barra de Safari y
   con la pantalla de arranque) y, en modo avión, que abra con los datos de la última vez.

## Notas

- `.wrangler/` y `dist/` no se versionan.
- `npm run android:sync` quita del APK lo que solo es de Pages (`_worker.js`, `_routes.json`,
  `_headers`, `sw.js`, `splash/`).
