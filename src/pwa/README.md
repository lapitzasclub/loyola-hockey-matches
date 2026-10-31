# pwa

Service worker de la web de producción (no en desarrollo ni en Android).

- `sw.ts`: precache del shell y de los ficheros con hash del build (la lista la inyecta `vite.config.ts`), shell en cualquier navegación, copia de escudos y fotos para verlos sin conexión. No toca `/api`: los datos sin conexión los da la caché persistida de TanStack Query.
- `estrategias.ts`: qué hace con cada petición y qué cachés sobran al actualizar (puro, con tests).
- `registro.ts`: registro, búsqueda de versión nueva al volver a la app y recarga al ocultarla.
