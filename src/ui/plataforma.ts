import { isPlatform } from '@ionic/react';

import type { DestinoMapa } from '../domain';

export type ModoIonic = 'ios' | 'md';

/**
 * En Android (la app y el navegador) el modo `md` de Ionic: flecha de atrás
 * sin texto, título a la izquierda, transición y pulsación de Android. En el
 * resto, `ios`, que es el producto principal (la PWA del iPhone).
 */
export const modoIonic = (): ModoIonic =>
  isPlatform('android') ? 'md' : 'ios';

/** Qué mapa abrir: el del sistema en Android y en iPhone/iPad, Google en el resto. */
export const destinoMapa = (): DestinoMapa =>
  isPlatform('android') ? 'geo' : isPlatform('ios') ? 'apple' : 'google';

/**
 * Abre una dirección como si se pulsara un enlace: `geo:` y `webcal:` los
 * resuelve el sistema, y las `https` van a otra pestaña. Sirve donde no cabe
 * un `<a>` (dentro de otro enlace, en el botón de una hoja).
 */
export function abrirEnlace(url: string, aparte = /^https?:/.test(url)) {
  const a = document.createElement('a');
  a.href = url;
  if (aparte) a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
}
