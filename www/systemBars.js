// systemBars.js — coloriza StatusBar y NavigationBar leyendo el UI real

const DEBUG = true;
const FALLBACK_ANDROID_STATUSBAR_INSET_PX = 28;
const FALLBACK_IOS_STATUSBAR_INSET_PX = 44;
const DEFAULT_HEADER_COLOR = "#0e3a43";
const DEFAULT_NAV_COLOR = "#0e3a43";

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

function getStatusBarStyleForColor(hexColor) {
  const hex = String(hexColor || "").trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "DARK";
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? "LIGHT" : "DARK";
}

// ===== Aplicación real a barras del sistema =====
/**
 * Aplica los colores actuales del UI a la StatusBar y NavigationBar (web y nativo).
 * Lee los colores del DOM y los aplica usando Capacitor si está disponible.
 *
 * En plataformas nativas, applySafeAreaInsets se ejecuta DESPUÉS de que
 * setOverlaysWebView haya surtido efecto y el browser haya recalculado el layout,
 * para que env(safe-area-inset-top/bottom) devuelva valores correctos.
 *
 * @returns {Promise<void>}
 */
export async function applySystemBars() {
  const C = window.Capacitor;
  const platform = C?.getPlatform?.();

  // Colores efectivos del UI
  const headerVar = hexFromAny(cssVar("--color-bg-header") || DEFAULT_HEADER_COLOR);
  const headerColor = resolvedColor(".header", headerVar) || DEFAULT_HEADER_COLOR;
  const navColor = resolvedColor(".bottom-nav", headerColor) || DEFAULT_NAV_COLOR;
  const statusBarStyle = getStatusBarStyleForColor(headerColor);
  const navigationBarStyle = getStatusBarStyleForColor(navColor);

  // Meta theme-color (web/PWA)
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", headerColor);

  // Web: no hay overlay de Capacitor, leer env() directamente
  if (!platform || platform === "web") {
    applySafeAreaInsets(platform);
    return;
  }

  const StatusBar = C?.Plugins?.StatusBar;
  const NavigationBar = C?.Plugins?.NavigationBar; // @capgo/capacitor-navigation-bar
  const statusBarColor = headerColor || DEFAULT_HEADER_COLOR;

  try {
    if (StatusBar?.setOverlaysWebView) {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
    if (StatusBar?.setBackgroundColor) {
      await StatusBar.setBackgroundColor({ color: statusBarColor });
    }
    if (StatusBar?.setStyle) {
      await StatusBar.setStyle({ style: statusBarStyle });
    }
    // Retries solo para color/estilo: Capacitor puede tardar en inicializar
    [80, 220, 500].forEach((delay) => {
      setTimeout(async () => {
        try {
          if (StatusBar?.setBackgroundColor) {
            await StatusBar.setBackgroundColor({ color: statusBarColor });
          }
          if (StatusBar?.setStyle) {
            await StatusBar.setStyle({ style: statusBarStyle });
          }
        } catch {}
      }, delay);
    });
  } catch (err) {
    DEBUG && console.error("StatusBar error:", err);
  }

  try {
    if (NavigationBar?.setBackgroundColor) {
      await NavigationBar.setBackgroundColor({ color: navColor });
    }
    if (NavigationBar?.setStyle) {
      await NavigationBar.setStyle({ style: navigationBarStyle });
    }
    if (NavigationBar?.setDividerColor) {
      await NavigationBar.setDividerColor({ color: navColor });
    }
  } catch (err) {
    DEBUG && console.error("NavigationBar error:", err);
  }

  // Doble rAF: esperar a que el browser recalcule el layout tras el cambio de overlay
  // antes de leer env(safe-area-inset-*).
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  applySafeAreaInsets(platform);
}

/**
 * Aplica variables CSS normalizadas para safe areas.
 *
 * Lee env(safe-area-inset-top/bottom) del browser. Si el valor es 0 o inválido
 * en plataformas nativas, aplica un fallback conservador por plataforma:
 * - Android: 28px (status bar estándar)
 * - iOS: 44px (cubre notch, Dynamic Island y modelos sin notch)
 *
 * Debe llamarse DESPUÉS de que setOverlaysWebView haya surtido efecto
 * para que env() refleje el estado real del overlay.
 *
 * @param {string | undefined} platform Plataforma Capacitor actual.
 * @returns {void}
 */
export function applySafeAreaInsets(platform) {
  const root = document.documentElement;
  if (!root) return;

  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);";
  document.body?.appendChild(probe);

  const probeStyles = getComputedStyle(probe);
  const envTop = Number.parseFloat(probeStyles.paddingTop || "0");
  const envBottom = Number.parseFloat(probeStyles.paddingBottom || "0");
  probe.remove();

  const needsFallback = !Number.isFinite(envTop) || envTop <= 0;
  const resolvedTop =
    platform === "android" && needsFallback
      ? FALLBACK_ANDROID_STATUSBAR_INSET_PX
      : platform === "ios" && needsFallback
      ? FALLBACK_IOS_STATUSBAR_INSET_PX
      : Math.max(0, Number.isFinite(envTop) ? envTop : 0);
  const resolvedBottom = Math.max(0, Number.isFinite(envBottom) ? envBottom : 0);

  root.style.setProperty("--app-safe-area-top", `${resolvedTop}px`);
  root.style.setProperty("--app-safe-area-bottom", `${resolvedBottom}px`);
}

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
