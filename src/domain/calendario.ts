import { mismoEquipo } from './equipo';
import type { Equipo } from './equipo';
import type { EstadoPartido } from './estado';
import type { MarcadorDirecto } from './marcador';
import { compararPorFechaHora } from './partido';
import type { Marcador, PartidoResumen } from './partido';

/**
 * Lo que se enseña de un partido. La API solo tiene programado, en juego y
 * finalizado; de un programado ya pasado se deduce:
 * - «pendiente»: pasó hace poco y aún no hay resultado (lo habitual es que
 *   la federación no haya subido el acta);
 * - «aplazado»: lleva días sin resultado, así que casi seguro no se jugó.
 */
export type EstadoVisible = EstadoPartido | 'pendiente' | 'aplazado';

/** Días de margen antes de dar por aplazado un partido sin resultado. */
export const DIAS_PARA_APLAZADO = 3;

const MS_DIA = 86_400_000;

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / MS_DIA);
}

/** `YYYY-MM-DD` en hora local, para comparar con `PartidoResumen.fecha`. */
export function fechaLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function estadoVisible(
  partido: Pick<PartidoResumen, 'estado' | 'fecha'>,
  hoy: string,
): EstadoVisible {
  if (partido.estado !== 'programado' || partido.fecha >= hoy) {
    return partido.estado;
  }
  return diasEntre(partido.fecha, hoy) > DIAS_PARA_APLAZADO
    ? 'aplazado'
    : 'pendiente';
}

/** Partidos de un equipo, por fecha y hora. */
export function partidosDeEquipo(
  partidos: readonly PartidoResumen[],
  equipo: Pick<Equipo, 'inscripcionId' | 'equipoId' | 'nombre'>,
): PartidoResumen[] {
  return partidos
    .filter(
      (p) =>
        (p.local && mismoEquipo(p.local, equipo)) ||
        (p.visitante && mismoEquipo(p.visitante, equipo)),
    )
    .sort(compararPorFechaHora);
}

/**
 * Partido al que llevar al usuario al abrir el calendario: el primero de
 * hoy en adelante. Un partido pasado sin terminar puede ser un aplazado, así
 * que solo cuenta si no queda nada por delante; si todo terminó, el último.
 * -1 si no hay partidos.
 */
export function indiceProximoPartido(
  partidos: readonly Pick<PartidoResumen, 'fecha' | 'estado'>[],
  hoy: string,
): number {
  if (partidos.length === 0) return -1;
  const futuro = partidos.findIndex((p) => p.fecha >= hoy);
  if (futuro !== -1) return futuro;
  const pendiente = partidos.findLastIndex((p) => p.estado !== 'finalizado');
  return pendiente !== -1 ? pendiente : partidos.length - 1;
}

export interface GrupoMes {
  /** `YYYY-MM`. */
  mes: string;
  partidos: PartidoResumen[];
}

/** Agrupa partidos ya ordenados por mes, conservando el orden. */
export function agruparPorMes(partidos: readonly PartidoResumen[]): GrupoMes[] {
  const grupos: GrupoMes[] = [];
  for (const partido of partidos) {
    const mes = partido.fecha.slice(0, 7);
    const ultimo = grupos.at(-1);
    if (ultimo?.mes === mes) ultimo.partidos.push(partido);
    else grupos.push({ mes, partidos: [partido] });
  }
  return grupos;
}

/** Partido tal como se pinta: estado y marcador ya resueltos. */
export interface PartidoVisible {
  partido: PartidoResumen;
  estado: EstadoVisible;
  /** Goles reales: del acta si terminó, de `/marcadores` si está en juego. */
  marcador: Marcador | null;
  /** Resultado oficial cuando difiere de los goles (ligas escolares). */
  oficial: Marcador | null;
}

const igual = (a: Marcador, b: Marcador) =>
  a.local === b.local && a.visitante === b.visitante;

/**
 * Cruza el calendario con `/marcadores`, que va por delante del árbol: manda
 * su «en juego» y también su «finalizado» (un partido jugado cuyo acta aún no
 * está en el árbol deja de parecer pendiente o aplazado). El marcador oficial
 * solo se enseña si no coincide con el real.
 */
export function partidoVisible(
  partido: PartidoResumen,
  hoy: string,
  directo?: MarcadorDirecto,
): PartidoVisible {
  const delDirecto =
    directo !== undefined &&
    directo.estado !== 'programado' &&
    partido.estado !== 'finalizado';
  const estado = delDirecto ? directo.estado : estadoVisible(partido, hoy);
  const marcador = delDirecto ? directo.goles : partido.marcador;
  const oficial = delDirecto ? directo.oficial : partido.marcadorOficial;
  return {
    partido,
    estado,
    marcador,
    oficial: oficial && marcador && !igual(oficial, marcador) ? oficial : null,
  };
}
