import type { Fase } from './competicion';
import type { Equipo } from './equipo';
import { indiceProximoPartido } from './calendario';
import { juega, ordenarPartidos } from './partido';
import type { PartidoResumen } from './partido';
import { resultadoPara } from './racha';
import type { Racha } from './racha';

/** Resultados y goles de un equipo en un conjunto de partidos. */
export interface Balance {
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
}

export interface BalanceEquipo {
  total: Balance;
  local: Balance;
  visitante: Balance;
  /** Goles a favor por partido; 0 sin partidos. */
  promedioFavor: number;
  promedioContra: number;
  /** 0–100. */
  porcentajeVictorias: number;
  porteriasACero: number;
  sinMarcar: number;
  /** Todos los resultados, de más antiguo a más reciente. */
  racha: Racha;
}

const vacio = (): Balance => ({ pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 });

function sumar(balance: Balance, propios: number, ajenos: number) {
  balance.pj += 1;
  balance.gf += propios;
  balance.gc += ajenos;
  if (propios > ajenos) balance.pg += 1;
  else if (propios < ajenos) balance.pp += 1;
  else balance.pe += 1;
}

const media = (suma: number, partidos: number) =>
  partidos === 0 ? 0 : suma / partidos;

/**
 * Balance de un equipo con sus partidos terminados. Cuenta el resultado
 * oficial (`marcadorOficial`), que es el que vale para la clasificación, no
 * los goles del acta.
 */
export function balanceEquipo(
  partidos: readonly PartidoResumen[],
  inscripcionId: string,
): BalanceEquipo {
  const total = vacio();
  const local = vacio();
  const visitante = vacio();
  let porteriasACero = 0;
  let sinMarcar = 0;

  const jugados = ordenarPartidos(partidos).filter(
    (p) => juega(p, inscripcionId) && resultadoPara(p, inscripcionId) !== null,
  );
  for (const p of jugados) {
    const m = p.marcadorOficial;
    if (!m) continue;
    const esLocal = p.local?.inscripcionId === inscripcionId;
    const propios = esLocal ? m.local : m.visitante;
    const ajenos = esLocal ? m.visitante : m.local;
    sumar(total, propios, ajenos);
    sumar(esLocal ? local : visitante, propios, ajenos);
    if (ajenos === 0) porteriasACero += 1;
    if (propios === 0) sinMarcar += 1;
  }

  return {
    total,
    local,
    visitante,
    promedioFavor: media(total.gf, total.pj),
    promedioContra: media(total.gc, total.pj),
    porcentajeVictorias: media(total.pg * 100, total.pj),
    porteriasACero,
    sinMarcar,
    racha: jugados.flatMap((p) => resultadoPara(p, inscripcionId) ?? []),
  };
}

/** El equipo tal como lo trae el calendario (con su `inscripcionId`); null si no juega. */
export function equipoDeCalendario(
  partidos: readonly PartidoResumen[],
  inscripcionId: string,
): Equipo | null {
  for (const p of partidos) {
    for (const e of [p.local, p.visitante]) {
      if (e?.inscripcionId === inscripcionId) return e;
    }
  }
  return null;
}

/**
 * Fase de liga cuya tabla describe al equipo ahora: la de su próximo partido
 * (o el último si todo terminó), con `hoy` como `YYYY-MM-DD`. Sin partidos de
 * liga, la primera fase.
 */
export function faseDelEquipo(
  fases: readonly Fase[],
  partidos: readonly PartidoResumen[],
  inscripcionId: string,
  hoy: string,
): Fase | null {
  const ligas = new Set(
    fases.filter((f) => f.formato === 'liga').map((f) => f.id),
  );
  const suyos = ordenarPartidos(partidos).filter(
    (p) => juega(p, inscripcionId) && p.faseId !== null && ligas.has(p.faseId),
  );
  const actual = suyos[indiceProximoPartido(suyos, hoy)];
  const fase = fases.find((f) => f.id === actual?.faseId);
  return fase ?? fases.find((f) => f.formato === 'liga') ?? fases[0] ?? null;
}
