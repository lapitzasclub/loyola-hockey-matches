# Changelog

## 2.0.1 — 2026-11-02

Pulido de interfaz tras la 2.0.0: tarjetas de partido, jornadas, ficha de jugador y pull-to-refresh.
(`versionCode` 21.)

### Novedades

- Ficha de jugador rehecha: cabecera centrada, totales en cifras grandes y enlace a la ficha de su
  equipo (se deduce de sus partidos y de los calendarios de su competición).
- Tarjetas de partido en estilo fundido, sin fondo propio, como en la v1.
- Próximo partido destacado con panel propio y etiqueta rellena.
- Hoja de jornada más legible y enlaces a la ficha de cada equipo desde el detalle del partido.
- Suscripción al calendario desde Google Calendar en el móvil: copia la URL y explica los pasos.
- Pull-to-refresh «desgarrado» propio, con tope de recorrido, sombras cortas y vibración en Android.

### Correcciones

- Al soltar el pull-to-refresh con ratón, la tarjeta de debajo ya no se abre.
- Los partidos de la clasificación se agrupan por fase y grupo con nombres legibles.

## 2.0.0 — 2026-10-31

Reescritura completa de la app (React + TypeScript + Ionic + TanStack Query) sobre la API nueva de
fvpatinaje.eus. Mantiene el `appId` `com.loyola.hockeymatches` y la firma, así que actualiza la v1
(`versionCode` 20, la v1 era 19).

### Novedades

- Una sola base de código: PWA en Cloudflare Pages (producto de iPhone) y app Android con Capacitor 8.
- Directo con Centrifugo: marcador, incidencias y reloj del periodo en tiempo real, sin recargar.
- Detalle de partido con resumen, eventos, alineaciones, tanda de penaltis y cuerpo técnico.
- Detalle de equipo (resumen, partidos, plantilla, estadísticas), ficha de jugador con gráfica y
  pestaña de estadísticas con rankings de goleadores.
- Clasificación por fase y grupo con racha V/E/D.
- Aspecto de Android en Android (modo `md` de Ionic) y de iOS en iPhone/web; estilo fundido con
  barras del sistema del color del fondo.
- Transiciones compartidas entre lista y detalle, skeletons, confeti en la primera victoria del Loyola.
- La jornada abre la lista de partidos de esa jornada; la pista abre su ubicación en el mapa.
- Suscripción al calendario `.ics` del equipo.
- Caché persistida en IndexedDB: arranque rápido y datos disponibles sin conexión.
- Worker de Cloudflare con allowlist, caché en el edge y rate limit; la web nunca llama directamente
  a `fvpatinaje.eus`.
- Español y euskera.

### Cambios técnicos

- Android sube a Capacitor 8 con `targetSdk` 36 y se elimina el trust-all de certificados.
- Android habla directo con `fvpatinaje.eus`; la web, por el proxy `/api/*`.

### Pendiente

- Notificaciones push de goles (F6, S13).
