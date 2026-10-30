import {
  Capacitor,
  SystemBarType,
  SystemBars,
  SystemBarsStyle,
} from '@capacitor/core';

/** Luminancia relativa aproximada: por encima, el contenido de la barra va oscuro. */
export function esColorClaro(hex: string): boolean {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
}

/** Lee un token de color del tema ya aplicado; null si no es hex. */
export function colorDelTema(variable: string): string | null {
  const valor = getComputedStyle(document.body)
    .getPropertyValue(variable)
    .trim();
  return /^#[0-9a-f]{6}$/i.test(valor) ? valor : null;
}

/** Iconos oscuros sobre fondo claro y al revés. */
const estiloSobre = (fondo: string | null) =>
  fondo && esColorClaro(fondo) ? SystemBarsStyle.Light : SystemBarsStyle.Dark;

/**
 * Con targetSdk 36 Android dibuja siempre edge-to-edge: las barras son
 * transparentes y dejan ver la cabecera y la tab bar, que se apartan con las
 * safe areas (`env(safe-area-inset-*)`). Solo queda elegir el color de los
 * iconos de cada barra según el fondo que tienen debajo. En web no hace nada;
 * ahí manda `theme-color`.
 */
export async function pintarBarrasSistema() {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await SystemBars.setStyle({
      style: estiloSobre(colorDelTema('--app-barra-superior')),
      bar: SystemBarType.StatusBar,
    });
    await SystemBars.setStyle({
      style: estiloSobre(colorDelTema('--app-barra-inferior')),
      bar: SystemBarType.NavigationBar,
    });
  } catch (error) {
    console.error('[barras] no se pudo aplicar el estilo', error);
  }
}
