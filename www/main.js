"use strict";

import {
  getCalendarioLoyola,
  getClasificacionLiga,
  getEquiposLoyolaTodasCompeticiones,
} from "./api.js";
import { getLang, setLang, t, updateTexts } from "./i18n.js";
import { renderClasificacion, renderPartidos } from "./ui.js";

import {
  observeThemeAttribute,
  scheduleApplySystemBars,
} from "./systemBars.js";
import {
  applyTheme,
  getSystemTheme,
  getTheme,
  listenSystemScheme,
  setTheme,
} from "./theme.js";

/**
 * Flag de depuración.
 * Mantener en false en producción.
 * @type {boolean}
 */
const DEBUG = true;

/* =========================
   Navegación inferior fija
   ========================= */

/** Referencia al botón de navegación "Partidos". */
const navPartidos = document.getElementById("navPartidos");
/** Referencia al botón de navegación "Clasificación". */
const navClas = document.getElementById("navClas");

if (navPartidos && navClas) {
  // Ir a la vista de partidos
  navPartidos.addEventListener("click", async () => {
    navPartidos.classList.add("active");
    navClas.classList.remove("active");
    // Renderizar la lista de partidos del equipo seleccionado
    await mostrarPartidosYClasificacion();
  });

  // Ir a la vista de clasificación
  navClas.addEventListener("click", async () => {
    navClas.classList.add("active");
    navPartidos.classList.remove("active");

    const matchesList = document.getElementById("matches");
    // Limpiar la lista antes de mostrar el loading
    matchesList.innerHTML = "";
    matchesList.innerHTML = `<li>${t("loading")}</li>`;

    if (!equipoSeleccionado) {
      matchesList.innerHTML = `<li>Selecciona un equipo Loyola</li>`;
      setCompeticionHeader("");
      return;
    }

    const [idComp] = equipoSeleccionado.split("|");
    const eq = equiposLoyola.find((e) => e.idCompeticion == idComp);
    setCompeticionHeader(eq?.nombreCompeticion || "");

    try {
      const raw = await getClasificacionLiga(idComp);
      // Limpiar antes de renderizar para evitar duplicados
      matchesList.innerHTML = "";
      renderClasificacion(matchesList, raw);
    } catch (e) {
      matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
    }
  });
}

/* ==========================================
   Estado y helpers de datos seleccionados
   ========================================== */

/**
 * Lista cacheada de equipos Loyola en todas las competiciones.
 * @type {Array<{idCompeticion:string,idEquipoComp:string,nombreEquipo:string,nombreCompeticion:string}>}
 */
let equiposLoyola = [];

/**
 * Par "idCompeticion|idEquipoComp" del equipo seleccionado.
 * @type {string|null}
 */
let equipoSeleccionado = null;

/* ==========================================
   Gestión de error global (overlay)
   ========================================== */

/**
 * Convertir un valor de error a una cadena útil para mostrar al usuario o log.
 * Evitar "[object Object]" vacío.
 * @param {unknown} err - Error capturado.
 * @returns {string}
 */
function formatError(err) {
  if (err instanceof Error) {
    return err.stack || err.message;
  }
  if (typeof err === "object") {
    try {
      return JSON.stringify(err);
    } catch {
      return Object.prototype.toString.call(err);
    }
  }
  return String(err);
}

/**
 * Mostrar un overlay de error crítico y permitir reintentar la carga.
 * Capturar y presentar el stack o mensaje del error.
 * @param {unknown} error Error capturado (puede ser cualquier tipo).
 * @returns {void}
 */
function mostrarPantallaErrorGlobal(error) {
  // Eliminar overlays anteriores si existen
  let errorOverlay = document.getElementById("errorOverlayGlobal");
  if (errorOverlay) errorOverlay.remove();

  // Crear overlay
  errorOverlay = document.createElement("div");
  errorOverlay.id = "errorOverlayGlobal";
  errorOverlay.style.position = "fixed";
  errorOverlay.style.top = "0";
  errorOverlay.style.left = "0";
  errorOverlay.style.width = "100vw";
  errorOverlay.style.height = "100vh";
  errorOverlay.style.zIndex = "9999";
  errorOverlay.style.background = "var(--color-bg-card, #fff)";
  errorOverlay.style.color = "var(--color-error, #c00)";
  errorOverlay.style.display = "flex";
  errorOverlay.style.flexDirection = "column";
  errorOverlay.style.justifyContent = "center";
  errorOverlay.style.alignItems = "center";
  errorOverlay.style.padding = "2em";
  errorOverlay.innerHTML = `
    <div style="max-width:600px;text-align:center;">
      <h2 style="color:var(--color-error, #c00);margin-bottom:0.7em;">Error crítico</h2>
      <pre style="background:var(--color-bg, #f5f7fa);color:#333;padding:1em;border-radius:8px;max-width:100%;overflow:auto;">${
        /** @type {any} */ (error)?.stack ||
        /** @type {any} */ (error)?.message ||
        formatError(error)
      }</pre>
      <button id="btnReiniciarApp" style="margin-top:1.5em;padding:0.7em 2em;font-size:1.1em;border-radius:8px;background:var(--color-primary,#1976d2);color:#fff;border:none;cursor:pointer;">Reiniciar app</button>
    </div>
  `;
  document.body.appendChild(errorOverlay);

  // Importante: el handler es async y usa await dentro del try
  document.getElementById("btnReiniciarApp").onclick = async () => {
    errorOverlay.remove();
    // Relanzar requests de inicio y capturar rechazos asíncronos en el catch
    try {
      await cargarSelectorEquiposLoyola();
      await mostrarPartidosYClasificacion();
    } catch (err) {
      mostrarPantallaErrorGlobal(err);
    }
  };
}

/* ==========================================
   Carga de selector de equipos
   ========================================== */

/**
 * Cargar en el <select id="equipoLoyolaSelect"> el listado de equipos disponibles.
 * Restaurar selección previa desde localStorage si existe.
 * Esta función **no** dispara render por sí misma; el llamador decide cuándo pintar.
 * @returns {Promise<void>}
 */
async function cargarSelectorEquiposLoyola() {
  const selector = document.getElementById("equipoLoyolaSelect");
  if (!selector) return;

  selector.innerHTML = `<option value="">Cargando equipos...</option>`;

  try {
    // Obtener equipos del API
    equiposLoyola = await getEquiposLoyolaTodasCompeticiones();

    // Rellenar selector
    selector.innerHTML = "";
    equiposLoyola.forEach((eq) => {
      const opt = document.createElement("option");
      opt.value = `${eq.idCompeticion}|${eq.idEquipoComp}`;
      opt.textContent = `${eq.nombreEquipo} (${eq.nombreCompeticion})`;
      selector.appendChild(opt);
    });

    // Aplicar selección previa (si existe)
    const saved = localStorage.getItem("equipoLoyolaSel");
    if (saved) selector.value = saved;

    // Actualizar estado cuando cambie el selector
    selector.addEventListener("change", async () => {
      localStorage.setItem("equipoLoyolaSel", selector.value);
      equipoSeleccionado = selector.value || null;
      // Renderizar inmediatamente tras cambio de equipo
      await mostrarPartidosYClasificacion();
    });

    // Establecer selección actual en estado (sin render automático)
    equipoSeleccionado = selector.value || null;
  } catch (err) {
    // Mostrar overlay en caso de fallo al poblar el selector
    mostrarPantallaErrorGlobal(err);
  }
}

/* ==========================================
   UI: Cabecera con nombre de competición
   ========================================== */

/**
 * Establecer/crear el header visible con el nombre de la competición.
 * Si no existe el contenedor, crearlo e insertarlo al inicio de <main>.
 * @param {string} nombreCompeticion Nombre de la competición (puede ser cadena vacía para limpiar).
 * @returns {void}
 */
function setCompeticionHeader(nombreCompeticion) {
  let header = document.getElementById("competicionHeader");
  if (!header) {
    header = document.createElement("div");
    header.id = "competicionHeader";
    header.className = "competicion-header";
    const main = document.querySelector("main");
    if (main) main.insertBefore(header, main.firstChild);
  }
  header.textContent = nombreCompeticion || "";
}

/* ==========================================
   Render principal: Partidos del equipo
   ========================================== */

/**
 * Renderizar la pantalla de partidos (y ajustar cabeceras) para el equipo seleccionado.
 * Mostrar mensajes de estado cuando no hay equipo o durante carga/errores.
 * @returns {Promise<void>}
 */
async function mostrarPartidosYClasificacion() {
  const matchesList = document.getElementById("matches");
  const headerTitle = document.getElementById("headerTitle");

  // Reset inicial si no hay equipo seleccionado
  if (!equipoSeleccionado) {
    matchesList.innerHTML = `<li>Selecciona un equipo Loyola</li>`;
    if (headerTitle) headerTitle.textContent = "";
    setCompeticionHeader("");
    return;
  }

  // Descomponer clave "idComp|idEquipo" y localizar datos del equipo
  const [idComp, idEquipo] = equipoSeleccionado.split("|");
  const eq = equiposLoyola.find(
    (e) => e.idCompeticion == idComp && e.idEquipoComp == idEquipo
  );

  // Actualizar títulos/cabeceras
  if (headerTitle)
    headerTitle.textContent = eq?.nombreEquipo || "Equipo Loyola";
  setCompeticionHeader(eq?.nombreCompeticion || "");

  // Mostrar estado de carga
  matchesList.innerHTML = `<li>${t("loading")}</li>`;

  try {
    // Pedir calendario y renderizar partidos
    const raw = await getCalendarioLoyola(idEquipo, idComp);
    renderPartidos(matchesList, raw);
  } catch (e) {
    matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
  }
}

/* =========================
   Inicialización
   ========================= */

/**
 * Inicializar comportamientos una vez disponible el DOM.
 * Configurar tema, idioma, menú lateral, pull-to-refresh y cargar/mostrar equipos.
 */
window.addEventListener("DOMContentLoaded", async () => {
  try {
    /* ===========
       Tema / UI
       =========== */
    const themeSelect = document.getElementById("themeSelect");
    const savedTheme = getTheme();

    if (themeSelect) {
      themeSelect.value = savedTheme;
      themeSelect.addEventListener("change", (e) => setTheme(e.target.value));
    }

    // Aplicar tema (si es "auto", resolver el esquema del sistema)
    applyTheme(savedTheme === "auto" ? getSystemTheme() : savedTheme);

    // Aplicar barras del sistema una vez pintado el tema
    scheduleApplySystemBars(1);
    // Reaccionar a cambios de esquema del SO
    listenSystemScheme();
    // Observar cambios en data-theme causados por terceros
    observeThemeAttribute();

    // En el evento load, volver a aplicar brevemente (evitar parpadeos)
    window.addEventListener("load", () => scheduleApplySystemBars(1));

    /* ===========
       Idioma
       =========== */
    updateTexts();

    const langSelect = document.getElementById("langSelect");
    if (langSelect) {
      langSelect.value = getLang();
      langSelect.addEventListener("change", async (e) => {
        setLang(e.target.value);
        updateTexts();
        await mostrarPartidosYClasificacion();
      });
    }

    /* ===========
       Menú lateral
       =========== */
    const menuBtn = document.getElementById("menuBtn");
    const sideMenu = document.getElementById("sideMenu");
    const sideMenuOverlay = document.getElementById("sideMenuOverlay");
    const equipoBtns = document.querySelectorAll(".equipoOpt");

    if (menuBtn && sideMenu && sideMenuOverlay) {
      menuBtn.addEventListener("click", () => {
        sideMenu.classList.add("open");
        sideMenuOverlay.classList.add("open");
      });
      sideMenuOverlay.addEventListener("click", () => {
        sideMenu.classList.remove("open");
        sideMenuOverlay.classList.remove("open");
      });
    }

    if (sideMenu && sideMenuOverlay && equipoBtns.length > 0) {
      /**
       * Marcar visualmente el equipo activo en el menú lateral.
       * @returns {void}
       */
      function marcarEquipoActivo() {
        const seleccionado = localStorage.getItem("equipoLoyola") || "A";
        equipoBtns.forEach((btn) => {
          btn.classList.toggle(
            "active",
            btn.getAttribute("data-equipo") === seleccionado
          );
        });
      }

      // Cambiar equipo rápido desde el menú lateral (preferencia local distinta al selector de competiciones)
      equipoBtns.forEach((btn) => {
        btn.addEventListener("click", async () => {
          const equipo = btn.getAttribute("data-equipo");
          localStorage.setItem("equipoLoyola", equipo);
          sideMenu.classList.remove("open");
          sideMenuOverlay.classList.remove("open");
          marcarEquipoActivo();
          await mostrarPartidosYClasificacion();
        });
      });

      marcarEquipoActivo();
    }

    /* =================
       Pull to refresh
       ================= */
    const ptr = document.getElementById("pullToRefresh");
    const ptrIcon = document.getElementById("ptrIcon");
    const ptrText = document.getElementById("ptrText");
    const matchesList = document.getElementById("matches");

    let startY = null;
    let pulling = false;
    const threshold = 56;
    let refreshing = false;

    /**
     * Restablecer el estado visual del PTR.
     * @returns {void}
     */
    function resetPTR() {
      if (ptr) ptr.classList.remove("active");
      if (ptrIcon) ptrIcon.classList.remove("rotate");
      if (ptrText) ptrText.textContent = "Desliza para refrescar...";
      pulling = false;
      startY = null;
    }

    if (matchesList) {
      // Iniciar gesto si se está en top de scroll
      matchesList.addEventListener("touchstart", (e) => {
        const scrollEl = document.scrollingElement || document.documentElement;
        if (
          (scrollEl.scrollTop <= 2 || scrollEl.scrollTop === 0) &&
          !refreshing
        ) {
          startY = e.touches[0].clientY;
          pulling = true;
        } else {
          pulling = false;
          startY = null;
        }
      });

      // Actualizar feedback visual mientras se arrastra
      matchesList.addEventListener("touchmove", (e) => {
        if (!pulling || refreshing) return;
        const delta = e.touches[0].clientY - startY;
        if (!ptr || !ptrIcon || !ptrText) return;

        if (delta > 0) {
          ptr.classList.add("active");
          if (delta > threshold) {
            ptrIcon.classList.add("rotate");
            ptrText.textContent = "Suelta para refrescar...";
          } else {
            ptrIcon.classList.remove("rotate");
            ptrText.textContent = "Desliza para refrescar...";
          }
        } else {
          ptr.classList.remove("active");
        }
      });

      // Ejecutar refresco si se superó el umbral
      matchesList.addEventListener("touchend", async (e) => {
        if (!pulling || refreshing) return;

        const delta = e.changedTouches[0].clientY - startY;

        if (delta > threshold) {
          refreshing = true;
          if (ptrText) ptrText.textContent = "Actualizando...";

          // Detectar si la vista activa es "Clasificación" o "Partidos"
          const navClasEl = document.getElementById("navClas");

          try {
            if (navClasEl?.classList.contains("active")) {
              // Refrescar clasificación
              const listEl = document.getElementById("matches");
              listEl.innerHTML = "";
              listEl.innerHTML = `<li>${t("loading")}</li>`;

              if (!equipoSeleccionado) {
                listEl.innerHTML = `<li>Selecciona un equipo Loyola</li>`;
                setCompeticionHeader("");
              } else {
                const [idComp] = equipoSeleccionado.split("|");
                const eq = equiposLoyola.find((e) => e.idCompeticion == idComp);
                setCompeticionHeader(eq?.nombreCompeticion || "");

                const raw = await getClasificacionLiga(idComp);
                listEl.innerHTML = "";
                renderClasificacion(listEl, raw);
              }
            } else {
              // Refrescar partidos
              await mostrarPartidosYClasificacion();
            }
          } catch (e2) {
            // Mostrar error en la propia lista si algo falla
            const listEl = document.getElementById("matches");
            listEl.innerHTML = `<li>${t(
              "error",
              e2?.message || String(e2)
            )}</li>`;
          } finally {
            // Suavizar el cierre del PTR para feedback visual
            setTimeout(() => {
              refreshing = false;
              resetPTR();
            }, 600);
          }
        } else {
          resetPTR();
        }
      });
    }

    /* =========================
       Crear selector si no existe
       ========================= */
    let selector = document.getElementById("equipoLoyolaSelect");
    if (!selector) {
      selector = document.createElement("select");
      selector.id = "equipoLoyolaSelect";
      selector.style.margin = "1em auto";
      selector.style.display = "block";
      const menu = document.getElementById("sideMenu") || document.body;
      menu.appendChild(selector);
    }

    /* =========================
       Carga inicial y primer render
       ========================= */
    await cargarSelectorEquiposLoyola(); // poblar selector (+ estado seleccionado)
    await mostrarPartidosYClasificacion(); // pintar lista inicial acorde al estado
  } catch (err) {
    // Importante: al ser async este listener, el try/catch captura rechazos de await
    mostrarPantallaErrorGlobal(err);
  }
});
