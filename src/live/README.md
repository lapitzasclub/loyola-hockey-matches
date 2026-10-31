# live

Directo con Centrifugo. Solo escribe en la caché de TanStack Query: las pantallas no saben que existe.

- `conexion.ts`: config de `/api/auth/config`, token público y sub-token por canal `acta_${id}`. La URL del WebSocket la decide `api/transport.ts` (directa en Android, por el proxy en web).
- `gestor.ts`: sigue los detalles de partido de la caché que están vivos hoy, se suscribe y se da de baja con sus observadores, suspende la conexión en segundo plano, pide el detalle cuando el reducer no basta y superpone `/public/partidos/marcadores` a las listas.
- `reducer.ts`: puro; aplica un mensaje al detalle del partido y dice si hay que pedirlo entero y si ha sido gol.
- `index.ts`: lo engancha a la app (ciclo de vida de Capacitor, vibración del gol en Android).
- `fixtures/`: partidos reales grabados para `reducer.grabado.test.ts`. Se regeneran con `npm run directo:grabar` y `npm run directo:fixtures` (ver `scripts/`).
