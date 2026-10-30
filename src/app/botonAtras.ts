import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NavContext } from '@ionic/react';
import type { BackButtonEvent } from '@ionic/react';
import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { PESTANA_INICIAL, pestanaDeRuta, rutas } from '../ui/rutas';

export type AccionAtras =
  | { tipo: 'atras'; raiz: string }
  | { tipo: 'inicio'; raiz: string }
  | { tipo: 'salir' };

/**
 * Qué hace el back de Android en una ruta, una vez cerrados los modales (los
 * cierra Ionic antes, con prioridad 100): en un detalle vuelve dentro de la
 * pila de su pestaña; en la raíz de otra pestaña va a la inicial; en la raíz
 * de la inicial sale. No se usa el historial del navegador porque mezcla
 * pestañas: tras cambiar de pestaña, «atrás» volvería a la anterior.
 */
export function accionAtras(pathname: string): AccionAtras {
  const pestana = pestanaDeRuta(pathname);
  const raiz = rutas.raiz(pestana);
  if (pathname.split('/').filter(Boolean).length > 1) {
    return { tipo: 'atras', raiz };
  }
  if (pestana !== PESTANA_INICIAL) {
    return { tipo: 'inicio', raiz: rutas.raiz(PESTANA_INICIAL) };
  }
  return { tipo: 'salir' };
}

/** Por encima del router de Ionic (0) y por debajo de los overlays (100). */
const PRIORIDAD = 10;

/** Va dentro del router. Solo hace algo en la app nativa. */
export function useBotonAtras() {
  const nav = useContext(NavContext);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // `ionBackButton` es un evento propio de Ionic, sin tipo en DocumentEventMap.
    const alAtras = (e: Event) => {
      (e as BackButtonEvent).detail.register(PRIORIDAD, () => {
        const accion = accionAtras(pathname);
        if (accion.tipo === 'atras') nav.goBack(accion.raiz);
        else if (accion.tipo === 'inicio') nav.navigate(accion.raiz, 'back');
        else void App.exitApp();
      });
    };
    document.addEventListener('ionBackButton', alAtras);
    return () => document.removeEventListener('ionBackButton', alAtras);
  }, [nav, pathname]);

  // Con algún listener de `backButton`, Capacitor deja de hacer su back por
  // defecto (historial del WebView o cerrar) y solo avisa a Ionic.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const escucha = App.addListener('backButton', () => {});
    return () => void escucha.then((e) => e.remove());
  }, []);
}
