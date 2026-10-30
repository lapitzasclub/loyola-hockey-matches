import type { PartidoDetalle } from '../domain';

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Cuánto se da por bueno cada dato antes de volver a pedirlo en segundo
 * plano. Mientras tanto se pinta lo que hay en caché.
 */
export const FRESCURA = {
  /** Cambia con cada partido que empieza o termina. */
  agenda: MINUTO,
  /** Solo sirve en directo; no se persiste. */
  marcadores: 15 * SEGUNDO,
  /** Equipos de la temporada: cambia muy de vez en cuando. */
  catalogo: 12 * HORA,
  divisiones: 7 * DIA,
  fases: DIA,
  equiposDivision: DIA,
  /** El árbol trae los resultados de la división. */
  calendario: 10 * MINUTO,
  clasificacion: 5 * MINUTO,
  estadisticasJugadores: 30 * MINUTO,
  plantilla: HORA,
  fichaJugador: 30 * MINUTO,
} as const;

/** Cuánto se guarda un dato que no se usa, en memoria y en IndexedDB. */
export const VIDA_CACHE = 7 * DIA;

/**
 * Las actas se corrigen durante la jornada (la v1 se quedaba con resultados
 * a medio cerrar), así que un partido recién terminado se revisa cada media
 * hora; dos días después del día del partido ya no cambia.
 */
const ACTA_ASENTADA = 3 * DIA;

export function frescuraPartido(
  partido: Pick<PartidoDetalle, 'estado' | 'fecha'> | undefined,
  ahora: number = Date.now(),
): number {
  if (!partido) return 0;
  switch (partido.estado) {
    case 'en_juego':
      return 15 * SEGUNDO;
    case 'programado':
      return 5 * MINUTO;
    case 'finalizado': {
      const dia = Date.parse(`${partido.fecha}T00:00:00Z`);
      return ahora - dia > ACTA_ASENTADA ? Infinity : 30 * MINUTO;
    }
  }
}
