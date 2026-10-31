import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { apiDeFixtures } from './api';

/** Partido de la muestra (Santutxu – Burgos, Liga Norte). */
const PARTIDO = '6636af38-a791-4002-ab03-402a765a7d7f';

declare global {
  interface Window {
    /** Clase de cada clon de vuelo que se ha colgado de `body`. */
    __vuelos: string[];
  }
}

/**
 * Apunta los clones de vuelo que aparecen, aunque duren medio segundo. Se
 * observa `document` porque al correr el script aún no hay `<html>`.
 */
async function espiarVuelos(page: Page) {
  await page.addInitScript(() => {
    window.__vuelos = [];
    new MutationObserver((cambios) => {
      for (const c of cambios) {
        c.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.dataset.vuelo !== undefined) {
            window.__vuelos.push(n.className);
          }
        });
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

const vuelos = (page: Page) => page.evaluate(() => window.__vuelos);

/** Espera a que vuelen más de `previos` clones y a que acabe el vuelo. */
async function tras(page: Page, previos = 0) {
  await expect
    .poll(async () => (await vuelos(page)).length)
    .toBeGreaterThan(previos);
  await sinRestos(page);
  return (await vuelos(page)).slice(previos);
}

async function clasificacionLigaNorte(page: Page) {
  await apiDeFixtures(page);
  await page.goto('/clasificacion');
  await page.getByTestId('elegir-equipo').click();
  await page
    .getByTestId('selector-equipo')
    .filter({
      has: page.locator('.selector__competicion', { hasText: /^LIGA NORTE$/ }),
    })
    .click();
  await expect(page.locator('.clasif__fila--loyola')).toHaveCount(1);
}

/** Al terminar no queda ningún clon ni ningún original oculto. */
async function sinRestos(page: Page) {
  await expect(page.locator('[data-vuelo]')).toHaveCount(0);
  await expect(page.locator('[data-vuelo-ocultos]')).toHaveCount(0);
}

test('el escudo y el nombre vuelan de la tabla a la cabecera del equipo y de vuelta', async ({
  page,
}) => {
  await espiarVuelos(page);
  await clasificacionLigaNorte(page);

  await page.locator('.clasif__fila--loyola').click();
  await expect(page.getByTestId('equipo-cabecera')).toBeVisible();
  const ida = await tras(page);
  expect(ida.some((c) => c.includes('escudo'))).toBe(true);
  expect(ida.some((c) => c.includes('clasif__nombre'))).toBe(true);
  expect(ida.some((c) => c.includes('equipo-cabecera__nombre'))).toBe(true);

  await page
    .getByTestId('page-equipo')
    .getByRole('button', { name: 'Atrás' })
    .click();
  await expect(page).toHaveURL(/\/clasificacion$/);
  const vuelta = await tras(page, ida.length);
  expect(vuelta.some((c) => c.includes('clasif__nombre'))).toBe(true);
});

test('escudos, nombres y marcador vuelan de la tarjeta al detalle del partido', async ({
  page,
}) => {
  await espiarVuelos(page);
  await clasificacionLigaNorte(page);
  await page.getByTestId('clasificacion').getByText('SANTUTXU HT').click();
  await expect(page.getByTestId('equipo-cabecera')).toBeVisible();
  const previos = (await tras(page)).length;

  await page.getByTestId('seccion-partidos').click();
  const tarjeta = page.locator(
    `[data-testid=partidos-equipo] [data-partido="${PARTIDO}"]`,
  );
  await tarjeta.scrollIntoViewIfNeeded();
  await tarjeta.click();
  await expect(
    page.getByTestId('page-partido').getByTestId('marcador'),
  ).toBeVisible();

  const clases = await tras(page, previos);
  expect(clases.filter((c) => c.includes('escudo'))).toHaveLength(2);
  expect(clases.filter((c) => c.includes('tarjeta__nombre'))).toHaveLength(2);
  expect(clases.some((c) => c.includes('tarjeta__marcador'))).toBe(true);
  expect(clases.some((c) => c.includes('partido-cabecera__marcador'))).toBe(
    true,
  );
});

test('con movimiento reducido no vuela nada y la navegación sigue', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await espiarVuelos(page);
  await clasificacionLigaNorte(page);

  await page.locator('.clasif__fila--loyola').click();
  await expect(page.getByTestId('equipo-cabecera')).toBeVisible();
  await page
    .getByTestId('page-equipo')
    .getByRole('button', { name: 'Atrás' })
    .click();
  await expect(page).toHaveURL(/\/clasificacion$/);
  expect(await vuelos(page)).toEqual([]);
});
