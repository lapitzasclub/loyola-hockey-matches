// theme.js — gestión de tema (auto/claro/oscuro) y reacciones al cambio
import { scheduleApplySystemBars } from "./systemBars.js";

/**
 * Obtiene el tema del sistema operativo (claro u oscuro).
 * @returns {"light"|"dark"} Tema detectado del sistema.
 */
export function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
/**
 * Obtiene el tema preferido guardado por el usuario (o 'auto' por defecto).
 * @returns {string} Tema guardado ('auto', 'light', 'dark').
 */
export function getTheme() {
  return localStorage.getItem("themeLoyola") || "auto";
}
/**
 * Aplica el tema visual al body del documento.
 * @param {string} theme - Tema a aplicar ('auto', 'light', 'dark').
 */
export function applyTheme(theme) {
  if (theme === "auto") {
    document.body.removeAttribute("data-theme");
  } else {
    document.body.setAttribute("data-theme", theme);
  }
}
/**
 * Guarda el tema elegido por el usuario y lo aplica.
 * @param {string} theme - Tema a guardar y aplicar.
 */
export function setTheme(theme) {
  localStorage.setItem("themeLoyola", theme);
  applyTheme(theme);
  scheduleApplySystemBars(); // re-aplica barras con un pelín de delay
}

/**
 * Escucha cambios en el esquema de color del sistema y reacciona si el tema es 'auto'.
 */
export function listenSystemScheme() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSchemeChange = () => {
    if (getTheme() === "auto") {
      applyTheme(getSystemTheme());
      scheduleApplySystemBars();
    }
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onSchemeChange);
  }
}
