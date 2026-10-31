import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Espera a que la caché quede escrita en IndexedDB. */
export async function cacheEscrita(page: Page) {
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
