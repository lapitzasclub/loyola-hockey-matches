import { ErrorApi } from '../transport';
import type { PeticionApi, Transporte } from '../transport';
import {
  fixture,
  fixturePartido,
  fixturesDivision,
  fixturesJugadores,
  muestra,
  partidosMuestra,
} from '.';

export interface TransporteFixtures extends Transporte {
  /** Peticiones recibidas, en orden. */
  peticiones: PeticionApi[];
}

function slugDeDivision(divisionId: string): string | undefined {
  return muestra().find((m) => m.divisionId === divisionId)?.slug;
}

function deDivision(divisionId: string, recurso: string): unknown {
  const slug = slugDeDivision(divisionId);
  if (!slug) return undefined;
  if (recurso === 'estadisticas-jugadores') {
    const j = fixturesJugadores();
    return slug === j.slug ? j.estadisticas : undefined;
  }
  const f = fixturesDivision(slug);
  if (recurso === 'fases') return f.fases;
  if (recurso === 'equipos') return f.equipos;
  if (recurso === 'tree') return f.tree;
  return undefined;
}

type Ruta = [RegExp, (ids: string[], peticion: PeticionApi) => unknown];

const RUTAS: Ruta[] = [
  [/^\/public\/agenda$/, () => fixture('agenda.json')],
  [/^\/public\/partidos\/marcadores$/, () => fixture('marcadores.json')],
  [
    /^\/hierarchy\/competiciones\/divisiones$/,
    (_, { metodo, cuerpo }) => {
      if (metodo !== 'POST') return undefined;
      const ids = new Set(cuerpo as string[]);
      const todas = fixture('divisiones.json') as { competicionId: string }[];
      return todas.filter((d) => ids.has(d.competicionId));
    },
  ],
  [
    /^\/hierarchy\/fase\/([^/]+)\/clasificacion$/,
    ([faseId = '']) => {
      const entrada = muestra().find((e) => e.faseIds.includes(faseId));
      return (
        entrada && fixturesDivision(entrada.slug).clasificaciones.get(faseId)
      );
    },
  ],
  [
    /^\/hierarchy\/division\/([^/]+)\/equipo\/([^/]+)\/plantilla$/,
    ([divisionId = '', equipoId]) => {
      const j = fixturesJugadores();
      return slugDeDivision(divisionId) === j.slug && equipoId === j.equipoId
        ? j.plantilla
        : undefined;
    },
  ],
  [
    /^\/hierarchy\/division\/([^/]+)\/([a-z-]+)$/,
    ([divisionId = '', recurso = '']) => deDivision(divisionId, recurso),
  ],
  [
    /^\/public\/partidos\/jugador\/([^/]+)\/stats$/,
    ([id = '']) => {
      const j = fixturesJugadores();
      return [j.goleadorId, j.porteroId].includes(id) ? j.stats(id) : undefined;
    },
  ],
  [
    /^\/public\/partidos\/([^/]+)$/,
    ([id]) => {
      const partido = partidosMuestra().find((p) => p.id === id);
      return partido && fixturePartido(partido.clave);
    },
  ],
];

function responder(peticion: PeticionApi): unknown {
  for (const [patron, contestar] of RUTAS) {
    const m = patron.exec(peticion.ruta);
    if (m) return contestar(m.slice(1), peticion);
  }
  return undefined;
}

/**
 * Transporte que contesta con las fixtures capturadas, como si fuera la API:
 * lo que no está en la muestra es un 404. Copia cada respuesta para que un
 * test no pueda mutar la fixture de otro.
 */
export function transporteDeFixtures(): TransporteFixtures {
  const peticiones: PeticionApi[] = [];
  const transporte = async (peticion: PeticionApi) => {
    peticiones.push(peticion);
    peticion.signal?.throwIfAborted();
    const datos = responder(peticion);
    if (datos === undefined) throw new ErrorApi(404, peticion.ruta);
    return structuredClone(datos);
  };
  return Object.assign(transporte, { peticiones });
}
