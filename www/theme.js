// theme.js — gestión de tema (auto/claro/oscuro) y reacciones al cambio
import { scheduleApplySystemBars } from "./systemBars.js";

export function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
export function getTheme() {
  return localStorage.getItem("themeLoyola") || "auto";
}
export function applyTheme(theme) {
  if (theme === "auto") {
    document.body.removeAttribute("data-theme");
  } else {
    document.body.setAttribute("data-theme", theme);
  }
}
export function setTheme(theme) {
  localStorage.setItem("themeLoyola", theme);
  applyTheme(theme);
  scheduleApplySystemBars(); // re-aplica barras con un pelín de delay
}

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
