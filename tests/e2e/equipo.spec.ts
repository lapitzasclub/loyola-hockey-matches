import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { apiDeFixtures } from './api';

/** Abre el detalle del Loyola de Liga Norte desde la clasificación. */
async function abrirEquipo(page: Page) {
  await apiDeFixtures(page);
  await page.goto('/clasificacion');
  await page.getByTestId('elegir-equipo').click();
  await page
    .getByTestId('selector-equipo')
    .filter({
      has: page.locator('.selector__competicion', { hasText: /^LIGA NORTE$/ }),
    })
    .click();
  await page.locator('.clasif__fila--loyola').first().click();
  await expect(page.getByTestId('equipo-cabecera')).toBeVisible();
}

test('la clasificación destaca al Loyola y enseña la racha', async ({
  page,
}) => {
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
  await expect(page.getByTestId('racha').first()).toBeVisible();
});

test('el detalle del equipo cambia de sección con el segmento', async ({
  page,
}) => {
  await abrirEquipo(page);
  await expect(page.getByTestId('resumen-equipo')).toBeVisible();

  await page.getByTestId('seccion-partidos').click();
  await expect(page.getByTestId('partidos-equipo')).toBeVisible();
  await expect(page.getByTestId('resumen-equipo')).toHaveCount(0);

  await page.getByTestId('seccion-plantilla').click();
  await expect(page.getByTestId('plantilla-equipo')).toBeVisible();
  await expect(page.getByTestId('jugador-fila').first()).toBeVisible();

  await page.getByTestId('seccion-estadisticas').click();
  await expect(page.getByTestId('estadisticas-equipo')).toBeVisible();

  await page.getByTestId('seccion-alineaciones').click();
  await expect(page.getByTestId('alineaciones-equipo')).toBeVisible();
});

test('el filtro de partidos separa jugados y pendientes', async ({ page }) => {
  await abrirEquipo(page);
  await page.getByTestId('seccion-partidos').click();
  const tarjetas = page
    .getByTestId('partidos-equipo')
    .getByTestId('tarjeta-partido');
  await expect(tarjetas.first()).toBeVisible();
  const todos = await tarjetas.count();

  const contar = async (filtro: string) => {
    await page.getByTestId(filtro).click();
    await page.waitForTimeout(300);
    return tarjetas.count();
  };
  const jugados = await contar('filtro-jugados');
  const pendientes = await contar('filtro-pendientes');
  expect(jugados + pendientes).toBe(todos);
  expect(await contar('filtro-todos')).toBe(todos);
});

test('de la plantilla se abre la ficha del jugador', async ({ page }) => {
  await abrirEquipo(page);
  await page.getByTestId('seccion-plantilla').click();
  await page.getByTestId('jugador-fila').first().click();

  await expect(page).toHaveURL(/\/clasificacion\/jugador\//);
  await expect(page.getByTestId('page-jugador')).toBeVisible();
});
