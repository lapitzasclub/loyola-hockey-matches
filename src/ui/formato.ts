/** `YYYY-MM-DD` como fecha local (sin pasar por UTC, que correría el día). */
function aFecha(fecha: string): Date {
  const [anio = 0, mes = 1, dia = 1] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function formatoDia(fecha: string, idioma: string): string {
  return new Intl.DateTimeFormat(idioma, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(aFecha(fecha));
}

/** `YYYY-MM` → «octubre 2026». */
export function formatoMes(mes: string, idioma: string): string {
  return new Intl.DateTimeFormat(idioma, {
    month: 'long',
    year: 'numeric',
  }).format(aFecha(`${mes}-01`));
}

/** Reloj de una incidencia: `7:05`. */
export function formatoCrono(minuto: number, segundo: number): string {
  return `${minuto}:${String(segundo).padStart(2, '0')}`;
}
