/**
 * Registra `/sw.js` en la web de producción. Al volver a la app se busca
 * versión nueva (iOS mantiene viva la PWA días); si llega una, la app se
 * recarga la próxima vez que se oculta, para no cambiar nada delante del
 * usuario.
 */
export async function registrarServiceWorker(
  sw: ServiceWorkerContainer | undefined = navigator.serviceWorker,
): Promise<void> {
  if (!sw) return;
  // Sin controlador es la primera instalación: no hay nada viejo que recargar.
  const habiaVersion = Boolean(sw.controller);
  let registro: ServiceWorkerRegistration;
  try {
    registro = await sw.register('/sw.js', { scope: '/' });
  } catch {
    return;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registro.update().catch(() => undefined);
    }
  });

  if (!habiaVersion) return;
  sw.addEventListener('controllerchange', recargarAlOcultar, { once: true });
}

/** Da tiempo a que la caché de datos se guarde al ocultarse (`Providers`). */
const ESPERA_RECARGA_MS = 1000;

function recargarAlOcultar() {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(reloj);
    if (document.visibilityState === 'hidden') {
      reloj = setTimeout(() => location.reload(), ESPERA_RECARGA_MS);
    }
  });
}
