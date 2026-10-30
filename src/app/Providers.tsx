import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { IonApp, isPlatform, setupIonicReact } from '@ionic/react';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState, type ReactNode } from 'react';

import { consultas } from '../queries';
import {
  almacenIndexedDb,
  crearPersister,
  opcionesPersistencia,
} from './persistencia';
import { createQueryClient } from './queryClient';

setupIonicReact({
  mode: 'ios',
  // En Safari con pestaña el gesto de atrás ya lo hace el navegador y se
  // pisarían; en la PWA instalada (standalone) no hay gesto del sistema.
  swipeBackEnabled: !(isPlatform('ios') && !isPlatform('pwa')),
});

/**
 * Con la caché ya restaurada, pide el catálogo solo si caducó; de paso deja
 * la agenda en caché para la primera pestaña. Va en un efecto hijo y no en
 * `onSuccess` porque el provider esperaría a esa promesa antes de dejar pedir
 * a las pantallas, y porque así se lanza en el mismo commit en que el
 * provider empieza a guardar: ningún cambio se queda sin persistir.
 */
function PrecargaCatalogo() {
  const restaurando = useIsRestoring();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (restaurando) return;
    void queryClient.prefetchQuery(consultas.catalogo());
    // Con la caché ya en pantalla sobra el splash (si no, se oculta solo a los 3 s).
    if (Capacitor.isNativePlatform()) void SplashScreen.hide();
  }, [restaurando, queryClient]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [persister] = useState(() => crearPersister(almacenIndexedDb()));

  // En móvil la app puede morir en segundo plano sin más aviso.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void persister.vaciar();
    };
    document.addEventListener('visibilitychange', alOcultar);
    return () => document.removeEventListener('visibilitychange', alOcultar);
  }, [persister]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={opcionesPersistencia(persister)}
    >
      <PrecargaCatalogo />
      <IonApp>{children}</IonApp>
    </PersistQueryClientProvider>
  );
}
