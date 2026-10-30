import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { apiDeFixtures, fixture } from './api';

// Solo el goleador y el portero del Loyola tienen ficha en las fixtures.
const { goleadorId } = (
  fixture('manifest.json') as { jugadores: { goleadorId: string } }
).jugadores;

/** Abre las estadísticas con el Loyola de Liga Norte elegido. */
async function abrirEstadisticas(page: Page) {
  await apiDeFixtures(page);
  await page.goto('/estadisticas');
  await page.getByTestId('elegir-equipo').click();
  await page
    .getByTestId('selector-equipo')
    .filter({
      has: page.locator('.selector__competicion', { hasText: /^LIGA NORTE$/ }),
    })
    .click();
  await expect(page.getByTestId('lideres')).toBeVisible();
}

test('las estadísticas cambian de ranking con el segmento', async ({
  page,
}) => {
  await abrirEstadisticas(page);
  await expect(page.getByTestId('ranking-fila').first()).toBeVisible();

  await page.getByTestId('categoria-porteros').click();
  await expect(page.getByLabel('Ranking de Porteros')).toBeVisible();

  await page.getByTestId('categoria-equipos').click();
  await expect(page.getByTestId('ranking-equipos')).toBeVisible();
  await expect(page.getByTestId('ranking-equipo').first()).toBeVisible();
});

test('de un ranking se abre la ficha del jugador con su gráfica', async ({
  page,
}) => {
  await abrirEstadisticas(page);
  await page.locator(`a[href$="/jugador/${goleadorId}"]`).first().click();

  await expect(page.getByTestId('jugador-cabecera')).toBeVisible();
  await expect(page.getByTestId('jugador-competicion').first()).toBeVisible();
  await expect(page.getByTestId('grafica-partidos').first()).toBeVisible();
  expect(page.url()).toMatch(/\/estadisticas\/jugador\//);
});
