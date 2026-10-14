# Clasificación y tratamiento de errores — diseño

Fecha: 2026-10-14
Estado: aprobado para plan de implementación

## Contexto y problema

El manejo de errores actual es inconsistente:

- **Overlay duro "Ups"** (`state/errorOverlay.js`, `mostrarPantallaErrorGlobal`) se dispara únicamente si falla la carga del catálogo de equipos en el arranque (`state/equipos.js:101`). Cualquier fallo ahí —de red transitorio o real— muestra siempre la pantalla completa, sin reintento previo.
- **Texto crudo de error** (`<li>${t("error", msg)}</li>`, mensaje técnico sin traducir) en `core/init.js`, `core/pullToRefresh.js`, `core/teamSelectorFlow.js`.
- **Tarjeta de error reutilizable** (`components/loadingStates.js`, `renderErrorState`) ya existe pero sin botón de reintento y con el mismo texto crudo; solo se usa en `partidos.js` y `clasificacion.js`.
- **Fallos silenciosos correctos** (`console.warn` sin UI) en todo lo relacionado con Realtime/Centrifugo.
- **Error por-ítem aislado** en la ficha de jugador (`jugador.error`), tratado de forma ad hoc.
- **Resiliencia parcial** en el catálogo de competiciones: si una competición falla, se descarta esa sola (`servicesCompetitionCatalog.js:106-109`), pero sin ningún aviso al usuario.
- `pullToRefresh.js` y `teamSelectorFlow.js` borran la lista a un *skeleton* **antes** de pedir los datos nuevos, así que si la petición falla no queda contenido previo que preservar.

Objetivo: un criterio compartido de clasificación de errores (duro / recuperable-en-sección / blando) con un tratamiento visual coherente, mobile-first, usando el lenguaje visual y los temas ya existentes de la app, con animaciones cuidadas (efecto "wow" sin salirse de la línea plana).

## Clasificación (3 niveles)

1. **🔴 Duro** — la app no puede arrancar con nada que mostrar (falla el catálogo de equipos en el arranque, sin caché ni selección previa). Tratamiento: pantalla completa (overlay existente).
2. **🟡 Recuperable en sección** — el usuario espera ver contenido de una vista concreta y no hay nada previo que mostrar (primera carga de esa sección: partidos, clasificación, ficha de jugador). Tratamiento: tarjeta de error inline dentro de la sección, con botón "Reintentar".
3. **🟢 Blando/informativo** — una actualización en segundo plano falla pero ya hay contenido en pantalla (pull-to-refresh, una competición suelta del catálogo, reconexión de Realtime). Tratamiento: toast no bloqueante; se conserva el contenido existente, no se borra.

El criterio decisivo para elegir entre 🟡 y 🟢 no es "qué tan grave es el error" sino **si ya hay contenido visible que se perdería al tratarlo como 🟡** (skeleton/vacío → 🟡; contenido previo real → 🟢).

## Reintentos

- 🔴 y 🟡: 1 reintento automático y silencioso (`withRetry`, ~900 ms de espera) antes de mostrar cualquier UI de error. Si ese reintento falla, se muestra overlay (🔴) o tarjeta con botón manual (🟡).
- 🟢: 2 reintentos automáticos con backoff corto; si siguen fallando, se conserva el contenido anterior y se informa vía toast (sin botón de reintento visible — el próximo refresco natural ya lo reintentará).
- Excepción: Realtime/Centrifugo no sigue esta regla de "1 reintento y escalar" porque reconecta solo de forma continua; solo se emite toast si la conexión inicial falla por completo (no en cada parpadeo de reconexión).

## Diseño visual

Basado en los tokens y animaciones ya existentes (`styles/theme.css`, fichero de cada componente), sin introducir un lenguaje visual nuevo:

- Easing estándar del proyecto para toda animación de entrada/salida: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Iconografía: SVG inline propios (a juego con `assets/sidebar-loyola/iconos_svg/`), no emojis — incluye sustituir el ⚠️ actual del overlay.

**Toast (🟢):**
- Pastilla flotante, ancho completo menos márgenes laterales, anclada encima del bottom-nav: `bottom: calc(var(--bottom-nav-height, 56px) + var(--app-safe-area-bottom, 0px) + 0.6rem)`.
- Fondo `--color-surface-elevated`, borde izquierdo de acento `--color-warning` (variante warning) o `--color-primary` (variante info), sombra `--color-shadow-soft`.
- Icono SVG de aviso con pulso sutil una vez al aparecer.
- Entrada: `translateY(12px)` + `opacity 0→1`, ~300 ms, easing estándar. Salida simétrica invertida. Auto-descarte a los 3.5 s.
- Cola simple, máximo 2 toasts visibles a la vez.

**Tarjeta inline (🟡):**
- Evoluciona `.match-error-card` (ya existe): fondo `--color-surface-danger-soft`, borde `--color-border-danger`, mismo radio/espaciado que el resto de tarjetas vacías.
- Icono SVG de aviso (outline).
- Botón "Reintentar": pill compacta, `--color-primary`, mismo lenguaje que los botones del overlay pero a escala de tarjeta.
- Entrada: fade + scale suave, coherente con `tab-content-enter` (evita el salto brusco al sustituir el skeleton).

**Overlay (🔴):**
- Se mantiene la estructura actual de `errorOverlay.js`/`components-comunes.css`.
- El icono pasa de emoji estático a SVG con animación de entrada tipo "breathe" (escala 0.9→1 con rebote, mismo easing estándar).
- Se dispara solo tras agotar el reintento silencioso de `withRetry`.

## Arquitectura: módulos nuevos y ampliados

**Nuevos:**
- `www/utils/retry.js` — `withRetry(fn, {attempts=2, delayMs=900})`: ejecuta `fn`, reintenta en silencio antes de que el llamador escale a UI de error. Usado por los niveles 🔴 y 🟡.
- `www/ui/toast.js` — `showToast(message, {variant: "warning"|"info", duration=3500})`: gestiona una cola (máx. 2 visibles) y renderiza en un contenedor `#toastStack` nuevo en `index.html` (hermano de `bottom-nav`, fuera de `main`, respetando z-index y safe-area ya establecidos).

**Ampliado:**
- `components/loadingStates.js` → `renderErrorState(container, {title, copy, onRetry})`. Cambio de firma respecto a la actual `(container, title, copy)`; se actualizan sus 2 llamadas existentes (`clasificacion.js`, `partidos.js`) al nuevo shape, añadiendo el botón de reintento.

## Mapeo de los puntos de error existentes

| Punto | Comportamiento actual | Nivel | Cambio |
|---|---|---|---|
| `state/equipos.js:101` (catálogo en arranque) | Overlay siempre | 🔴 | Envolver `getLoyolaCompetitionCatalog()` con `withRetry` antes de escalar a `mostrarPantallaErrorGlobal` |
| `core/init.js:134-137` (`mostrarPartidosYClasificacion`, primera carga) | `<li>Error: msg</li>` crudo | 🟡 | `withRetry` + `renderErrorState` con reintento manual |
| `core/teamSelectorFlow.js:167-169` (clasificación al cambiar de tab) | ídem | 🟡 | ídem |
| `components/partidoDetalleJugadorSubview.js:147-148` (stats de jugador) | `jugador.error` como texto suelto | 🟡 | Usar el mismo componente de tarjeta en vez de texto ad hoc |
| `core/pullToRefresh.js:283-285` | Borra la lista a skeleton y luego a error crudo | 🟢 | Deja de borrar el contenido antes de confirmar éxito; en fallo conserva el contenido anterior + `showToast` |
| `servicesCompetitionCatalog.js:106-109` (competición suelta en el catálogo) | `console.error` silencioso, sin aviso | 🟢 | Un único `showToast` resumen tras terminar la carga si se descartó alguna competición (no uno por competición) |
| `core/realtime.js:133,162`, `core/main.js:16` | `console.warn` silencioso | 🟢 (con umbral) | Se mantiene silencioso en reconexiones puntuales; `showToast` solo si la conexión inicial falla por completo |

## i18n

Nuevas claves necesarias en `i18n.js` (es/eu), siguiendo el estilo existente (`detail_match_load_error`, `global_error_*`):
- Copys de retry genérico para tarjetas 🟡 (ej. `retry_action` = "Reintentar" / "Berriz saiatu" — puede que ya exista algo reutilizable, revisar antes de duplicar).
- Copys de toast para pull-to-refresh fallido, competición no disponible, y Realtime sin conexión inicial.

## Fuera de alcance

- No se cambia el comportamiento de Realtime más allá de añadir el toast de "sin conexión inicial" con umbral; no se toca su lógica de reconexión.
- No se introduce un sistema de telemetría/reporting de errores (solo UI).
- No se audita exhaustivamente cada subview individual más allá de los puntos listados en la tabla; si aparecen más puntos equivalentes durante la implementación, se clasifican con el mismo criterio de esta tabla.
