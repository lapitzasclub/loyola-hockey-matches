import { isPlatform } from '@ionic/react';

export type ModoIonic = 'ios' | 'md';

/**
 * En Android (la app y el navegador) el modo `md` de Ionic: flecha de atrás
 * sin texto, título a la izquierda, transición y pulsación de Android. En el
 * resto, `ios`, que es el producto principal (la PWA del iPhone).
 */
export const modoIonic = (): ModoIonic =>
  isPlatform('android') ? 'md' : 'ios';
