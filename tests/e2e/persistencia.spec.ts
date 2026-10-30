import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const fixture = (ruta: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`../../src/api/fixtures/${ruta}`, import.meta.url), {
      encoding: 'utf8',
    }),
  );

/** Sirve la API con fixtures y devuelve la lista de rutas pedidas. */
async function apiDeFixtures(page: Page) {
  const pedidas: string[] = [];
  const divisiones = fixture('divisiones.json') as { competicionId: string }[];
  await page.route('**/api/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^\/api/, '');
    pedidas.push(ruta);
    if (ruta === '/public/agenda') {
      return route.fulfill({ json: fixture('agenda.json') });
    }
    if (ruta === '/hierarchy/competiciones/divisiones') {
      const ids = new Set(peticion.postDataJSON() as string[]);
      return route.fulfill({
        json: divisiones.filter((d) => ids.has(d.competicionId)),
      });
    }
    if (/^\/hierarchy\/division\/[^/]+\/equipos$/.test(ruta)) {
      return route.fulfill({ json: [] });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return pedidas;
}

/** Espera a que la caché quede escrita en IndexedDB. */
async function cacheEscrita(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<boolean>((resolver) => {
              const abrir = indexedDB.open('loyola-hockey');
              abrir.onerror = () => resolver(false);
              abrir.onsuccess = () => {
                const db = abrir.result;
                if (!db.objectStoreNames.contains('cache')) {
                  db.close();
                  return resolver(false);
                }
                const leer = db
                  .transaction('cache')
                  .objectStore('cache')
                  .get('cliente');
                leer.onsuccess = () => {
                  db.close();
                  resolver(leer.result !== undefined);
                };
                leer.onerror = () => resolver(false);
              };
            }),
        ),
      { timeout: 5000 },
    )
    .toBe(true);
}

test('la segunda apertura pinta desde la caché persistida sin red', async ({
  page,
}) => {
  const pedidas = await apiDeFixtures(page);
  await page.goto('/');
  await expect(page.getByTestId('agenda')).toBeVisible();
  expect(pedidas).toContain('/public/agenda');
  await cacheEscrita(page);

  pedidas.length = 0;
  await page.reload();
  await expect(page.getByTestId('agenda')).toBeVisible();
  // La precarga del catálogo arranca tras restaurar: se deja asentar la red.
  await page.waitForLoadState('networkidle');
  expect(pedidas).toEqual([]);
});
