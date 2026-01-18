// pullToRefresh.js
// Lógica de pull-to-refresh
import { t } from "../i18n.js";
import { renderClasificacion } from "../components/ui.js";
import { setCompeticionHeader } from "./header.js";
import { getEquiposLoyola, getEquipoSeleccionado } from "../state/equipos.js";
import { getClasificacionLiga } from "../api.js";

export function setupPullToRefresh(mostrarPartidosYClasificacion) {
  const ptr = document.getElementById("pullToRefresh");
  const ptrIcon = document.getElementById("ptrIcon");
  const ptrText = document.getElementById("ptrText");
  const matchesList = document.getElementById("matches");
  let startY = null;
  let pulling = false;
  const threshold = 56;
  let refreshing = false;
  function resetPTR() {
    if (ptr) ptr.classList.remove("active");
    if (ptrIcon) ptrIcon.classList.remove("rotate");
    if (ptrText) ptrText.textContent = "Desliza para refrescar...";
    pulling = false;
    startY = null;
  }

  // Detectar el elemento con scroll vertical
  function getScrollOwner() {
    // matchesList suele ser <ul>, pero puede que el scroll esté en <main>
    const main = document.querySelector("main");
    if (main && main.scrollHeight > main.clientHeight) return main;
    if (matchesList && matchesList.scrollHeight > matchesList.clientHeight)
      return matchesList;
    // fallback: body
    return document.scrollingElement || document.documentElement;
  }

  if (matchesList) {
    matchesList.addEventListener("touchstart", (e) => {
      const scrollEl = getScrollOwner();
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
    matchesList.addEventListener("touchmove", (e) => {
      if (!pulling || refreshing) return;
      const scrollEl = getScrollOwner();
      if (!(scrollEl.scrollTop <= 2 || scrollEl.scrollTop === 0)) {
        pulling = false;
        ptr.classList.remove("active");
        return;
      }
      const delta = e.touches[0].clientY - startY;
      if (!ptr || !ptrIcon || !ptrText) return;
      if (delta > 10) {
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
    matchesList.addEventListener("touchend", async (e) => {
      if (!pulling || refreshing) return;
      const scrollEl = getScrollOwner();
      if (!(scrollEl.scrollTop <= 2 || scrollEl.scrollTop === 0)) {
        resetPTR();
        return;
      }
      const delta = e.changedTouches[0].clientY - startY;
      if (delta > threshold) {
        refreshing = true;
        if (ptrText) ptrText.textContent = "Actualizando...";
        const navClasEl = document.getElementById("navClas");
        try {
          if (navClasEl?.classList.contains("active")) {
            const listEl = document.getElementById("matches");
            listEl.innerHTML = "";
            listEl.innerHTML = `<li>${t("loading")}</li>`;
            if (!getEquipoSeleccionado()) {
              if (
                getEquipoSeleccionado() === null ||
                getEquipoSeleccionado() === undefined
              ) {
                listEl.innerHTML = `<li>Selecciona un equipo Loyola</li>`;
                setCompeticionHeader("");
              } else {
                const [idComp] = getEquipoSeleccionado().split("|");
                const eq = getEquiposLoyola().find(
                  (e) => e.idCompeticion == idComp
                );
                setCompeticionHeader(eq?.nombreCompeticion || "");
                const raw = await getClasificacionLiga(idComp);
                listEl.innerHTML = "";
                renderClasificacion(listEl, raw);
              }
            } else {
              const [idComp] = getEquipoSeleccionado().split("|");
              const eq = getEquiposLoyola().find(
                (e) => e.idCompeticion == idComp
              );
              setCompeticionHeader(eq?.nombreCompeticion || "");
              const raw = await getClasificacionLiga(idComp);
              listEl.innerHTML = "";
              renderClasificacion(listEl, raw);
            }
          } else {
            await mostrarPartidosYClasificacion();
          }
        } catch (e2) {
          const listEl = document.getElementById("matches");
          listEl.innerHTML = `<li>${t(
            "error",
            error_?.message || String(error_)
          )}</li>`;
        } finally {
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
}
