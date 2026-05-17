// pullToRefresh.js
// Lógica de pull-to-refresh
import { getClasificacionLiga } from "../services.js";
import { renderClasificacion } from "../components/ui.js";
import { t } from "../i18n.js";
import { renderClasificacionLoadingState } from "../components/loadingStates.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { invalidateApiCache } from "../utils/apiCache.js";
import { setCompeticionHeader } from "./header.js";

/**
 * Configura el pull-to-refresh para recargar datos y limpiar caché.
 * Permite refrescar la vista de partidos o clasificación deslizando hacia abajo.
 * @param {Function} mostrarPartidosYClasificacion - Callback para mostrar partidos.
 */
export function setupPullToRefresh(mostrarPartidosYClasificacion) {
  const ptr = document.getElementById("pullToRefresh");
  const ptrIcon = document.getElementById("ptrIcon");
  const ptrText = document.getElementById("ptrText");
  const matchesList = document.getElementById("matches");
  const main = document.querySelector("main");
  const threshold = 52;
  const maxPull = 96;
  const activationDelta = 10;
  const horizontalLockDelta = 12;
  const horizontalBias = 1.15;
  let startX = null;
  let startY = null;
  let pulling = false;
  let refreshing = false;
  let horizontalPanLocked = false;
  let eligible = false;
  let ptrTextSwapTimer = null;

  function setPtrIconState(nextState) {
    if (!ptrIcon) return;
    ptrIcon.dataset.state = nextState;
    ptrIcon.classList.toggle("is-ready", nextState === "up");
  }

  function setPtrText(nextText, { immediate = false } = {}) {
    if (!ptrText) return;
    if (ptrText.dataset.stateText === nextText) return;
    if (ptrTextSwapTimer) {
      clearTimeout(ptrTextSwapTimer);
      ptrTextSwapTimer = null;
    }

    if (immediate) {
      ptrText.classList.remove("is-changing");
      ptrText.textContent = nextText;
      ptrText.dataset.stateText = nextText;
      return;
    }

    ptrText.classList.add("is-changing");
    ptrTextSwapTimer = globalThis.setTimeout(() => {
      ptrText.textContent = nextText;
      ptrText.dataset.stateText = nextText;
      ptrText.classList.remove("is-changing");
      ptrTextSwapTimer = null;
    }, 18);
  }

  function getResistedPull(delta) {
    const rawClamped = Math.max(0, Math.min(delta, maxPull));
    if (rawClamped <= 18) return rawClamped * 0.18;
    if (rawClamped <= 42) return 3.24 + (rawClamped - 18) * 0.45;
    return 14.04 + (rawClamped - 42) * 0.82;
  }

  function resetPTR() {
    if (ptr) {
      ptr.classList.remove("active", "ready", "refreshing", "cancelling");
      ptr.style.removeProperty("--ptr-pull");
      ptr.style.removeProperty("--ptr-progress");
      ptr.style.removeProperty("--ptr-seam-opacity");
    }
    if (main) {
      main.classList.remove("ptr-pulling", "ptr-ready", "ptr-refreshing");
      main.style.removeProperty("--ptr-pull");
      main.style.removeProperty("--ptr-progress");
      main.style.removeProperty("--ptr-content-shift");
      main.style.removeProperty("--ptr-content-scale");
      main.style.removeProperty("--ptr-top-split");
      main.style.removeProperty("--ptr-bottom-split");
      main.style.removeProperty("--ptr-ambient-opacity");
    }
    setPtrIconState("down");
    if (ptrTextSwapTimer) {
      clearTimeout(ptrTextSwapTimer);
      ptrTextSwapTimer = null;
    }
    if (ptrText) {
      ptrText.classList.remove("is-changing");
      ptrText.textContent = t("ptr_pull_hint");
      ptrText.dataset.stateText = t("ptr_pull_hint");
    }
    pulling = false;
    horizontalPanLocked = false;
    eligible = false;
    startX = null;
    startY = null;
  }

  function getScrollOwner() {
    if (main && main.scrollHeight > main.clientHeight) return main;
    if (matchesList && matchesList.scrollHeight > matchesList.clientHeight) return matchesList;
    return document.scrollingElement || document.documentElement;
  }

  function isInsideHorizontalClassifier(target) {
    if (!(target instanceof Element)) return false;
    return !!target.closest(".clas-table-wrap");
  }

  function applyPullVisuals(delta) {
    if (!ptr || !ptrIcon || !ptrText) return;
    const clamped = Math.max(0, Math.min(getResistedPull(delta), maxPull));
    const progress = Math.max(0, Math.min(clamped / threshold, 1));

    ptr.classList.toggle("active", clamped > activationDelta);
    ptr.classList.toggle("ready", progress >= 1);
    ptr.style.setProperty("--ptr-pull", `${clamped}px`);
    ptr.style.setProperty("--ptr-progress", progress.toFixed(3));

    if (progress >= 1) {
      setPtrIconState("up");
      setPtrText(t("ptr_release"));
    } else if (clamped > activationDelta) {
      setPtrIconState("down");
      setPtrText(t("ptr_pull_more"), { immediate: true });
    } else {
      setPtrIconState("down");
      setPtrText(t("ptr_pull_hint"), { immediate: true });
    }
  }

  const gestureHost = main || matchesList;

  if (gestureHost) {
    gestureHost.addEventListener("touchstart", (e) => {
      const scrollEl = getScrollOwner();
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      horizontalPanLocked = false;
      eligible = isInsideHorizontalClassifier(e.target);
      if ((scrollEl.scrollTop <= 2 || scrollEl.scrollTop === 0) && !refreshing) {
        pulling = true;
      } else {
        pulling = false;
        startX = null;
        startY = null;
      }
    }, { passive: true });

    gestureHost.addEventListener("touchmove", (e) => {
      if (!pulling || refreshing || startY == null || startX == null) return;
      const scrollEl = getScrollOwner();
      if (!(scrollEl.scrollTop <= 2 || scrollEl.scrollTop === 0)) {
        resetPTR();
        return;
      }

      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;
      const deltaX = touch.clientX - startX;
      const absDeltaY = Math.abs(deltaY);
      const absDeltaX = Math.abs(deltaX);

      if (eligible && (horizontalPanLocked || (absDeltaX > horizontalLockDelta && absDeltaX > absDeltaY * horizontalBias))) {
        horizontalPanLocked = true;
        pulling = false;
        resetPTR();
        return;
      }

      if (deltaY <= 0) {
        applyPullVisuals(0);
        return;
      }

      applyPullVisuals(deltaY);
    }, { passive: true });

    gestureHost.addEventListener("touchend", async (e) => {
      if (!pulling || refreshing || startY == null) {
        resetPTR();
        return;
      }
      const scrollEl = getScrollOwner();
      if (!(scrollEl.scrollTop <= 2 || scrollEl.scrollTop === 0)) {
        resetPTR();
        return;
      }
      const delta = e.changedTouches[0].clientY - startY;
      const resistedPull = getResistedPull(delta);
      if (resistedPull >= threshold) {
        refreshing = true;
        if (ptr) ptr.classList.add("refreshing");
        setPtrIconState("loading");
        setPtrText(t("ptr_refreshing"));
        invalidateApiCache();
        const navClasEl = document.getElementById("navClas");
        const clasRefreshStarted = !!navClasEl?.classList.contains("active");
        try {
          if (clasRefreshStarted) {
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
      } else {
        if (ptr) ptr.classList.add("cancelling");
        setTimeout(() => {
          if (!refreshing) resetPTR();
        }, 160);
      }
    }, { passive: true });

    gestureHost.addEventListener("touchcancel", () => {
      if (!refreshing) resetPTR();
    }, { passive: true });
  }
}
