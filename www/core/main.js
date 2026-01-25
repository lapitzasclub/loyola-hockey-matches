
"use strict";
import { initApp } from "./init.js";

/**
 * Inicializa la aplicación cuando el DOM está completamente cargado.
 * Llama a initApp() para configurar la app.
 */
window.addEventListener("DOMContentLoaded", async () => {
  await initApp();
});
