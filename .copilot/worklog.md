# Worklog

## 2026-05-09

- Se analizó la estructura general del proyecto.
- Se confirmó que el proyecto usa Vite + Capacitor Android + JS modular con restos legacy.
- Se verificó que `npm run build` funciona.
- Se detectó un bug en `www/components/clasificacion.js` por uso de `currKey` sin definir.
- Se detectó fragilidad en la integración de SignalR por dependencia de globals y scripts externos.
- Se creó la carpeta `.copilot` como memoria interna del proyecto.
- Se detectó un bug funcional en el scroll automático: partidos aplazados o suspendidos sin resultado podían marcarse como próximo partido.
- Se corrigió la lógica de `getProximoPartidoIdx()` para priorizar el primer partido de hoy o futuro, evitando que partidos pasados sin cerrar roben el foco.
- Se detectó un bug en la exportación ICS: los eventos no usaban la hora real del partido y caían siempre en el rango 12:00-14:00.
- Se corrigió la generación temporal de ICS para usar `p.Hora` cuando exista y mantener un fallback razonable si falta.
- Se detectó que en desarrollo local web SignalR intenta negociar contra `digitalsport.online` y falla por CORS, generando ruido continuo en consola.
- Se ajustó temporalmente la inicialización para desactivar SignalR en `localhost` web y evitar reconexiones inútiles durante desarrollo local.
- Después se recondujo el enfoque para permitir SignalR en web dev mediante proxy de Vite, cargando `/signalr/hubs` dinámicamente y apuntando el hub a `/signalr` en local.
- Se detectó que el detalle del partido sí recibía datos de API y se unía a SignalR, pero el render fallaba por un parseo incompleto de las respuestas reales (`getPartido` y `getEstadisticaPartido`).
- Se corrigió el parseo base del detalle para aceptar la forma real del payload devuelto por la API.
- Se reforzó la UI del modal de detalle para asegurar contraste y visibilidad del header.
- Cuando la API de estadísticas no trae `eventos` detallados pero sí `stats`, se reutilizan esos datos como fallback visible en la pestaña de eventos.
- Se añadieron trazas defensivas al modal de detalle para diagnosticar si el header se sobreescribe o si el problema es de renderizado final en DOM.
- Se integró la pantalla de detalle de partido con el sistema global de tema claro/oscuro, moviendo su estilo a `www/styles/components-partido-detalle.css`.
- Se rehízo `www/components/partidoDetalle.js` para aproximar el detalle real de `competicion.js`: resumen, alineaciones por equipo, porteros, cuerpo técnico, eventos enriquecidos y penaltis por lado.
