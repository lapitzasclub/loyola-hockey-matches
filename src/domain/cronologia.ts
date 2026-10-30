import type { Alineacion, MiembroAlineacion } from './alineacion';
import { esStaff } from './alineacion';
import type { PartidoDetalle } from './detalle';
import { ordenarIncidencias } from './incidencia';
import type { Incidencia, Lado, PersonaIncidencia } from './incidencia';
import type { Marcador } from './partido';
import { PERIODO_PENALTIS } from './periodo';

export interface FilaCronologia {
  incidencia: Incidencia;
  /** Marcador real tras el gol; null en el resto de incidencias. */
  marcador: Marcador | null;
}

export interface GrupoPeriodo {
  periodo: number;
  filas: FilaCronologia[];
}

/**
 * Incidencias que cuentan en la línea de eventos. Se dejan fuera las paradas
 * (decenas por partido), la tanda (tiene su propia vista) y los penaltis y
 * faltas directas convertidos, que la API manda duplicados con su GOL.
 */
export function esEventoVisible(incidencia: Incidencia): boolean {
  switch (incidencia.tipo) {
    case 'PARADA':
      return false;
    case 'PENALTI':
    case 'FALTADIRECTA':
      return (
        incidencia.periodo !== PERIODO_PENALTIS &&
        incidencia.resultado !== 'gol'
      );
    default:
      return incidencia.periodo !== PERIODO_PENALTIS;
  }
}

/**
 * Línea de eventos agrupada por periodo, en orden cronológico, con el
 * marcador acumulado en cada gol. Los goles se cuentan todos (también los
 * que no se ven) para que el marcador no dependa del filtro.
 */
export function cronologia(incidencias: readonly Incidencia[]): GrupoPeriodo[] {
  const goles: Marcador = { local: 0, visitante: 0 };
  const grupos: GrupoPeriodo[] = [];
  for (const incidencia of ordenarIncidencias(incidencias)) {
    let marcador: Marcador | null = null;
    if (incidencia.tipo === 'GOL' && incidencia.periodo !== PERIODO_PENALTIS) {
      goles[incidencia.lado] += 1;
      marcador = { ...goles };
    }
    if (!esEventoVisible(incidencia)) continue;
    let grupo = grupos.at(-1);
    if (grupo?.periodo !== incidencia.periodo) {
      grupo = { periodo: incidencia.periodo, filas: [] };
      grupos.push(grupo);
    }
    grupo.filas.push({ incidencia, marcador });
  }
  return grupos;
}

/** Totales de un lado para la tabla del resumen. */
export interface TotalesLado {
  goles: number;
  faltas: number;
  azules: number;
  amarillas: number;
  rojas: number;
  tiemposMuertos: number;
}

export type TotalesPartido = Record<Lado, TotalesLado>;

const vacio = (): TotalesLado => ({
  goles: 0,
  faltas: 0,
  azules: 0,
  amarillas: 0,
  rojas: 0,
  tiemposMuertos: 0,
});

/** Cuenta incidencias por lado; la tanda de penaltis no suma goles. */
export function totalesPartido(
  incidencias: readonly Incidencia[],
): TotalesPartido {
  const totales: TotalesPartido = { local: vacio(), visitante: vacio() };
  for (const i of incidencias) {
    const lado = totales[i.lado];
    switch (i.tipo) {
      case 'GOL':
        if (i.periodo !== PERIODO_PENALTIS) lado.goles += 1;
        break;
      case 'FALTA':
      case 'FALTA-HL':
        lado.faltas += 1;
        break;
      case 'TARJETAAZUL':
        lado.azules += 1;
        break;
      case 'TARJETAAMARILLA':
        lado.amarillas += 1;
        break;
      case 'TARJETAROJA':
        lado.rojas += 1;
        break;
      case 'TM':
        lado.tiemposMuertos += 1;
        break;
    }
  }
  return totales;
}

/** Alineaciones de ambos lados por `plantillaEquipoId`. */
export type IndiceAlineacion = ReadonlyMap<string, MiembroAlineacion>;

export function indiceAlineacion(
  partido: Pick<PartidoDetalle, 'local' | 'visitante'>,
): IndiceAlineacion {
  const indice = new Map<string, MiembroAlineacion>();
  for (const { alineacion } of [partido.local, partido.visitante]) {
    for (const m of [...alineacion.jugadores, ...alineacion.staff]) {
      indice.set(m.plantillaEquipoId, m);
    }
  }
  return indice;
}

export interface PersonaVisible {
  plantillaEquipoId: string;
  dorsal: string | null;
  nombre: string;
  /** Solo los jugadores y porteros tienen ficha; el cuerpo técnico, no. */
  conFicha: boolean;
}

/**
 * Persona de una incidencia con lo que le falte (en el directo llega sin
 * dorsal ni nombre) tomado de la alineación. null si no se sabe ni el nombre.
 * Sin alineación se asume jugador si lleva dorsal.
 */
export function personaVisible(
  persona: PersonaIncidencia | null,
  indice: IndiceAlineacion,
): PersonaVisible | null {
  if (!persona) return null;
  const miembro = indice.get(persona.plantillaEquipoId);
  const nombre = persona.nombre ?? miembro?.nombre ?? null;
  if (nombre === null) return null;
  const dorsal = persona.dorsal ?? miembro?.dorsal ?? null;
  return {
    plantillaEquipoId: persona.plantillaEquipoId,
    dorsal,
    nombre,
    conFicha: miembro ? !esStaff(miembro.rol) : dorsal !== null,
  };
}

/** Iniciales para el avatar: la primera letra de las dos primeras palabras. */
export function iniciales(nombre: string): string {
  const palabras = nombre.split(/[\s,]+/).filter(Boolean);
  return palabras
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();
}

export function alineacionVacia(alineacion: Alineacion): boolean {
  return alineacion.jugadores.length === 0 && alineacion.staff.length === 0;
}
