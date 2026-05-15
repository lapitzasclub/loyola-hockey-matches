// errorOverlay.js
// Gestión de error global y overlay
import { t } from "../i18n.js";

export function formatError(err) {
  if (err instanceof Error) {
    return err.stack || err.message;
  }
  if (typeof err === "object") {
    try {
      return JSON.stringify(err, null, 2);
    } catch {
      return Object.prototype.toString.call(err);
    }
  }
  return String(err);
}

export function mostrarPantallaErrorGlobal(error, cargarSelectorEquiposLoyola, mostrarPartidosYClasificacion) {
  let errorOverlay = document.getElementById("errorOverlayGlobal");
  if (errorOverlay) errorOverlay.remove();

  const detail = error?.message || formatError(error);

  errorOverlay = document.createElement("div");
  errorOverlay.id = "errorOverlayGlobal";
  errorOverlay.className = "error-overlay";
  errorOverlay.innerHTML = `
    <div class="error-overlay-backdrop"></div>
    <section class="error-overlay-card" role="alertdialog" aria-modal="true" aria-labelledby="errorOverlayTitle">
      <div class="error-overlay-icon" aria-hidden="true">⚠️</div>
      <div class="error-overlay-copy">
        <p class="error-overlay-kicker">${t("global_error_kicker")}</p>
        <h2 id="errorOverlayTitle" class="error-overlay-title">${t("global_error_title")}</h2>
        <p class="error-overlay-message">${t("global_error_message")}</p>
      </div>
      <div class="error-overlay-actions">
        <button id="btnRetryApp" class="error-overlay-btn error-overlay-btn-primary">${t("global_error_retry")}</button>
        <button id="btnReloadApp" class="error-overlay-btn error-overlay-btn-secondary">${t("global_error_reload")}</button>
      </div>
      <details class="error-overlay-details">
        <summary>${t("global_error_details")}</summary>
        <pre class="error-overlay-pre">${detail}</pre>
      </details>
    </section>
  `;

  document.body.appendChild(errorOverlay);

  document.getElementById("btnRetryApp").onclick = async () => {
    const retryBtn = document.getElementById("btnRetryApp");
    if (retryBtn) {
      retryBtn.disabled = true;
      retryBtn.textContent = t("global_error_retrying");
    }

    try {
      errorOverlay.remove();
      await cargarSelectorEquiposLoyola?.(mostrarPartidosYClasificacion, mostrarPantallaErrorGlobal);
      await mostrarPartidosYClasificacion?.();
    } catch (err) {
      mostrarPantallaErrorGlobal(err, cargarSelectorEquiposLoyola, mostrarPartidosYClasificacion);
    }
  };

  document.getElementById("btnReloadApp").onclick = () => {
    window.location.reload();
  };
}
