import { useEffect, useState } from 'react';

import { PREFERENCIAS_TEMA } from '../ui/tema';
import type { PreferenciaTema } from '../ui/tema';
import { colorDelTema, pintarBarrasSistema } from './barrasSistema';
/** Valor de body[data-theme]. */
export type Tema = 'light' | 'dark';

const CLAVE = 'loyola.tema';
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

export function temaEfectivo(
  preferencia: PreferenciaTema,
  sistemaOscuro: boolean,
): Tema {
  if (preferencia === 'sistema') return sistemaOscuro ? 'dark' : 'light';
  return preferencia === 'oscuro' ? 'dark' : 'light';
}

export function leerPreferenciaTema(): PreferenciaTema {
  try {
    const guardada = localStorage.getItem(CLAVE);
    return PREFERENCIAS_TEMA.find((p) => p === guardada) ?? 'sistema';
  } catch {
    return 'sistema';
  }
}

function guardarPreferenciaTema(preferencia: PreferenciaTema) {
  try {
    localStorage.setItem(CLAVE, preferencia);
  } catch {
    // Sin almacenamiento (navegación privada) el tema vale para esta sesión.
  }
}

const sistemaOscuro = () =>
  globalThis.matchMedia?.(CONSULTA_OSCURO).matches ?? false;

/**
 * Pone el tema en el body y alinea con él lo que queda fuera del DOM: el
 * `theme-color` (barra del navegador y splash de la PWA) y las barras de
 * sistema de Android.
 */
export function aplicarTema(tema: Tema) {
  document.body.dataset.theme = tema;
  const barra = colorDelTema('--app-barra-superior');
  if (barra) {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', barra);
  }
  void pintarBarrasSistema();
}

/** Se llama antes de montar React para no pintar un fotograma con el tema equivocado. */
export function aplicarTemaInicial() {
  aplicarTema(temaEfectivo(leerPreferenciaTema(), sistemaOscuro()));
}

/** Preferencia de tema persistida; con «sistema» sigue los cambios del sistema en caliente. */
export function useTema() {
  const [preferencia, setPreferencia] = useState(leerPreferenciaTema);

  useEffect(() => {
    aplicarTema(temaEfectivo(preferencia, sistemaOscuro()));
    if (preferencia !== 'sistema') return;
    const consulta = globalThis.matchMedia?.(CONSULTA_OSCURO);
    if (!consulta) return;
    const alCambiar = (e: MediaQueryListEvent) =>
      aplicarTema(temaEfectivo('sistema', e.matches));
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, [preferencia]);

  const cambiar = (nueva: PreferenciaTema) => {
    guardarPreferenciaTema(nueva);
    setPreferencia(nueva);
  };

  return [preferencia, cambiar] as const;
}
