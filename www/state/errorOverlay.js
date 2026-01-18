// errorOverlay.js
// Gestión de error global y overlay

export function formatError(err) {
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

export function mostrarPantallaErrorGlobal(error, cargarSelectorEquiposLoyola, mostrarPartidosYClasificacion) {
  let errorOverlay = document.getElementById("errorOverlayGlobal");
  if (errorOverlay) errorOverlay.remove();
  errorOverlay = document.createElement("div");
  errorOverlay.id = "errorOverlayGlobal";
  errorOverlay.className = "error-overlay";
  errorOverlay.innerHTML = `
    <div class="error-overlay-content">
      <h2 class="error-overlay-title">Error crítico</h2>
      <pre class="error-overlay-pre">${error?.stack || error?.message || formatError(error)}</pre>
      <button id="btnReiniciarApp" class="error-overlay-btn">Reiniciar app</button>
    </div>
  `;
  document.body.appendChild(errorOverlay);
  document.getElementById("btnReiniciarApp").onclick = async () => {
    errorOverlay.remove();
    try {
      await cargarSelectorEquiposLoyola();
      await mostrarPartidosYClasificacion();
    } catch (err) {
      mostrarPantallaErrorGlobal(err, cargarSelectorEquiposLoyola, mostrarPartidosYClasificacion);
    }
  };
}
