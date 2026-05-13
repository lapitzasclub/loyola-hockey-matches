# Web release checklist

## Antes del deploy

- [ ] `npm install`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] probar localmente en `npm start` o `npm run cf:dev`
- [ ] comprobar carga de equipos
- [ ] comprobar calendario
- [ ] comprobar clasificación
- [ ] comprobar detalle de partido
- [ ] comprobar `GET /signalr/hubs`

## Configuración Cloudflare

- [ ] proyecto Pages conectado o deploy con Wrangler
- [ ] `PUBLIC_APP_ORIGIN` configurado
- [ ] `SIGNALR_UPSTREAM_BASE` configurado
- [ ] KV `API_RATE_LIMIT` enlazado
- [ ] `wrangler.toml` actualizado con ids reales si aplica

## Pruebas post deploy

- [ ] abrir URL pública en escritorio
- [ ] abrir URL pública en Android Chrome
- [ ] abrir URL pública en Safari iPhone
- [ ] verificar que no hay llamadas frontend directas a FVP
- [ ] verificar respuestas correctas en `/api/*`
- [ ] verificar comportamiento de realtime si hay partido en vivo

## Limitación conocida

El punto más sensible sigue siendo el canal realtime legacy. Si algo falla en producción web, lo primero a revisar será SignalR y no el proxy ASMX principal.
