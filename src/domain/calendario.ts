import { mismoEquipo } from './equipo';
import type { Equipo } from './equipo';
import type { EstadoPartido } from './estado';
import type { MarcadorDirecto } from './marcador';
import { compararPorFechaHora } from './partido';
import type { Marcador, PartidoResumen } from './partido';

/**
 * Lo que se enseña de un partido: a los tres estados de la API se suma
 * «aplazado», un partido ya pasado que sigue sin resultado (aplazado o
 * suspendido; la API no lo marca de forma explícita).
 */
export type EstadoVisible = EstadoPartido | 'aplazado';

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
  return partido.estado === 'programado' && partido.fecha < hoy
    ? 'aplazado'
    : partido.estado;
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
 * Cruza el calendario con `/marcadores`, que va por delante del árbol en un
 * partido empezado. El estado en juego de `/marcadores` manda; el marcador
 * oficial solo se enseña si no coincide con el real.
 */
export function partidoVisible(
  partido: PartidoResumen,
  hoy: string,
  directo?: MarcadorDirecto,
): PartidoVisible {
  const enJuego =
    directo?.estado === 'en_juego' && partido.estado !== 'finalizado';
  const estado = enJuego ? 'en_juego' : estadoVisible(partido, hoy);
  const marcador = enJuego ? directo.goles : partido.marcador;
  const oficial = enJuego ? directo.oficial : partido.marcadorOficial;
  return {
    partido,
    estado,
    marcador,
    oficial: oficial && marcador && !igual(oficial, marcador) ? oficial : null,
  };
}
