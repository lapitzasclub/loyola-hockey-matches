# worker

Worker Hono que Cloudflare Pages ejecuta en modo avanzado (`dist/_worker.js`, compilado con `vite.worker.config.ts`) solo para `/api/*` y `/connection/*` (`public/_routes.json`). En F6, también el push.

- `rutas.ts`: allowlist tipada de endpoints y parámetros, con la política de caché de cada uno. La usa también el proxy de desarrollo de Vite.
- `cache.ts`: caché en el edge (Cache API); el detalle de partido decide por el estado del acta.
- `limite.ts`: rate limit por IP en memoria; el KV `API_RATE_LIMIT` solo guarda bloqueos.
- `app.ts`: la app Hono (cabeceras, proxy, paso del WebSocket de Centrifugo, assets).
- `index.ts`: punto de entrada.
