# Project Memory

## Resumen

Proyecto: `loyola-hockey-matches`

Aplicación híbrida para seguir partidos, clasificaciones y detalle en vivo de los equipos de hockey patines del Loyola. La base sigue conviviendo con servicios legacy de la FVP, pero en esta fase ya tiene un detalle de partido mucho más trabajado, móvil y modular.

## Stack actual

- JavaScript ES modules
- Vite
- Capacitor Android
- HTML/CSS
- jQuery + SignalR clásico para tiempo real
- ESLint con configuración local (`eslint.config.js`)

## Arquitectura observada

- `www/` contiene el frontend fuente.
- `dist/` contiene la build generada y ya debe tratarse como salida no versionada.
- `android/` contiene el proyecto Android de Capacitor.
- `www/core/` contiene arranque, navegación e inicialización.
- `www/components/` contiene renderizado de partidos, clasificación y detalle.
- `www/services.js` concentra acceso a datos remotos y el bus local de eventos de partido.
- `www/styles/components-partido-detalle.css` contiene el estilo del modal de detalle de partido.

## Estado actual del detalle de partido

El detalle de partido ha pasado de ser un archivo monolítico a una estructura más separada, manteniendo la UX estable durante el refactor.

### Módulos actuales del detalle

- `www/components/partidoDetalle.js`
  - coordinador principal del modal
  - navegación interna entre partido y jugador
  - transición entre subviews
  - hidratación de estadísticas de jugador
  - coordinación de SignalR y ciclo de vida del modal
- `www/components/partidoDetalleUtils.js`
  - utilidades base y estado
- `www/components/partidoDetalleAlineaciones.js`
  - render de alineaciones
- `www/components/partidoDetalleEventos.js`
  - render de eventos
- `www/components/partidoDetalleJugadorStats.js`
  - parser de stats, foto, chips, timeline y render histórico del jugador
- `www/components/partidoDetalleJugadorData.js`
  - resolución de jugador y eventos asociados
- `www/components/partidoDetalleJugadorView.js`
  - cabecera compacta de jugador
- `www/components/partidoDetalleRender.js`
  - render base del partido, skeletons, resumen y penaltis
- `www/components/partidoDetalleState.js`
  - actualización de estado del detalle

## Decisiones recientes importantes

- El refactor del detalle de jugador se rehízo de forma conservadora, en cortes pequeños y validados uno a uno.
- Se abortó una extracción demasiado agresiva porque rompía visualmente la subvista de jugador.
- La frontera segura comprobada ha sido:
  - helpers de stats
  - resolución de datos de jugador
  - helpers de presentación de jugador
  - cabecera de jugador
  - render base del partido
  - resumen y penaltis
  - actualización de estado del detalle
- La parte que queda más pegada al coordinador principal es:
  - `renderJugadorSubview`
  - `hydrateJugadorStats`
  - transiciones del modal
  - binding de acordeones
  - carga inicial y subscripción al hub

## Calidad y tooling

- Se añadió `eslint.config.js`.
- Existe script `npm run lint` en `package.json`.
- El lint quedó limpio durante esta fase.
- Se añadió y extendió JSDoc útil en varios módulos clave.

## Git y ficheros generados

- `dist/` no debe versionarse.
- Los temporales tipo `tmp_*.js` tampoco deben versionarse.
- `.gitignore` se corrigió para reflejar esto de forma explícita.
- `package-lock.json` sigue ignorado por decisión actual del repo.

## Riesgos y límites actuales

- Sigue habiendo mezcla entre arquitectura moderna y globals legacy, sobre todo en SignalR.
- `partidoDetalle.js` sigue siendo el núcleo delicado: cualquier corte adicional debe justificarse bien.
- No conviene tocar de golpe navegación, hidratación y transición del detalle de jugador.

## Estado general del proyecto

La base está claramente más sana que al inicio de esta fase:

- detalle de jugador funcional y estable
- botón atrás Android integrado
- shell/skeleton del detalle suavizado
- lint limpio
- README y memoria técnica actualizados
- módulos del detalle ya mucho mejor separados

## Recomendación de trabajo siguiente

1. Seguir reduciendo `partidoDetalle.js` solo si aparece otra frontera realmente clara.
2. Si no, priorizar limpieza, JSDoc y endurecimiento técnico sobre más fragmentación.
3. Mantener validación visual real después de cada iteración del detalle.
