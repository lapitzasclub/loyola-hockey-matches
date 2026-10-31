import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import type { QueryClient } from '@tanstack/react-query';

import { conectarCentrifugo } from './conexion';
import { instalarDirecto } from './gestor';
import type { EscucharVisibilidad } from './gestor';

/**
 * En la app nativa manda el ciclo de vida de Capacitor: el WebView no
 * siempre avisa con `visibilitychange` al ir a segundo plano.
 */
const visibilidadNativa: EscucharVisibilidad = (alCambiar) => {
  const escucha = App.addListener('appStateChange', ({ isActive }) =>
    alCambiar(isActive),
  );
  return () => void escucha.then((e) => e.remove());
};

function vibrarConGol() {
  if (document.visibilityState !== 'visible') return;
  void Haptics.notification({ type: NotificationType.Success });
}

/** Directo de los partidos abiertos en pantalla; devuelve la desinstalación. */
export function instalarDirectoEnApp(cliente: QueryClient): () => void {
  return instalarDirecto(cliente, {
    conectar: conectarCentrifugo,
    alGol: Capacitor.getPlatform() === 'android' ? vibrarConGol : undefined,
    escucharVisibilidad: Capacitor.isNativePlatform()
      ? visibilidadNativa
      : undefined,
  });
}
