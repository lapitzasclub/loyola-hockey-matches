# Deploy en Cloudflare Pages

## Build

- Build command: `npm run build`
- Build output: `dist`

## Variables de entorno

### `PUBLIC_APP_ORIGIN`
Dominio público exacto de la app.

Ejemplo:

```text
https://loyola-hockey-matches.pages.dev
```

### `SIGNALR_UPSTREAM_BASE`
Base del servicio legacy de SignalR permitida por el proxy.

Ejemplo:

```text
https://digitalsport.online/signalr
```

## KV para rate limiting

Crear un KV namespace y enlazarlo como:

```text
API_RATE_LIMIT
```

Actualizar `wrangler.toml` con los ids reales.

## Comandos útiles

### Preview local Pages Functions
```bash
npx wrangler pages dev dist
```

### Deploy con Wrangler
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
4. Verificar que `GET /signalr/hubs` responde.
5. Probar en Safari iPhone y Android Chrome.

## Nota importante sobre realtime

El bootstrap del hub se sirve desde tu dominio, pero el backend realtime sigue siendo legacy.
Si el servicio upstream limita origen o transporte, puede requerir una iteración extra específica del canal SignalR.
