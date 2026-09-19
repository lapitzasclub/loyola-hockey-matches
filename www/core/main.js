"use strict";
import { initApp } from "./init.js";
import { initRealtime } from "./realtime.js";

/**
 * Arranca la aplicación cuando el DOM ya está disponible.
 *
 * El tiempo real (marcadores/eventos en directo) usa Centrifugo en la plataforma nueva;
 * `initRealtime` prepara la capa y no bloquea el arranque si aún no hay partidos en juego.
 */
globalThis.addEventListener("DOMContentLoaded", async () => {
  await initApp();
  try {
    await initRealtime();
  } catch (error) {
    console.warn("[Realtime] No se pudo inicializar el tiempo real:", error);
  }
});
