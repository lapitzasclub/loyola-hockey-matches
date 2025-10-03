// systemBars.js — coloriza StatusBar y NavigationBar leyendo el UI real

const DEBUG = true;

// ===== Helpers de color =====
export function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
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
export function scheduleApplySystemBars(delay = 80) {
  if (_barsT) clearTimeout(_barsT);
  _barsT = setTimeout(() => {
    requestAnimationFrame(() => {
      void applySystemBars();
    });
  }, delay);
}

// ===== Aplicación real a barras del sistema =====
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
export function observeThemeAttribute() {
  const obs = new MutationObserver(() => scheduleApplySystemBars());
  obs.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return obs;
}
