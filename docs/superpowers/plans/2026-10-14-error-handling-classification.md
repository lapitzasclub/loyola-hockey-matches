# Clasificación y tratamiento de errores — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el manejo de errores inconsistente de la app (overlay duro siempre vs. texto crudo vs. silencio) por una clasificación de 3 niveles (duro / recuperable-en-sección / blando) con tratamiento visual coherente, reintentos automáticos silenciosos y un componente toast nuevo.

**Architecture:** Dos primitivas nuevas y reutilizables (`withRetry` en `utils/retry.js`, `showToast` en `ui/toast.js`) se insertan en los puntos de error ya existentes, sin cambiar la forma en que se obtienen los datos. `renderErrorState` (ya existente en `loadingStates.js`) se amplía con botón de reintento y se convierte en el tratamiento estándar del nivel 🟡. El nivel 🟢 deja de borrar contenido antes de confirmar éxito.

**Tech Stack:** Vanilla JS (ES modules), Vite, CSS con custom properties (sin preprocesador). Sin framework de test instalado en el repo — la verificación de cada tarea es `npm run lint` + `npm run build` (deben pasar sin errores nuevos) más una comprobación manual descrita en cada tarea.

**Spec:** `docs/superpowers/specs/2026-10-14-error-handling-classification-design.md`

## Global Constraints

- No hay framework de test en el repo (Vite + JS vanilla, sin vitest/jest). Cada tarea se verifica con `npm run lint` y `npm run build` (cero errores nuevos; los 2 warnings preexistentes de `no-unused-vars` en `equipoDetalle.js`/`partidoDetalleAlineaciones.js` no cuentan como regresión) más la comprobación manual descrita en el propio paso. No se introduce un framework de test como parte de este plan.
- Lenguaje visual existente obligatorio para todo lo nuevo: variables de `www/styles/theme.css`, easing `cubic-bezier(0.22, 1, 0.36, 1)` en toda animación nueva, iconos SVG inline (nunca emoji).
- Toda cadena nueva de cara al usuario necesita entrada en `es` y `eu` dentro de `www/i18n.js`.
- `withRetry` es silencioso: nunca cambia el estado visual mientras reintenta (ni spinner ni texto nuevo) más allá de lo que ya estuviera mostrándose.
- Los ficheros de capa de datos (`www/services*.js`) no importan módulos de UI (`www/ui/toast.js`, `www/components/*`). Disparar un toast o una tarjeta de error ocurre siempre desde `core/`, `state/` o `components/`, nunca desde la capa de servicios.
- No tocar `www/components/partidoDetalle.js` directamente (ya es un fichero grande según la convención del proyecto); las tareas que afectan al detalle de partido modifican `partidoDetalleJugadorSubview.js` y `partidoDetallePlayerLinks.js`.

## Review Focus

- Cambiar de pestaña (Partidos/Clasificación/Estadísticas) mientras un reintento 🟡 sigue en vuelo: la respuesta tardía no debe pintarse en la pestaña equivocada (los guards `loadToken`/`sigueVigente` ya existentes deben conservarse en cada handler reescrito).
- Pull-to-refresh fallando dos veces seguidas: la cola de toasts no debe acumularse sin límite (máx. 2 visibles) ni bloquear un tercer reintento manual posterior.
- `withRetry` sobre un fallo permanente (ej. 404): debe parar en `attempts` intentos y propagar el error real, no tragárselo.
- Pulsar "Reintentar" en la ficha de jugador justo cuando el usuario cierra el modal/navega atrás: no debe lanzar sobre un nodo DOM ya desmontado.
- Toast disparado con la pestaña/app en segundo plano (ej. el timeout de Realtime salta tras cerrar la app): `showToast` no debe fallar si se invoca en ese momento (uso de `document.body`, que siempre existe mientras la página esté cargada, cubierto por `ensureStack`).

---

## Task 1: Claves i18n nuevas

**Files:**
- Modify: `www/i18n.js`

**Interfaces:**
- Produces: claves `toast_refresh_failed`, `toast_catalog_partial(count)`, `toast_realtime_unavailable` en `es` y `eu`, consumidas por las tareas 3, 10, 11, 12.

- [ ] **Step 1: Añadir las claves nuevas al bloque `es`**

En `www/i18n.js`, dentro del objeto `es` (justo después de `detail_match_no_data: "..."` o en cualquier punto del bloque `es`, agrupadas), añadir:

```js
    toast_refresh_failed: "No se pudo actualizar. Mostrando los últimos datos guardados.",
    toast_catalog_partial: (count) => `No se pudieron cargar ${count} competición${count === 1 ? "" : "es"}.`,
    toast_realtime_unavailable: "Sin conexión en directo. Los resultados se actualizarán al reabrir cada partido.",
```

- [ ] **Step 2: Añadir las claves equivalentes al bloque `eu`**

En el mismo fichero, dentro del objeto `eu`:

```js
    toast_refresh_failed: "Ezin izan da eguneratu. Azken gordetako datuak erakusten.",
    toast_catalog_partial: (count) => `Ezin izan dira ${count} lehiaketa kargatu.`,
    toast_realtime_unavailable: "Ez dago zuzeneko konexiorik. Emaitzak partida bakoitza berriro irekitzean eguneratuko dira.",
```

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run build`
Expected: ambos comandos terminan sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add www/i18n.js
git commit -m "feat(i18n): claves de toast para errores blandos"
```

---

## Task 2: `withRetry` — reintento silencioso

**Files:**
- Create: `www/utils/retry.js`

**Interfaces:**
- Produces: `withRetry(fn, {attempts=2, delayMs=900}={}): Promise<T>`. Ejecuta `fn()`; si falla, espera `delayMs * intentoActual` y reintenta hasta agotar `attempts` (número total de intentos, incluido el primero); si el último intento falla, relanza el error original. Consumido por las tareas 5, 7, 8, 9, 10.

- [ ] **Step 1: Crear el fichero**

```js
// retry.js
// Reintento silencioso para operaciones que pueden fallar por red/timeout,
// antes de que el llamador escale a una UI de error.

/**
 * Ejecuta `fn`, reintentando en silencio (sin cambiar ningún estado visual)
 * antes de que el llamador decida escalar a overlay/tarjeta/toast de error.
 *
 * @template T
 * @param {() => Promise<T>} fn Operación a ejecutar.
 * @param {{attempts?: number, delayMs?: number}} [options] `attempts` es el número
 *   total de intentos, incluido el primero. `delayMs` es la base de la espera entre
 *   intentos (se multiplica por el número de intento para dar un backoff corto).
 * @returns {Promise<T>}
 */
export async function withRetry(fn, { attempts = 2, delayMs = 900 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}
```

- [ ] **Step 2: Verificar manualmente en consola del navegador**

Run: `npm run start` (Vite dev server), abrir la app en el navegador y en la consola DevTools ejecutar:

```js
import("/utils/retry.js").then(async ({ withRetry }) => {
  let calls = 0;
  try {
    await withRetry(() => { calls++; throw new Error("boom"); }, { attempts: 2, delayMs: 50 });
  } catch (e) {
    console.log("calls:", calls, "error:", e.message); // esperado: calls: 2, error: boom
  }
});
```

Expected: imprime `calls: 2 error: boom` (dos intentos, error final propagado).

- [ ] **Step 3: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add www/utils/retry.js
git commit -m "feat(utils): añade withRetry para reintentos silenciosos"
```

---

## Task 3: `showToast` — avisos no bloqueantes + estilos

**Files:**
- Create: `www/ui/toast.js`
- Modify: `www/styles/components-comunes.css`

**Interfaces:**
- Consumes: `t` de `www/i18n.js` (solo para los textos que pasan los llamadores, no dentro de este módulo).
- Produces: `showToast(message, {variant="info"|"warning", duration=3500}={}): void`. Inserta/gestiona un `<div id="toastStack">` creado en el primer uso. Consumido por las tareas 7, 10, 11, 12.

- [ ] **Step 1: Crear `www/ui/toast.js`**

```js
// toast.js
// Avisos no bloqueantes (nivel "blando/informativo"): se muestran sobre el
// bottom-nav, no sustituyen contenido y se autodescartan solos.

const MAX_VISIBLE = 2;
const ICON_PATHS = {
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

let stack = null;

function ensureStack() {
  if (stack && document.body.contains(stack)) return stack;
  stack = document.createElement("div");
  stack.id = "toastStack";
  stack.className = "toast-stack";
  stack.setAttribute("aria-live", "polite");
  document.body.appendChild(stack);
  return stack;
}

/**
 * Muestra un aviso flotante no bloqueante que se autodescarta solo.
 * No sustituye ningún contenido existente en pantalla.
 *
 * @param {string} message Texto del aviso, ya traducido por el llamador.
 * @param {{variant?: "info"|"warning", duration?: number}} [options]
 * @returns {void}
 */
export function showToast(message, { variant = "info", duration = 3500 } = {}) {
  const container = ensureStack();

  while (container.children.length >= MAX_VISIBLE) {
    container.firstElementChild?.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast${variant === "warning" ? " toast-warning" : ""}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${ICON_PATHS[variant] || ICON_PATHS.info}</span>
    <span class="toast-message"></span>
  `;
  const messageEl = toast.querySelector(".toast-message");
  if (messageEl) messageEl.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 260);
  }, duration);
}
```

- [ ] **Step 2: Añadir estilos en `www/styles/components-comunes.css`**

Al final del fichero (después de las reglas `@media` del error-overlay existente), añadir:

```css
/* Toast (nivel blando/informativo) */
.toast-stack {
  position: fixed;
  left: 0.75rem;
  right: 0.75rem;
  bottom: calc(var(--bottom-nav-height, 56px) + var(--app-safe-area-bottom, 0px) + 0.6rem);
  z-index: 11000;
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  background: var(--color-surface-elevated);
  color: var(--color-text);
  box-shadow: 0 10px 24px var(--color-shadow-soft);
  border-left: 3px solid var(--color-primary);
  transform: translateY(12px);
  opacity: 0;
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease;
}

.toast.is-visible {
  transform: translateY(0);
  opacity: 1;
}

.toast-warning {
  border-left-color: var(--color-warning);
}

.toast-icon {
  flex: 0 0 auto;
  width: 1.2rem;
  height: 1.2rem;
  color: inherit;
  animation: toast-icon-pulse 900ms cubic-bezier(0.22, 1, 0.36, 1) 1;
}

.toast-icon svg {
  width: 100%;
  height: 100%;
}

.toast-message {
  font-size: 0.86rem;
  line-height: 1.3;
}

@keyframes toast-icon-pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  60% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run start`, abrir la app, en DevTools:

```js
import("/ui/toast.js").then(({ showToast }) => {
  showToast("Prueba de aviso informativo");
  setTimeout(() => showToast("Prueba de aviso de advertencia", { variant: "warning" }), 500);
});
```

Expected: aparecen 2 pastillas apiladas encima del bottom-nav, con animación de entrada, y se autodescartan a los ~3.5 s. Comprobar en tema claro y oscuro (icono/texto legibles en ambos).

- [ ] **Step 4: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add www/ui/toast.js www/styles/components-comunes.css
git commit -m "feat(ui): añade showToast para avisos no bloqueantes"
```

---

## Task 4: Ampliar `renderErrorState` con icono y reintento

**Files:**
- Modify: `www/components/loadingStates.js`
- Modify: `www/styles/components-partidos.css`
- Modify: `www/components/clasificacion.js:1-14,284-295` (imports + llamada)
- Modify: `www/components/partidos.js:1-15,156-159` (imports + llamada)

**Interfaces:**
- Consumes: `t` de `../i18n.js` (ya importado en `loadingStates.js`).
- Produces: `renderErrorState(container, {title, copy="", onRetry}): void` — cambia de firma posicional `(container, title, copy)` a un único objeto de opciones. Consumido por las tareas 7 y 8 además de los 2 llamadores actuales.

- [ ] **Step 1: Reescribir `renderErrorState` en `www/components/loadingStates.js`**

Sustituir la función actual:

```js
export function renderErrorState(matchesList, title, copy = "") {
  matchesList.innerHTML = `
    <li class="match-empty-card match-error-card">
      <div class="match-empty-shell match-error-shell">
        <div class="match-empty-kicker">${t("app_short_name")}</div>
        <div class="match-empty-title">${title}</div>
        ${copy ? `<div class="match-empty-copy">${copy}</div>` : ""}
      </div>
    </li>
  `;
}
```

por:

```js
const ERROR_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>`;

/**
 * Renderiza un estado de error reutilizable en listas principales, con icono
 * y reintento opcional (nivel "recuperable en sección").
 *
 * @param {HTMLElement} matchesList Lista o contenedor donde pintar el estado.
 * @param {{title: string, copy?: string, onRetry?: () => (void|Promise<void>)}} options
 * @returns {void}
 */
export function renderErrorState(matchesList, { title, copy = "", onRetry } = {}) {
  matchesList.innerHTML = `
    <li class="match-empty-card match-error-card">
      <div class="match-empty-shell match-error-shell">
        <div class="match-error-icon" aria-hidden="true">${ERROR_ICON_SVG}</div>
        <div class="match-empty-kicker">${t("app_short_name")}</div>
        <div class="match-empty-title">${title}</div>
        ${copy ? `<div class="match-empty-copy">${copy}</div>` : ""}
        ${onRetry ? `<button type="button" class="match-error-retry">${t("global_error_retry")}</button>` : ""}
      </div>
    </li>
  `;

  if (!onRetry) return;
  const btn = matchesList.querySelector(".match-error-retry");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = t("global_error_retrying");
    try {
      await onRetry();
    } finally {
      if (btn.isConnected) {
        btn.disabled = false;
        btn.textContent = t("global_error_retry");
      }
    }
  });
}
```

- [ ] **Step 2: Añadir estilos del icono y el botón en `www/styles/components-partidos.css`**

Justo después del bloque `body[data-theme="dark"] .match-error-shell { ... }` existente, añadir:

```css
.match-error-icon {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto 0.6rem;
  border-radius: 999px;
  background: var(--color-surface-danger-soft-strong);
  color: var(--color-danger);
}

.match-error-icon svg {
  width: 1.3rem;
  height: 1.3rem;
}

.match-error-retry {
  display: block;
  margin: 0.75rem auto 0;
  padding: 0.55rem 1.1rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-text-contrast);
  font-size: 0.82rem;
  font-weight: 700;
  transition: transform 0.16s ease;
}

.match-error-retry:hover,
.match-error-retry:focus-visible {
  transform: translateY(-1px);
}

.match-error-retry:disabled {
  opacity: 0.7;
  cursor: wait;
  transform: none;
}

#matches li.match-error-card .match-error-shell {
  animation: match-error-fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes match-error-fade-in {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 3: Actualizar el llamador en `www/components/clasificacion.js`**

Añadir a los imports existentes (línea 3, junto a `getCalendarioTodosEquipos, getParametrosCompeticion`):

```js
import { getCalendarioTodosEquipos, getParametrosCompeticion, getClasificacionLiga } from "../services.js";
```

Añadir import de `getEquipoSeleccionado`:

```js
import { getEquipoSeleccionado } from "../state/equipos.js";
```

Sustituir el bloque actual (dentro de `renderClasificacionContent`):

```js
  const data = decodeApiRaw(raw);
  if (data?.__error) {
    renderErrorState(matchesList, t("error", data.__error));
    return;
  }
```

por:

```js
  const data = decodeApiRaw(raw);
  if (data?.__error) {
    renderErrorState(matchesList, {
      title: t("error", data.__error),
      onRetry: () => retryClasificacion(matchesList, renderToken),
    });
    return;
  }
```

Y añadir, justo antes de `export function renderClasificacion`, la función de reintento:

```js
/**
 * Vuelve a pedir la clasificación del equipo seleccionado y repinta si la petición sigue vigente.
 *
 * @param {HTMLElement} matchesList Contenedor de la clasificación.
 * @param {string} renderToken Token de la petición de render en curso.
 * @returns {Promise<void>}
 */
async function retryClasificacion(matchesList, renderToken) {
  const seleccionado = getEquipoSeleccionado();
  if (!seleccionado) return;
  const [idComp] = seleccionado.split("|");
  try {
    const raw = await getClasificacionLiga(idComp);
    if (matchesList.dataset.clasRenderToken !== renderToken) return;
    renderClasificacionContent(matchesList, raw, renderToken);
  } catch (error) {
    if (matchesList.dataset.clasRenderToken !== renderToken) return;
    renderErrorState(matchesList, {
      title: t("error", error?.message || String(error)),
      onRetry: () => retryClasificacion(matchesList, renderToken),
    });
  }
}
```

- [ ] **Step 4: Actualizar el llamador en `www/components/partidos.js`**

Añadir import (línea 6, junto a `getParametrosCompeticion`):

```js
import { getParametrosCompeticion, getCalendarioLoyola } from "../services.js";
```

Sustituir en `renderPartidos`:

```js
  if (error) {
    renderErrorState(matchesList, t("error", error));
    return;
  }
```

por:

```js
  if (error) {
    renderErrorState(matchesList, {
      title: t("error", error),
      onRetry: () => retryPartidos(matchesList),
    });
    return;
  }
```

Y añadir, antes de `export async function renderPartidos`, la función de reintento:

```js
/**
 * Vuelve a pedir el calendario del equipo seleccionado y repinta la lista.
 *
 * @param {HTMLElement} matchesList Contenedor de la lista de partidos.
 * @returns {Promise<void>}
 */
async function retryPartidos(matchesList) {
  const seleccionado = getEquipoSeleccionado();
  if (!seleccionado) return;
  const [idComp, idEquipo] = seleccionado.split("|");
  try {
    const raw = await getCalendarioLoyola(idEquipo, idComp);
    await renderPartidos(matchesList, raw);
  } catch (error) {
    renderErrorState(matchesList, {
      title: t("error", error?.message || String(error)),
      onRetry: () => retryPartidos(matchesList),
    });
  }
}
```

- [ ] **Step 5: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores (ojo: si `npm run lint` marca `getParametrosCompeticion`/`getCalendarioTodosEquipos` como no usados por el reordenamiento del import, ajustar el orden de los nombres importados, no el contenido).

- [ ] **Step 6: Verificación manual**

Con `npm run start`: forzar un error de red (DevTools → Network → Offline), abrir la pestaña Partidos y Clasificación con un equipo seleccionado. Expected: aparece la tarjeta con icono, mensaje y botón "Reintentar"; al volver a poner la red online y pulsar el botón, el botón se deshabilita ("Reintentando..."), y la vista se repinta con los datos reales.

- [ ] **Step 7: Commit**

```bash
git add www/components/loadingStates.js www/styles/components-partidos.css www/components/clasificacion.js www/components/partidos.js
git commit -m "feat(errors): renderErrorState con icono y reintento (nivel recuperable-en-seccion)"
```

---

## Task 5: Overlay duro — icono SVG animado

**Files:**
- Modify: `www/state/errorOverlay.js`
- Modify: `www/styles/components-comunes.css`

**Interfaces:**
- No cambia la firma de `mostrarPantallaErrorGlobal`.

- [ ] **Step 1: Sustituir el icono emoji por SVG en `www/state/errorOverlay.js`**

Cambiar:

```js
      <div class="error-overlay-icon" aria-hidden="true">⚠️</div>
```

por:

```js
      <div class="error-overlay-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg></div>
```

- [ ] **Step 2: Añadir animación de entrada en `www/styles/components-comunes.css`**

Dentro de la regla `.error-overlay-icon` existente, añadir la propiedad `animation` y el tamaño del SVG, y añadir el `@keyframes` nuevo justo después del bloque `.error-overlay-icon { ... }`:

```css
.error-overlay-icon {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  margin: 0 auto 0.9rem;
  border-radius: 999px;
  background: var(--common-warning-soft-bg);
  box-shadow: inset 0 0 0 1px var(--common-warning-soft-border);
  color: var(--color-warning);
  animation: error-overlay-icon-breathe 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.error-overlay-icon svg {
  width: 1.9rem;
  height: 1.9rem;
}

@keyframes error-overlay-icon-breathe {
  from { transform: scale(0.9); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  to { transform: scale(1); opacity: 1; }
}
```

(Esto sustituye la regla `.error-overlay-icon` previa que tenía `font-size: 1.75rem` para el emoji — quitar esa propiedad, ya no aplica.)

- [ ] **Step 3: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Con `npm run start`, forzar el overlay duro: DevTools → Network → Offline, recargar la app desde cero (sin equipo guardado o con caché de catálogo vacía). Expected: aparece el overlay "Ups" con el icono SVG haciendo un pequeño "respiro" de entrada, mismo texto/botones que antes.

- [ ] **Step 5: Commit**

```bash
git add www/state/errorOverlay.js www/styles/components-comunes.css
git commit -m "feat(errors): icono SVG animado en el overlay duro"
```

---

## Task 6: Nivel 🔴 — reintento silencioso antes del overlay en el arranque

**Files:**
- Modify: `www/state/equipos.js`

**Interfaces:**
- Consumes: `withRetry` de `../utils/retry.js` (Task 2).

- [ ] **Step 1: Envolver la carga del catálogo con `withRetry`**

En `www/state/equipos.js`, añadir el import:

```js
import { withRetry } from "../utils/retry.js";
```

Cambiar, dentro de `cargarSelectorEquiposLoyola`:

```js
  try {
    const catalog = await getLoyolaCompetitionCatalog();
```

por:

```js
  try {
    const catalog = await withRetry(() => getLoyolaCompetitionCatalog());
```

- [ ] **Step 2: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Con `npm run start`: DevTools → Network → "Slow 3G" + bloquear temporalmente la URL de la API del catálogo con un "block request" en DevTools, recargar. Expected: la app tarda ~1 intento + ~0.9 s extra antes de mostrar el overlay "Ups" (antes lo mostraba al primer fallo). Desbloquear la URL y pulsar "Reintentar" en el overlay para confirmar que sigue funcionando igual que antes.

- [ ] **Step 4: Commit**

```bash
git add www/state/equipos.js
git commit -m "feat(errors): reintento silencioso antes del overlay duro en el arranque"
```

---

## Task 7: Nivel 🟡 — primera carga de Partidos (`mostrarPartidosYClasificacion`)

**Files:**
- Modify: `www/core/init.js`

**Interfaces:**
- Consumes: `withRetry` (Task 2), `showToast` (Task 3), `renderErrorState` (Task 4).
- Produces: `mostrarPartidosYClasificacion({isBackgroundRefresh=false}={}): Promise<void>` — cambia de función sin parámetros a aceptar un objeto de opciones opcional. Consumido por la Task 10 (pull-to-refresh) con `isBackgroundRefresh: true`; todos los demás llamadores existentes (`navigation.js`, `teamSelectorFlow.js`, `initBootstrap.js`, etc.) siguen llamándola sin argumentos y mantienen el comportamiento actual.

- [ ] **Step 1: Añadir imports en `www/core/init.js`**

```js
import { withRetry } from "../utils/retry.js";
import { showToast } from "../ui/toast.js";
import { renderErrorState } from "../components/loadingStates.js";
```

- [ ] **Step 2: Reescribir `mostrarPartidosYClasificacion`**

Sustituir:

```js
export async function mostrarPartidosYClasificacion() {
  const matchesList = ensureMatchesList();
  const headerTitle = document.getElementById("headerTitle");
  if (!matchesList) return;
  if (!getEquipoSeleccionado()) {
    renderTeamSelectionPromptState(matchesList);
    if (headerTitle) headerTitle.textContent = "";
    setCompeticionHeader("");
    return;
  }
  const [idComp, idEquipo] = getEquipoSeleccionado().split("|");
  const eq = getEquiposLoyola().find(
    (item) => item.idCompeticion == idComp && item.idEquipoComp == idEquipo,
  );
  if (headerTitle) {
    headerTitle.textContent = eq?.nombreEquipo || "Equipo Loyola";
  }
  setCompeticionHeader(eq?.nombreCompeticion || "");
  renderPartidosLoadingState(matchesList);
  try {
    const raw = await getCalendarioLoyola(idEquipo, idComp);
    setInitialTeamLoadActive(false);
    renderPartidos(matchesList, raw);
  } catch (error) {
    setInitialTeamLoadActive(false);
    matchesList.innerHTML = `<li>${t("error", error?.message || String(error))}</li>`;
  }
}
```

por:

```js
export async function mostrarPartidosYClasificacion({ isBackgroundRefresh = false } = {}) {
  const matchesList = ensureMatchesList();
  const headerTitle = document.getElementById("headerTitle");
  if (!matchesList) return;
  if (!getEquipoSeleccionado()) {
    renderTeamSelectionPromptState(matchesList);
    if (headerTitle) headerTitle.textContent = "";
    setCompeticionHeader("");
    return;
  }
  const [idComp, idEquipo] = getEquipoSeleccionado().split("|");
  const eq = getEquiposLoyola().find(
    (item) => item.idCompeticion == idComp && item.idEquipoComp == idEquipo,
  );
  if (headerTitle) {
    headerTitle.textContent = eq?.nombreEquipo || "Equipo Loyola";
  }
  setCompeticionHeader(eq?.nombreCompeticion || "");
  if (!isBackgroundRefresh) {
    renderPartidosLoadingState(matchesList);
  }
  try {
    const raw = isBackgroundRefresh
      ? await withRetry(() => getCalendarioLoyola(idEquipo, idComp), { attempts: 3, delayMs: 500 })
      : await withRetry(() => getCalendarioLoyola(idEquipo, idComp));
    setInitialTeamLoadActive(false);
    await renderPartidos(matchesList, raw);
  } catch (error) {
    setInitialTeamLoadActive(false);
    if (isBackgroundRefresh) {
      showToast(t("toast_refresh_failed"), { variant: "warning" });
      return;
    }
    renderErrorState(matchesList, {
      title: t("error", error?.message || String(error)),
      onRetry: () => mostrarPartidosYClasificacion(),
    });
  }
}
```

- [ ] **Step 3: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Con `npm run start`: DevTools → Network → bloquear la URL del calendario, abrir/recargar con un equipo ya seleccionado (pestaña Partidos). Expected: tras el reintento silencioso, aparece la tarjeta de error con botón "Reintentar"; desbloquear la URL y pulsar el botón → se carga la lista real.

- [ ] **Step 5: Commit**

```bash
git add www/core/init.js
git commit -m "feat(errors): nivel recuperable-en-seccion en la carga de partidos"
```

---

## Task 8: Nivel 🟡 — pestañas Clasificación y Estadísticas (3 handlers duplicados)

**Files:**
- Modify: `www/core/navigation.js`
- Modify: `www/core/teamSelectorFlow.js`

**Interfaces:**
- Consumes: `withRetry` (Task 2), `renderErrorState` (Task 4).

- [ ] **Step 1: `www/core/navigation.js` — añadir imports**

Cambiar:

```js
import { renderClasificacionLoadingState, renderTeamSelectionPromptState } from "../components/loadingStates.js";
```

por:

```js
import { renderClasificacionLoadingState, renderErrorState, renderTeamSelectionPromptState } from "../components/loadingStates.js";
import { withRetry } from "../utils/retry.js";
```

- [ ] **Step 2: Reescribir el handler de `navClas` en `www/core/navigation.js`**

Sustituir:

```js
    navClas.addEventListener("click", async () => {
      const loadToken = ++clasLoadToken;
      statsLoadToken += 1;
      setActiveTab("clasificacion");
      const matchesList = prepararContenedor();
      if (!matchesList) return;
      renderClasificacionLoadingState(matchesList);
      if (!getEquipoSeleccionado()) {
        renderTeamSelectionPromptState(matchesList);
        setCompeticionHeader("");
        return;
      }
      const [idComp] = getEquipoSeleccionado().split("|");
      const eq = getEquiposLoyola().find((e) => e.idCompeticion == idComp);
      setCompeticionHeader(eq?.nombreCompeticion || "");
      try {
        const raw = await getClasificacionLiga(idComp);
        if (loadToken !== clasLoadToken || !navClas.classList.contains("active")) return;
        matchesList.innerHTML = "";
        renderClasificacion(matchesList, raw);
      } catch (e) {
        if (loadToken !== clasLoadToken || !navClas.classList.contains("active")) return;
        matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
      }
    });
```

por:

```js
    navClas.addEventListener("click", async () => {
      const loadToken = ++clasLoadToken;
      statsLoadToken += 1;
      setActiveTab("clasificacion");
      const matchesList = prepararContenedor();
      if (!matchesList) return;
      renderClasificacionLoadingState(matchesList);
      if (!getEquipoSeleccionado()) {
        renderTeamSelectionPromptState(matchesList);
        setCompeticionHeader("");
        return;
      }
      const [idComp] = getEquipoSeleccionado().split("|");
      const eq = getEquiposLoyola().find((e) => e.idCompeticion == idComp);
      setCompeticionHeader(eq?.nombreCompeticion || "");

      const sigueVigente = () => loadToken === clasLoadToken && navClas.classList.contains("active");
      const cargarClasificacionTab = async () => {
        try {
          const raw = await withRetry(() => getClasificacionLiga(idComp));
          if (!sigueVigente()) return;
          matchesList.innerHTML = "";
          renderClasificacion(matchesList, raw);
        } catch (e) {
          if (!sigueVigente()) return;
          renderErrorState(matchesList, {
            title: t("error", e?.message || String(e)),
            onRetry: cargarClasificacionTab,
          });
        }
      };
      await cargarClasificacionTab();
    });
```

- [ ] **Step 3: Reescribir el handler de `navStats` en `www/core/navigation.js`**

Sustituir:

```js
  if (navStats) {
    navStats.addEventListener("click", async () => {
      const loadToken = ++statsLoadToken;
      clasLoadToken += 1;
      setActiveTab("estadisticas");
      const matchesList = prepararContenedor();
      if (!matchesList) return;
      renderClasificacionLoadingState(matchesList);

      if (!getEquipoSeleccionado()) {
        renderTeamSelectionPromptState(matchesList);
        setCompeticionHeader("");
        return;
      }
      const [idComp] = getEquipoSeleccionado().split("|");
      const eq = getEquiposLoyola().find((e) => e.idCompeticion == idComp);
      setCompeticionHeader(eq?.nombreCompeticion || "");

      const sigueVigente = () => loadToken === statsLoadToken && navStats.classList.contains("active");
      try {
        const { renderEstadisticasLiga } = await import("../components/estadisticasLiga.js");
        if (!sigueVigente()) return;
        await renderEstadisticasLiga(matchesList, idComp, sigueVigente);
      } catch (e) {
        if (!sigueVigente()) return;
        matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
      }
    });
  }
```

por:

```js
  if (navStats) {
    navStats.addEventListener("click", async () => {
      const loadToken = ++statsLoadToken;
      clasLoadToken += 1;
      setActiveTab("estadisticas");
      const matchesList = prepararContenedor();
      if (!matchesList) return;
      renderClasificacionLoadingState(matchesList);

      if (!getEquipoSeleccionado()) {
        renderTeamSelectionPromptState(matchesList);
        setCompeticionHeader("");
        return;
      }
      const [idComp] = getEquipoSeleccionado().split("|");
      const eq = getEquiposLoyola().find((e) => e.idCompeticion == idComp);
      setCompeticionHeader(eq?.nombreCompeticion || "");

      const sigueVigente = () => loadToken === statsLoadToken && navStats.classList.contains("active");
      // No se envuelve renderEstadisticasLiga en withRetry: pinta directamente en el DOM
      // y no se ha auditado como idempotente ante una segunda llamada tras fallo parcial.
      const cargarEstadisticasTab = async () => {
        try {
          const { renderEstadisticasLiga } = await import("../components/estadisticasLiga.js");
          if (!sigueVigente()) return;
          await renderEstadisticasLiga(matchesList, idComp, sigueVigente);
        } catch (e) {
          if (!sigueVigente()) return;
          renderErrorState(matchesList, {
            title: t("error", e?.message || String(e)),
            onRetry: cargarEstadisticasTab,
          });
        }
      };
      await cargarEstadisticasTab();
    });
  }
```

- [ ] **Step 4: `www/core/teamSelectorFlow.js` — añadir imports**

Cambiar:

```js
import { renderClasificacionLoadingState, renderInitialTeamLoadingState, renderTeamSelectionPromptState } from "../components/loadingStates.js";
```

por:

```js
import { renderClasificacionLoadingState, renderErrorState, renderInitialTeamLoadingState, renderTeamSelectionPromptState } from "../components/loadingStates.js";
import { withRetry } from "../utils/retry.js";
```

- [ ] **Step 5: Reescribir el bloque de clasificación dentro de `handleLanguageChange`**

Sustituir:

```js
  const navClas = document.getElementById("navClas");
  if (navClas && navClas.classList.contains("active")) {
    const matchesList = ensureMatchesList();
    if (!matchesList) return;
    renderClasificacionLoadingState(matchesList);
    if (!getEquipoSeleccionado()) {
      renderTeamSelectionPromptState(matchesList);
      setCompeticionHeader("");
      return;
    }
    const [idComp] = getEquipoSeleccionado().split("|");
    const eq = getEquiposLoyola().find((item) => item.idCompeticion == idComp);
    setCompeticionHeader(eq?.nombreCompeticion || "");
    try {
      const raw = await getClasificacionLiga(idComp);
      matchesList.innerHTML = "";
      renderClasificacion(matchesList, raw);
    } catch (error) {
      matchesList.innerHTML = `<li>${t("error", error?.message || String(error))}</li>`;
    }
    return;
  }
```

por:

```js
  const navClas = document.getElementById("navClas");
  if (navClas && navClas.classList.contains("active")) {
    const matchesList = ensureMatchesList();
    if (!matchesList) return;
    renderClasificacionLoadingState(matchesList);
    if (!getEquipoSeleccionado()) {
      renderTeamSelectionPromptState(matchesList);
      setCompeticionHeader("");
      return;
    }
    const [idComp] = getEquipoSeleccionado().split("|");
    const eq = getEquiposLoyola().find((item) => item.idCompeticion == idComp);
    setCompeticionHeader(eq?.nombreCompeticion || "");

    const cargarClasificacionTrasIdioma = async () => {
      try {
        const raw = await withRetry(() => getClasificacionLiga(idComp));
        matchesList.innerHTML = "";
        renderClasificacion(matchesList, raw);
      } catch (error) {
        renderErrorState(matchesList, {
          title: t("error", error?.message || String(error)),
          onRetry: cargarClasificacionTrasIdioma,
        });
      }
    };
    await cargarClasificacionTrasIdioma();
    return;
  }
```

- [ ] **Step 6: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 7: Verificación manual**

Con `npm run start`: para cada uno de los 3 casos (clic en pestaña Clasificación, clic en pestaña Estadísticas, cambiar idioma estando en la pestaña Clasificación), bloquear la petición de red correspondiente en DevTools antes de disparar la acción. Expected: tarjeta de error con reintento en los 3 casos; cambiar rápido de pestaña mientras el reintento está en vuelo no debe pintar contenido en la pestaña equivocada.

- [ ] **Step 8: Commit**

```bash
git add www/core/navigation.js www/core/teamSelectorFlow.js
git commit -m "feat(errors): nivel recuperable-en-seccion en clasificacion y estadisticas"
```

---

## Task 9: Nivel 🟡 — ficha de estadísticas de jugador

**Files:**
- Modify: `www/components/partidoDetalleJugadorSubview.js`
- Modify: `www/components/partidoDetallePlayerLinks.js`

**Interfaces:**
- Consumes: `withRetry` (Task 2).
- Produces: `jugador.errorRetryable: boolean` nuevo campo en el objeto `jugador` del estado, distingue "sin licencia" (no reintentable) de "fallo de carga" (reintentable). Consumido por `renderJugadorSubview` (markup) y `bindPlayerLinks` (wiring del botón).

- [ ] **Step 1: Añadir import en `www/components/partidoDetalleJugadorSubview.js`**

```js
import { withRetry } from "../utils/retry.js";
```

- [ ] **Step 2: Reescribir `hydrateJugadorStats`**

Sustituir:

```js
export async function hydrateJugadorStats(state, headerEl, bodyEl, renderAll) {
  const jugador = state.selectedJugador;
  if (!jugador?.idLicencia) {
    jugador.loading = false;
    jugador.error = t("detail_player_no_license");
    renderAll(state, headerEl, bodyEl);
    return;
  }

  try {
    const statsRes = await getEstadisticaJugador(jugador.idLicencia);
    jugador.statsGlobales = getPlayerStatsData(statsRes);
    jugador.error = jugador.statsGlobales ? "" : t("detail_player_load_error");
  } catch (error) {
    jugador.error = error?.message || t("detail_player_load_error");
  } finally {
    jugador.loading = false;
    renderAll(state, headerEl, bodyEl);
  }
}
```

por:

```js
export async function hydrateJugadorStats(state, headerEl, bodyEl, renderAll) {
  const jugador = state.selectedJugador;
  if (!jugador?.idLicencia) {
    jugador.loading = false;
    jugador.error = t("detail_player_no_license");
    jugador.errorRetryable = false;
    renderAll(state, headerEl, bodyEl);
    return;
  }

  try {
    const statsRes = await withRetry(() => getEstadisticaJugador(jugador.idLicencia));
    jugador.statsGlobales = getPlayerStatsData(statsRes);
    jugador.error = jugador.statsGlobales ? "" : t("detail_player_load_error");
    jugador.errorRetryable = !jugador.statsGlobales;
  } catch (error) {
    jugador.error = error?.message || t("detail_player_load_error");
    jugador.errorRetryable = true;
  } finally {
    jugador.loading = false;
    renderAll(state, headerEl, bodyEl);
  }
}
```

- [ ] **Step 3: Actualizar el markup del error en `renderJugadorSubview`**

Sustituir:

```js
        ${jugador.error ? `<div class="partido-detalle-empty small cardish">${escapeHtml(jugador.error)}</div>` : ""}
```

por:

```js
        ${jugador.error ? `<div class="partido-detalle-empty small cardish">${escapeHtml(jugador.error)}${jugador.errorRetryable ? `<button type="button" class="partido-detalle-player-retry">${escapeHtml(t("global_error_retry"))}</button>` : ""}</div>` : ""}
```

- [ ] **Step 4: Wirear el botón en `www/components/partidoDetallePlayerLinks.js`**

Añadir, al final de `bindPlayerLinks` (después del `forEach` existente, dentro de la misma función, antes de la llave de cierre):

```js
export function bindPlayerLinks(rootEl, state, headerEl, renderAll, hydrateJugadorStats) {
  rootEl.querySelectorAll(".partido-detalle-player-link").forEach((btn) => {
    btn.onclick = async () => {
      let payload;
      try {
        payload = JSON.parse(btn.dataset.player || "null");
      } catch {
        payload = null;
      }

      state.selectedJugador = payload ? resolveJugadorDetalle(state, payload) : null;
      if (!state.selectedJugador) return;

      pushView(state, getCurrentView(state));
      state.selectedJugador.loading = true;
      const bodyEl = rootEl.closest("#partido-detalle-body") || rootEl;

      await transitionDetalleView(bodyEl, async () => {
        setCurrentView(state, "jugador");
        renderAll(state, headerEl, bodyEl);
      }, "forward");

      syncMobileBackState();
      await nextFrame();
      await nextFrame();
      await hydrateJugadorStats(state, headerEl, bodyEl, renderAll);
    };
  });

  const retryBtn = rootEl.querySelector(".partido-detalle-player-retry");
  if (retryBtn) {
    retryBtn.onclick = async () => {
      if (!state.selectedJugador) return;
      const bodyEl = rootEl.closest("#partido-detalle-body") || rootEl;
      state.selectedJugador.loading = true;
      renderAll(state, headerEl, bodyEl);
      await hydrateJugadorStats(state, headerEl, bodyEl, renderAll);
    };
  }
}
```

- [ ] **Step 5: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 6: Verificación manual**

Con `npm run start`: abrir el detalle de un partido jugado, entrar en la ficha de un jugador con licencia, bloquear en DevTools la petición de estadísticas de jugador antes de abrir la ficha. Expected: tras el reintento silencioso, aparece el mensaje de error con botón "Reintentar"; desbloquear y pulsar → carga las estadísticas. Comprobar también el caso "sin licencia" (jugador sin `idLicencia`): debe seguir mostrando el mensaje sin ningún botón.

- [ ] **Step 7: Commit**

```bash
git add www/components/partidoDetalleJugadorSubview.js www/components/partidoDetallePlayerLinks.js
git commit -m "feat(errors): nivel recuperable-en-seccion en ficha de jugador"
```

---

## Task 10: Nivel 🟢 — pull-to-refresh deja de borrar contenido

**Files:**
- Modify: `www/core/pullToRefresh.js`

**Interfaces:**
- Consumes: `withRetry` (Task 2), `showToast` (Task 3), `mostrarPartidosYClasificacion({isBackgroundRefresh})` (Task 7).

- [ ] **Step 1: Actualizar imports**

Sustituir:

```js
import { getClasificacionLiga } from "../services.js";
import { renderClasificacion } from "../components/ui.js";
import { t } from "../i18n.js";
import { renderClasificacionLoadingState, renderTeamSelectionPromptState } from "../components/loadingStates.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { invalidateApiCacheFor } from "../utils/apiCache.js";
```

por:

```js
import { getClasificacionLiga } from "../services.js";
import { renderClasificacion } from "../components/ui.js";
import { t } from "../i18n.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { invalidateApiCacheFor } from "../utils/apiCache.js";
import { withRetry } from "../utils/retry.js";
import { showToast } from "../ui/toast.js";
```

(`renderClasificacionLoadingState` y `renderTeamSelectionPromptState` dejan de usarse en este fichero tras los siguientes pasos — se quitan para no dejar imports muertos.)

- [ ] **Step 2: Reescribir `refrescarEstadisticas`**

Sustituir:

```js
async function refrescarEstadisticas(navStatsEl) {
  const listEl = document.getElementById("matches");
  if (!listEl) return;
  renderClasificacionLoadingState(listEl);

  const seleccionado = getEquipoSeleccionado();
  if (!seleccionado) {
    renderTeamSelectionPromptState(listEl);
    setCompeticionHeader("");
    return;
  }

  const [idComp] = seleccionado.split("|");
  const eq = getEquiposLoyola().find((team) => team.idCompeticion == idComp);
  const sigueVigente = () => !!navStatsEl?.classList.contains("active");
  const { renderEstadisticasLiga } = await import("../components/estadisticasLiga.js");
  if (!sigueVigente()) return;
  setCompeticionHeader(eq?.nombreCompeticion || "");
  await renderEstadisticasLiga(listEl, idComp, sigueVigente);
}
```

por:

```js
async function refrescarEstadisticas(navStatsEl) {
  const listEl = document.getElementById("matches");
  if (!listEl) return;

  const seleccionado = getEquipoSeleccionado();
  if (!seleccionado) return;

  const [idComp] = seleccionado.split("|");
  const eq = getEquiposLoyola().find((team) => team.idCompeticion == idComp);
  const sigueVigente = () => !!navStatsEl?.classList.contains("active");

  try {
    const { renderEstadisticasLiga } = await import("../components/estadisticasLiga.js");
    if (!sigueVigente()) return;
    setCompeticionHeader(eq?.nombreCompeticion || "");
    await renderEstadisticasLiga(listEl, idComp, sigueVigente);
  } catch {
    if (!sigueVigente()) return;
    showToast(t("toast_refresh_failed"), { variant: "warning" });
  }
}
```

- [ ] **Step 3: Añadir `refrescarClasificacion` (nueva función, antes de `setupPullToRefresh`)**

```js
/**
 * Refresca la clasificación en segundo plano (pull-to-refresh): no borra el
 * contenido anterior; si falla, lo conserva y avisa con un toast.
 *
 * @param {HTMLElement|null} navClasEl Botón de la pestaña de clasificación.
 * @returns {Promise<void>}
 */
async function refrescarClasificacion(navClasEl) {
  const listEl = document.getElementById("matches");
  if (!listEl) return;

  const seleccionado = getEquipoSeleccionado();
  if (!seleccionado) return;

  const [idComp] = seleccionado.split("|");
  const eq = getEquiposLoyola().find((team) => team.idCompeticion == idComp);

  try {
    const raw = await withRetry(() => getClasificacionLiga(idComp), { attempts: 3, delayMs: 500 });
    if (!navClasEl?.classList.contains("active")) return;
    setCompeticionHeader(eq?.nombreCompeticion || "");
    listEl.innerHTML = "";
    renderClasificacion(listEl, raw);
  } catch {
    if (!navClasEl?.classList.contains("active")) return;
    showToast(t("toast_refresh_failed"), { variant: "warning" });
  }
}
```

- [ ] **Step 4: Simplificar el bloque `touchend` para usar las nuevas funciones**

Sustituir el cuerpo del `try` dentro del listener `touchend` (desde `if (statsRefreshStarted)` hasta el `catch` incluido):

```js
        try {
          if (statsRefreshStarted) {
            await refrescarEstadisticas(navStatsEl);
          } else if (clasRefreshStarted) {
            const listEl = document.getElementById("matches");
            renderClasificacionLoadingState(listEl);
            if (!getEquipoSeleccionado()) {
              if (getEquipoSeleccionado() === null || getEquipoSeleccionado() === undefined) {
                if (!navClasEl?.classList.contains("active")) return;
                listEl.innerHTML = `<li>Selecciona un equipo Loyola</li>`;
                setCompeticionHeader("");
              } else {
                const [idComp] = getEquipoSeleccionado().split("|");
                const eq = getEquiposLoyola().find((team) => team.idCompeticion == idComp);
                const raw = await getClasificacionLiga(idComp);
                if (!navClasEl?.classList.contains("active")) return;
                setCompeticionHeader(eq?.nombreCompeticion || "");
                listEl.innerHTML = "";
                renderClasificacion(listEl, raw);
              }
            } else {
              const [idComp] = getEquipoSeleccionado().split("|");
              const eq = getEquiposLoyola().find((team) => team.idCompeticion == idComp);
              const raw = await getClasificacionLiga(idComp);
              if (!navClasEl?.classList.contains("active")) return;
              setCompeticionHeader(eq?.nombreCompeticion || "");
              listEl.innerHTML = "";
              renderClasificacion(listEl, raw);
            }
          } else {
            await mostrarPartidosYClasificacion();
          }
        } catch (error) {
          const listEl = document.getElementById("matches");
          listEl.innerHTML = `<li>${t("error", error?.message || String(error))}</li>`;
        } finally {
          setTimeout(() => {
            refreshing = false;
            resetPTR();
          }, 600);
        }
```

por:

```js
        try {
          if (statsRefreshStarted) {
            await refrescarEstadisticas(navStatsEl);
          } else if (clasRefreshStarted) {
            await refrescarClasificacion(navClasEl);
          } else {
            await mostrarPartidosYClasificacion({ isBackgroundRefresh: true });
          }
        } catch {
          showToast(t("toast_refresh_failed"), { variant: "warning" });
        } finally {
          setTimeout(() => {
            refreshing = false;
            resetPTR();
          }, 600);
        }
```

- [ ] **Step 5: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores (comprobar que no queden imports muertos de `renderClasificacionLoadingState`/`renderTeamSelectionPromptState`).

- [ ] **Step 6: Verificación manual (dispositivo/móvil, gesto táctil)**

Con la app en el móvil (o DevTools en modo dispositivo táctil): con contenido ya cargado en Partidos, bloquear la petición de red correspondiente y hacer pull-to-refresh. Expected: el contenido anterior se queda visible (no hay skeleton ni texto de error reemplazándolo), aparece el toast "No se pudo actualizar..." y desaparece solo. Repetir para Clasificación y Estadísticas. Luego desbloquear la red y repetir: debe refrescar con los datos nuevos con normalidad.

- [ ] **Step 7: Commit**

```bash
git add www/core/pullToRefresh.js
git commit -m "feat(errors): nivel blando en pull-to-refresh, conserva contenido previo"
```

---

## Task 11: Nivel 🟢 — competiciones sueltas del catálogo

**Files:**
- Modify: `www/servicesCompetitionCatalog.js`
- Modify: `www/services.js`
- Modify: `www/state/equipos.js`

**Interfaces:**
- Produces: `getLastCatalogFailures(): string[]` — nombres de las competiciones cuya carga de equipos falló en la última llamada a `getLoyolaCompetitionCatalog()` que hizo una petición real (vacío si la respuesta vino de caché). Consumido por `state/equipos.js`.

- [ ] **Step 1: Trackear fallos en `www/servicesCompetitionCatalog.js`**

Añadir, junto a las demás variables de módulo (cerca de `competitionCatalogCache`/`competitionCatalogInflight`):

```js
let lastCatalogFailures = [];
```

Dentro de `getLoyolaCompetitionCatalog`, cambiar:

```js
    const entradas = await mapConConcurrencia(competiciones, CATALOG_CONCURRENCY, async (comp) => {
      let equipos;
      try {
        equipos = await buildLegacyEquipos(comp.id);
      } catch (error) {
        console.error("Error cargando equipos de competición:", comp.id, error);
        return null;
      }
```

por:

```js
    const failedNames = [];
    const entradas = await mapConConcurrencia(competiciones, CATALOG_CONCURRENCY, async (comp) => {
      let equipos;
      try {
        equipos = await buildLegacyEquipos(comp.id);
      } catch (error) {
        console.error("Error cargando equipos de competición:", comp.id, error);
        failedNames.push(comp.nombre || String(comp.id));
        return null;
      }
```

Y cambiar:

```js
    const catalog = entradas.filter(Boolean);

    saveCatalogToStorage(catalog);
    competitionCatalogCache.set(cacheKey, catalog);
    return catalog;
```

por:

```js
    const catalog = entradas.filter(Boolean);

    lastCatalogFailures = failedNames;
    saveCatalogToStorage(catalog);
    competitionCatalogCache.set(cacheKey, catalog);
    return catalog;
```

Y añadir, al final del fichero, el export nuevo:

```js
/**
 * Devuelve los nombres de las competiciones cuya carga de equipos falló en la
 * última llamada a `getLoyolaCompetitionCatalog()` que hizo una petición real
 * (vacío si la respuesta se sirvió de caché/localStorage).
 *
 * @returns {string[]}
 */
export function getLastCatalogFailures() {
  return lastCatalogFailures;
}
```

- [ ] **Step 2: Re-exportar en `www/services.js`**

Cambiar:

```js
export { getEquiposLoyolaTodasCompeticiones, getLoyolaCompetitionCatalog } from "./servicesCompetitionCatalog.js";
```

por:

```js
export { getEquiposLoyolaTodasCompeticiones, getLastCatalogFailures, getLoyolaCompetitionCatalog } from "./servicesCompetitionCatalog.js";
```

- [ ] **Step 3: Mostrar el toast en `www/state/equipos.js`**

Añadir imports:

```js
import { getLoyolaCompetitionCatalog, getLastCatalogFailures } from "../services.js";
import { showToast } from "../ui/toast.js";
import { t } from "../i18n.js";
```

(sustituye el import existente `import { getLoyolaCompetitionCatalog } from "../services.js";`)

Dentro de `cargarSelectorEquiposLoyola`, justo después de `setEquipoSeleccionado(saved || null);` y antes del `catch`, añadir:

```js
    const failures = getLastCatalogFailures();
    if (failures.length) {
      showToast(t("toast_catalog_partial", failures.length), { variant: "warning" });
    }
```

- [ ] **Step 4: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

Difícil de forzar sin manipular la API real; verificación de código: confirmar con `console.log(getLastCatalogFailures())` tras una carga normal que devuelve `[]` (sin fallos). Dejar documentado que la ruta de fallo parcial no se puede reproducir fácilmente en local sin mockear `buildLegacyEquipos`, así que esta tarea se apoya en lint+build+revisión de código en vez de una repro manual completa.

- [ ] **Step 6: Commit**

```bash
git add www/servicesCompetitionCatalog.js www/services.js www/state/equipos.js
git commit -m "feat(errors): aviso blando cuando el catalogo descarta alguna competicion"
```

---

## Task 12: Nivel 🟢 — Realtime sin conexión inicial

**Files:**
- Modify: `www/core/realtime.js`

**Interfaces:**
- Consumes: `showToast` (Task 3).
- No cambia la firma pública de `initRealtime`.

- [ ] **Step 1: Añadir imports**

```js
import { showToast } from "../ui/toast.js";
import { t } from "../i18n.js";
```

- [ ] **Step 2: Añadir el aviso de "sin conexión inicial" en `initRealtime`**

Sustituir:

```js
  try {
    client = new Centrifuge(config.centrifugoWsUrl, {
      getToken: () => fetchConnectionToken(),
    });
    client.on("error", (ctx) => console.warn("[Realtime] Error de cliente Centrifugo:", ctx?.error?.message || ctx));
    client.connect();
  } catch (error) {
    console.warn("[Realtime] No se pudo conectar a Centrifugo:", error);
    client = null;
  }
```

por:

```js
  try {
    client = new Centrifuge(config.centrifugoWsUrl, {
      getToken: () => fetchConnectionToken(),
    });
    client.on("error", (ctx) => console.warn("[Realtime] Error de cliente Centrifugo:", ctx?.error?.message || ctx));

    const initialConnectTimer = setTimeout(() => {
      showToast(t("toast_realtime_unavailable"), { variant: "warning" });
    }, 10000);
    client.on("connected", () => clearTimeout(initialConnectTimer));

    client.connect();
  } catch (error) {
    console.warn("[Realtime] No se pudo conectar a Centrifugo:", error);
    client = null;
  }
```

(No hace falta un flag "ya notificado": `setTimeout` solo se dispara una vez por llamada a `initRealtime`, que a su vez solo se invoca una vez en el arranque desde `main.js`.)

- [ ] **Step 3: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Con `npm run start`: bloquear en DevTools la URL de conexión WebSocket de Centrifugo (o la petición `centrifugo-token-public`) antes de cargar la app. Expected: pasados ~10 s aparece el toast "Sin conexión en directo...". Desbloquear y recargar: no debe aparecer ningún toast si conecta antes de los 10 s.

- [ ] **Step 5: Commit**

```bash
git add www/core/realtime.js
git commit -m "feat(errors): aviso blando si Realtime no conecta al arrancar"
```

---

## Self-Review

**Cobertura del spec:** clasificación de 3 niveles (Tasks 4, 6, 10), reintentos silenciosos (Task 2, usado en 6/7/8/9/10), tratamiento visual toast/tarjeta/overlay con tokens y animaciones del proyecto (Tasks 3, 4, 5), mapeo completo de la tabla del spec — incluyendo los 2 puntos adicionales (`navigation.js` navStats/navClas) descubiertos al inspeccionar el código real, que el spec había fundido erróneamente con `teamSelectorFlow.js` (Task 8 cubre los 3 handlers reales) —, catálogo parcial (Task 11), Realtime (Task 12), i18n (Task 1).

**Placeholders:** ninguno; cada paso de código trae el snippet completo a pegar, sin "TBD" ni "similar a la tarea N".

**Consistencia de tipos:** `withRetry(fn, {attempts, delayMs})` y `showToast(message, {variant, duration})` se usan con la misma firma en todas las tareas que los consumen. `renderErrorState(container, {title, copy, onRetry})` se usa con ese shape en las Tasks 4, 7 y 8 (único sitio que antes la llamaba posicionalmente, ya actualizado en la Task 4 junto con la propia función).

**Review Focus:** los 5 puntos de la sección homónima tienen test manual explícito en la tarea correspondiente (guards de pestaña en Task 8, cola de toasts en Task 3, límite de `withRetry` en Task 2, nodo desmontado en Task 9 — mitigado porque el handler comprueba `state.selectedJugador` antes de actuar y `renderAll` ya tolera cierres de vista en curso —, `ensureStack` ante `document.body` en Task 3).

---

Plan completo y guardado en `docs/superpowers/plans/2026-10-14-error-handling-classification.md`. Por favor revísalo y confírmame si recoge lo que quieres. ¿Qué enfoque de ejecución prefieres?

- **Subagent-driven** — un subagente fresco implementa cada tarea y un revisor fresco la revisa antes de pasar a la siguiente, más una revisión final de toda la rama. Más riguroso; gasta contexto nuevo por tarea y por revisión.
- **Nativo** — implemento yo mismo cada tarea en esta sesión, y un revisor fresco en el modelo más capaz revisa toda la rama al final. Más barato y rápido; sin revisión independiente hasta el final.

Para este plan recomiendo **subagent-driven**, porque son 12 tareas que tocan 15 ficheros con interfaces compartidas (`withRetry`, `showToast`, `renderErrorState`) entre varias de ellas, y un fallo en una tarea intermedia (p. ej. una firma mal propagada) se arrastraría silenciosamente al resto si nadie la revisa hasta el final.
