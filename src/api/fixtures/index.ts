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

export function muestra(): MuestraFixture[] {
  return (fixture('manifest.json') as { muestra: MuestraFixture[] }).muestra;
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
