import { expect, test } from '@playwright/test';

import { apiDeFixtures } from './api';

test('elegir equipo enseña su calendario y se recuerda al recargar', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto('/partidos');

  await page.getByTestId('elegir-equipo').click();
  await expect(page.getByTestId('selector')).toBeVisible();
  await page.getByTestId('selector-equipo').first().click();

  await expect(page.getByTestId('cabecera-equipo')).toBeVisible();
  await expect(page.getByTestId('tarjeta-partido').first()).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('cabecera-equipo')).toBeVisible();
  await expect(page.getByTestId('sin-equipo')).toHaveCount(0);
});

test('el pull-to-refresh vuelve a pedir calendario y marcadores', async ({
  page,
}) => {
  const pedidas = await apiDeFixtures(page);
  await page.goto('/partidos');
  await page.getByTestId('elegir-equipo').click();
  await page.getByTestId('selector-equipo').first().click();
  await expect(page.getByTestId('tarjeta-partido').first()).toBeVisible();

  const marcadores = () =>
    pedidas.filter((r) => r === '/public/partidos/marcadores').length;
  const antes = marcadores();

  // El gesto táctil no es reproducible entre motores: se lanza el evento del refresher.
  await page
    .locator('ion-refresher')
    .first()
    .evaluate((el) => {
      el.dispatchEvent(
        new CustomEvent('ionRefresh', { detail: { complete: () => {} } }),
      );
    });
  await expect.poll(marcadores).toBeGreaterThan(antes);
});

test('las tarjetas salen por fecha y hora, no por jornada', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto('/partidos');
  await page.getByTestId('elegir-equipo').click();
  await page.getByTestId('selector-equipo').first().click();

  const tarjetas = page.getByTestId('tarjeta-partido');
  await expect(tarjetas.first()).toBeVisible();
  const fechas = await tarjetas.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-fecha') ?? ''),
  );
  expect(fechas).toEqual([...fechas].sort());
});
