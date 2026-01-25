// systemBars.js — coloriza StatusBar y NavigationBar leyendo el UI real

const DEBUG = true;

// ===== Helpers de color =====
/**
 * Obtiene el valor de una variable CSS del documento.
 * @param {string} name - Nombre de la variable CSS (ej: --color-bg-header).
 * @returns {string} Valor de la variable CSS.
 */
export function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
/**
 * Convierte cualquier valor de color CSS a formato hexadecimal #rrggbb.
 * @param {string} colorStr - Color en cualquier formato CSS válido.
 * @returns {string} Color en formato hexadecimal.
 */
export function hexFromAny(colorStr) {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = colorStr || "#0e3a43";
    let val = ctx.fillStyle; // #rrggbb o #rrggbbaa
    if (/^#[0-9a-f]{8}$/i.test(val)) val = val.slice(0, 7);
    if (/^#[0-9a-f]{4}$/i.test(val))
      val = "#" + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
    if (/^#[0-9a-f]{3}$/i.test(val))
      val = "#" + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
    return typeof val === "string" ? val : "#0e3a43";
  } catch {
    return "#0e3a43";
  }
}
/**
 * Resuelve el color de fondo efectivo de un selector, en formato hexadecimal.
 * @param {string} selector - Selector CSS del elemento.
 * @param {string} fallback - Color de respaldo si no se encuentra el elemento.
 * @returns {string} Color hexadecimal resuelto.
 */
export function resolvedColor(selector, fallback) {
  const el = document.querySelector(selector);
  const ctx = document.createElement("canvas").getContext("2d");
  if (el) {
    const bg = getComputedStyle(el).backgroundColor || fallback; // rgb(a)/hsl
    ctx.fillStyle = bg;
  } else {
    ctx.fillStyle = fallback;
  }
  let hex = ctx.fillStyle; // #rrggbb[aa]
  if (/^#[0-9a-f]{8}$/i.test(hex)) hex = hex.slice(0, 7);
  if (/^#[0-9a-f]{4}$/i.test(hex))
    hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  if (/^#[0-9a-f]{3}$/i.test(hex))
    hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  return hex;
}

// ===== Scheduler para aplicar tras cambios de tema/render =====
let _barsT;
/**
 * Programa la aplicación de los colores de las barras del sistema tras un cambio de tema/render.
 * @param {number} [delay=80] - Retardo en milisegundos antes de aplicar.
 */
export function scheduleApplySystemBars(delay = 80) {
  if (_barsT) clearTimeout(_barsT);
  _barsT = setTimeout(() => {
    requestAnimationFrame(() => {
      void applySystemBars();
    });
  }, delay);
}

// ===== Aplicación real a barras del sistema =====
/**
 * Aplica los colores actuales del UI a la StatusBar y NavigationBar (web y nativo).
 * Lee los colores del DOM y los aplica usando Capacitor si está disponible.
 * @returns {Promise<void>}
 */
export async function applySystemBars() {
  const C = window.Capacitor;
  const platform = C?.getPlatform?.();

  // Colores efectivos del UI
  const headerVar = hexFromAny(cssVar("--color-bg-header") || "#0e3a43");
  const headerColor = resolvedColor(".header", headerVar);
  const navColor = resolvedColor(".bottom-nav", headerColor);

  // Meta theme-color (web/PWA)
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", headerColor);

  if (!platform || platform === "web") return;

  const StatusBar = C?.Plugins?.StatusBar;
  const NavigationBar = C?.Plugins?.NavigationBar; // @capgo/capacitor-navigation-bar

  try {
    // Evitar solape
    if (StatusBar?.setOverlaysWebView) {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
    // Color + iconos BLANCOS (en tu dispositivo style "DARK" = blancos)
    if (StatusBar?.setBackgroundColor) {
      await StatusBar.setBackgroundColor({ color: headerColor });
    }
    if (StatusBar?.setStyle) {
      await StatusBar.setStyle({ style: "DARK" });
    }
    // Refuerzo tras un tick
    setTimeout(async () => {
      try {
        if (StatusBar?.setBackgroundColor) {
          await StatusBar.setBackgroundColor({ color: headerColor });
        }
        if (StatusBar?.setStyle) {
          await StatusBar.setStyle({ style: "DARK" });
        }
      } catch {}
    }, 60);
  } catch (err) {
    DEBUG && console.error("StatusBar error:", err);
  }

  try {
    if (NavigationBar?.setBackgroundColor) {
      await NavigationBar.setBackgroundColor({ color: navColor });
    }
    if (NavigationBar?.setStyle) {
      await NavigationBar.setStyle({ style: "DARK" }); // iconos blancos
    }
    if (NavigationBar?.setDividerColor) {
      await NavigationBar.setDividerColor({ color: navColor });
    }
  } catch (err) {
    DEBUG && console.error("NavigationBar error:", err);
  }
}

// Observador opcional para re-aplicar si alguien cambia data-theme desde fuera
/**
 * Observa cambios en el atributo data-theme del body para re-aplicar los colores del sistema.
 * @returns {MutationObserver} Observador creado.
 */
export function observeThemeAttribute() {
  const obs = new MutationObserver(() => scheduleApplySystemBars());
  obs.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return obs;
}
