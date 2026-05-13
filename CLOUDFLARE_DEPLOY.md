# Deploy en Cloudflare Pages

## Opción recomendada

Usar **Cloudflare Pages** para servir la SPA y **Pages Functions** para el backend `/api/*` y `/signalr/*`.

## Build de Pages

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: dejar la del repo si este proyecto se despliega desde su propio repositorio

## Variables de entorno

### `PUBLIC_APP_ORIGIN`
Dominio público exacto de la app.

Ejemplos:

```text
https://loyola-hockey-matches.pages.dev
```

si más adelante usas dominio propio:

```text
https://hockey.loyola.example.com
```

### `SIGNALR_UPSTREAM_BASE`
Base del servicio legacy de SignalR permitida por el proxy.

```text
https://digitalsport.online/signalr
```

## KV para rate limiting

Crear un KV namespace y enlazarlo como:

```text
API_RATE_LIMIT
```

Después actualiza `wrangler.toml` con los ids reales:

```toml
[[kv_namespaces]]
binding = "API_RATE_LIMIT"
id = "<production-kv-id>"
preview_id = "<preview-kv-id>"
```

## Pasos concretos en Cloudflare Dashboard

1. Ir a **Workers & Pages**.
2. Crear proyecto **Pages**.
3. Conectar el repositorio o hacer deploy manual.
4. Configurar:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. En **Settings > Environment variables** añadir:
   - `PUBLIC_APP_ORIGIN`
   - `SIGNALR_UPSTREAM_BASE`
6. En **Settings > Functions > KV namespace bindings** enlazar:
   - `API_RATE_LIMIT`
7. Lanzar el deploy.

## Deploy manual con Wrangler

### Preview local Pages Functions
```bash
npx wrangler pages dev dist
```

### Deploy
```bash
npx wrangler pages deploy dist
```

## Verificaciones después del deploy

1. Abrir la URL pública.
2. Comprobar que carga selector de equipos.
3. Verificar llamadas a:
   - `/api/GetCompeticiones`
   - `/api/GetParametrosCompeticion`
   - `/api/GetCalendarioCompeticion`
   - `/api/GetClasificacionCompeticion`
   - `/api/GetParametrosPartido`
   - `/api/GetEstadisticaPartido`
   - `/api/GetEstadisticasJugador`
4. Verificar que `/signalr/hubs` responde.
5. Abrir un partido y confirmar que el realtime entra.
6. Probar en Safari iPhone y Android Chrome.

## Notas operativas

- `.wrangler/` es local, no debe versionarse.
- `dist/` es salida de build, no debe versionarse.
- Si cambias a dominio propio, actualiza `PUBLIC_APP_ORIGIN`.

## Nota importante sobre realtime

El bootstrap y las rutas HTTP de SignalR se sirven desde tu dominio, pero el backend realtime sigue siendo legacy.
Si el servicio upstream limita origen o transporte, podría hacer falta una iteración extra específica del canal SignalR en producción pública.
