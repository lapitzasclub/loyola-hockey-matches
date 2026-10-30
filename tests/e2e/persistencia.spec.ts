import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { apiDeFixtures } from './api';

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
