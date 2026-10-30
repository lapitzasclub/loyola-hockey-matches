# api

Único lugar que conoce la forma de la API.

- `transport.ts`: único punto que decide cómo se llega a la API. Android (Capacitor) va directo a `fvpatinaje.eus` con `CapacitorHttp`; la web, por el proxy `/api` del mismo origen (Vite en desarrollo, `functions/api` en Cloudflare). Normaliza los fallos en `ErrorApi` y decide qué se reintenta (`esReintentable`). ESLint prohíbe `fetch` fuera de este fichero.
- `cliente.ts`: una función por recurso que valida con Zod (`ErrorContrato` si la API cambia de forma) y devuelve tipos de `domain/`. `catalogo()` monta los equipos Loyola en tres rondas.
- `schemas/`, `mappers/`: contrato de la API y conversión a dominio.
- `fixtures/`: respuestas reales capturadas; `fixtures/transporte.ts` las sirve como si fuera la API para los tests.
