import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './es.json';
import eu from './eu.json';

export const IDIOMAS = ['es', 'eu'] as const;
export type Idioma = (typeof IDIOMAS)[number];

const CLAVE = 'loyola.idioma';

const soportado = (valor: string | null | undefined): Idioma | undefined =>
  IDIOMAS.find((i) => i === valor);

/** Idioma inicial: el del navegador si lo soportamos, castellano si no. */
export function detectarIdioma(navegador: string | undefined): Idioma {
  return soportado(navegador?.toLowerCase().split('-')[0]) ?? 'es';
}

function idiomaGuardado(): Idioma | undefined {
  try {
    return soportado(localStorage.getItem(CLAVE));
  } catch {
    return undefined;
  }
}

/** Cambia el idioma de la app y lo recuerda para la próxima apertura. */
export function cambiarIdioma(idioma: Idioma) {
  try {
    localStorage.setItem(CLAVE, idioma);
  } catch {
    // Sin almacenamiento el idioma vale para esta sesión.
  }
  void i18n.changeLanguage(idioma);
}

i18n.on('languageChanged', (idioma) => {
  if (typeof document !== 'undefined') document.documentElement.lang = idioma;
});

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, eu: { translation: eu } },
  lng: idiomaGuardado() ?? detectarIdioma(globalThis.navigator?.language),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
