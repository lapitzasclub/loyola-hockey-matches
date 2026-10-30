import { readFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

/**
 * Las fixtures de `src/api/fixtures` se cargan con `import.meta.glob`, que
 * solo existe bajo Vite: aquí se leen del disco con las mismas rutas que
 * `transporteDeFixtures`.
 */
export const fixture = (ruta: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`../../src/api/fixtures/${ruta}`, import.meta.url), {
      encoding: 'utf8',
    }),
  );

interface Manifiesto {
  muestra: { slug: string; divisionId: string; faseIds: string[] }[];
  partidos: { clave: string; id: string }[];
  jugadores: {
    slug: string;
    equipoId: string;
    goleadorId: string;
    porteroId: string;
  };
}

const manifiesto = fixture('manifest.json') as Manifiesto;
const slugDe = (divisionId: string) =>
  manifiesto.muestra.find((m) => m.divisionId === divisionId)?.slug;

type Ruta = [RegExp, (ids: string[], cuerpo: unknown) => unknown];

const RUTAS: Ruta[] = [
  [/^\/public\/agenda$/, () => fixture('agenda.json')],
  [/^\/public\/partidos\/marcadores$/, () => fixture('marcadores.json')],
  [
    /^\/hierarchy\/competiciones\/divisiones$/,
    (_, cuerpo) => {
      const ids = new Set(cuerpo as string[]);
      const todas = fixture('divisiones.json') as { competicionId: string }[];
      return todas.filter((d) => ids.has(d.competicionId));
    },
  ],
  [
    /^\/hierarchy\/fase\/([^/]+)\/clasificacion$/,
    ([faseId = '']) => {
      const m = manifiesto.muestra.find((e) => e.faseIds.includes(faseId));
      return m && fixture(`${m.slug}/clasificacion/${faseId}.json`);
    },
  ],
  [
    /^\/hierarchy\/division\/([^/]+)\/equipo\/([^/]+)\/plantilla$/,
    ([divisionId = '', equipoId]) => {
      const j = manifiesto.jugadores;
      return slugDe(divisionId) === j.slug && equipoId === j.equipoId
        ? fixture(`${j.slug}/plantilla/${j.equipoId}.json`)
        : undefined;
    },
  ],
  [
    /^\/hierarchy\/division\/([^/]+)\/(fases|equipos|tree|estadisticas-jugadores)$/,
    ([divisionId = '', recurso]) => {
      const slug = slugDe(divisionId);
      if (!slug) return undefined;
      if (recurso !== 'estadisticas-jugadores') {
        return fixture(`${slug}/${recurso}.json`);
      }
      return slug === manifiesto.jugadores.slug
        ? fixture(`${slug}/estadisticas-jugadores.json`)
        : undefined;
    },
  ],
  [
    /^\/public\/partidos\/jugador\/([^/]+)\/stats$/,
    ([id = '']) => {
      const j = manifiesto.jugadores;
      return [j.goleadorId, j.porteroId].includes(id)
        ? fixture(`jugadores/${id}.json`)
        : undefined;
    },
  ],
  [
    /^\/public\/partidos\/([^/]+)$/,
    ([id]) => {
      const p = manifiesto.partidos.find((x) => x.id === id);
      return p && fixture(`partidos/${p.clave}.json`);
    },
  ],
];

/** Sirve la API con las fixtures y devuelve las rutas pedidas, en orden. */
export async function apiDeFixtures(page: Page) {
  const pedidas: string[] = [];
  await page.route('**/api/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^\/api/, '');
    pedidas.push(ruta);
    for (const [patron, contestar] of RUTAS) {
      const m = patron.exec(ruta);
      if (!m) continue;
      const cuerpo =
        peticion.method() === 'POST' ? peticion.postDataJSON() : undefined;
      const datos = contestar(m.slice(1), cuerpo);
      if (datos !== undefined) return route.fulfill({ json: datos });
      break;
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return pedidas;
}
