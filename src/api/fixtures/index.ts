/**
 * Acceso a las fixtures capturadas por `scripts/capture-fixtures.ts`. Se
 * cargan con `import.meta.glob` para que TypeScript no infiera el tipo literal
 * de cientos de KB de JSON: todo sale como `unknown` y lo valida Zod.
 */
const archivos = import.meta.glob<unknown>('./**/*.json', {
  eager: true,
  import: 'default',
});

export function fixture(ruta: string): unknown {
  const datos = archivos[`./${ruta}`];
  if (datos === undefined) throw new Error(`No existe la fixture ${ruta}`);
  return datos;
}

export interface MuestraFixture {
  slug: string;
  competicionId: string;
  competicionNombre: string;
  divisionId: string;
  faseIds: string[];
}

export interface FixturesDivision {
  fases: unknown;
  equipos: unknown;
  tree: unknown;
  /** Clasificación de cada fase, por `faseId`. */
  clasificaciones: Map<string, unknown>;
}

/** Detalle de partido de la muestra; `clave` nombra el fichero. */
export interface MuestraPartido {
  clave: string;
  id: string;
  motivo: string;
}

/** Plantilla, goleador y portero del Loyola en la competición `slug`. */
export interface MuestraJugadores {
  slug: string;
  equipoId: string;
  goleadorId: string;
  porteroId: string;
}

interface Manifiesto {
  muestra: MuestraFixture[];
  partidos: MuestraPartido[];
  jugadores: MuestraJugadores;
}

function manifiesto(): Manifiesto {
  return fixture('manifest.json') as Manifiesto;
}

export function muestra(): MuestraFixture[] {
  return manifiesto().muestra;
}

export function partidosMuestra(): MuestraPartido[] {
  return manifiesto().partidos;
}

export function fixturePartido(clave: string): unknown {
  return fixture(`partidos/${clave}.json`);
}

export interface FixturesJugadores extends MuestraJugadores {
  estadisticas: unknown;
  plantilla: unknown;
  /** `/public/partidos/jugador/{id}/stats` del goleador y del portero. */
  stats: (plantillaEquipoId: string) => unknown;
}

export function fixturesJugadores(): FixturesJugadores {
  const m = manifiesto().jugadores;
  return {
    ...m,
    estadisticas: fixture(`${m.slug}/estadisticas-jugadores.json`),
    plantilla: fixture(`${m.slug}/plantilla/${m.equipoId}.json`),
    stats: (id) => fixture(`jugadores/${id}.json`),
  };
}

export function fixturesDivision(slug: string): FixturesDivision {
  const entrada = muestra().find((m) => m.slug === slug);
  if (!entrada) throw new Error(`No hay fixtures para ${slug}`);
  return {
    fases: fixture(`${slug}/fases.json`),
    equipos: fixture(`${slug}/equipos.json`),
    tree: fixture(`${slug}/tree.json`),
    clasificaciones: new Map(
      entrada.faseIds.map((id) => [
        id,
        fixture(`${slug}/clasificacion/${id}.json`),
      ]),
    ),
  };
}
