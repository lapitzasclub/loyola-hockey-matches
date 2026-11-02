import type { Fase, Leyenda } from './competicion';
import type { Equipo } from './equipo';
import type { PartidoResumen } from './partido';
import { calcularRacha } from './racha';
import type { Racha } from './racha';

export interface FilaClasificacion {
  faseId: string;
  /** null en una fase sin grupos. */
  grupo: { id: string; nombre: string } | null;
  equipo: Equipo;
  puesto: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  /** Puntos quitados o sumados por el comité, con su motivo. */
  ajustePuntos: number;
  ajusteNota: string | null;
  /** Racha que calcula la federación; null si no la manda. */
  racha: Racha | null;
}

export interface TablaClasificacion {
  faseId: string;
  grupo: { id: string; nombre: string } | null;
  /** Ordenadas por puesto. */
  filas: FilaClasificacion[];
  leyendas: Leyenda[];
}

/**
 * Parte las filas de una fase en una tabla por grupo, en el orden en que la
 * fase declara sus grupos. La API mezcla en la misma respuesta las filas de
 * todos los grupos, y un equipo sale una vez por cada grupo en el que está.
 */
export function agruparClasificacion(
  fase: Fase,
  filas: readonly FilaClasificacion[],
): TablaClasificacion[] {
  const tablas = new Map<string, TablaClasificacion>();
  for (const fila of filas) {
    if (fila.faseId !== fase.id) continue;
    const clave = fila.grupo?.id ?? '';
    let tabla = tablas.get(clave);
    if (!tabla) {
      const grupo = fase.grupos.find((g) => g.id === fila.grupo?.id);
      tabla = {
        faseId: fase.id,
        grupo: fila.grupo,
        filas: [],
        leyendas: fila.grupo ? (grupo?.leyendas ?? []) : fase.leyendas,
      };
      tablas.set(clave, tabla);
    }
    tabla.filas.push(fila);
  }
  const orden = (t: TablaClasificacion) => {
    const i = fase.grupos.findIndex((g) => g.id === t.grupo?.id);
    return i === -1 ? fase.grupos.length : i;
  };
  return [...tablas.values()]
    .sort((a, b) => orden(a) - orden(b))
    .map((t) => ({
      ...t,
      filas: [...t.filas].sort((a, b) => a.puesto - b.puesto),
    }));
}

/** Partidos que enseña la racha de la tabla. */
export const PARTIDOS_RACHA = 5;

/**
 * Racha de cada equipo de una tabla, por `inscripcionId`: los últimos
 * partidos de la fase con el resultado oficial. En una tabla de grupo solo
 * cuentan los partidos entre equipos del grupo (ver `calcularRacha`).
 */
export function rachasDeTabla(
  tabla: TablaClasificacion,
  partidos: readonly PartidoResumen[],
  cuantos = PARTIDOS_RACHA,
): Map<string, Racha> {
  const delGrupo = tabla.grupo
    ? new Set(tabla.filas.flatMap((f) => f.equipo.inscripcionId ?? []))
    : undefined;
  const deLaFase = partidos.filter((p) => p.faseId === tabla.faseId);
  const rachas = new Map<string, Racha>();
  for (const { equipo } of tabla.filas) {
    if (!equipo.inscripcionId) continue;
    rachas.set(
      equipo.inscripcionId,
      calcularRacha(equipo.inscripcionId, deLaFase, delGrupo).slice(-cuantos),
    );
  }
  return rachas;
}

/** Fila del equipo en la primera tabla en la que sale (un equipo sale una vez por grupo). */
export function filaDeEquipo(
  tablas: readonly TablaClasificacion[],
  inscripcionId: string,
): FilaClasificacion | null {
  for (const tabla of tablas) {
    const fila = tabla.filas.find(
      (f) => f.equipo.inscripcionId === inscripcionId,
    );
    if (fila) return fila;
  }
  return null;
}

/** Fase que se enseña al abrir la clasificación: la primera de liga, o la primera. */
export function faseInicial(fases: readonly Fase[]): Fase | null {
  return fases.find((f) => f.formato === 'liga') ?? fases[0] ?? null;
}

/**
 * Nombre de grupo para mostrar. La federación los escribe en minúsculas y con
 * el nombre de la competición delante («liga escolar alevín r -clasificación
 * general»): se queda la parte del grupo, con mayúscula inicial.
 */
export function nombreGrupo(nombre: string): string {
  const partes = nombre.split(/\s+-\s*|\s*-\s+/);
  const grupo = (partes.at(-1) ?? '').trim() || nombre.trim();
  return grupo.charAt(0).toLocaleUpperCase('es') + grupo.slice(1);
}
