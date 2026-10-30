import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './es.json';
import eu from './eu.json';

export const IDIOMAS = ['es', 'eu'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Idioma inicial: el del navegador si lo soportamos, castellano si no. */
export function detectarIdioma(navegador: string | undefined): Idioma {
  const base = navegador?.toLowerCase().split('-')[0];
  return IDIOMAS.find((i) => i === base) ?? 'es';
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, eu: { translation: eu } },
  lng: detectarIdioma(globalThis.navigator?.language),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
