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

test('pulsar la jornada abre sus partidos sin entrar al detalle', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto('/partidos');
  await page.getByTestId('elegir-equipo').click();
  await page.getByTestId('selector-equipo').first().click();

  const pagina = page.getByTestId('page-partidos');
  const tarjeta = pagina
    .getByTestId('tarjeta-partido')
    .filter({ has: page.getByTestId('tarjeta-jornada') })
    .first();
  await expect(tarjeta).toBeVisible();
  const origen = (await tarjeta.getAttribute('data-partido')) ?? '';
  const jornada = (
    await tarjeta.getByTestId('tarjeta-jornada').innerText()
  ).trim();

  await tarjeta.getByTestId('tarjeta-jornada').click();
  const hoja = page.getByTestId('hoja-jornada');
  await expect(hoja).toBeVisible();
  await expect(page).toHaveURL(/\/partidos$/);
  await expect(hoja).toContainText(jornada);

  const filas = hoja.getByTestId('jornada-partido');
  expect(await filas.count()).toBeGreaterThan(0);
  await expect(hoja.locator(`[data-partido="${origen}"]`)).toHaveAttribute(
    'aria-current',
    'true',
  );

  // Tocar una fila lleva a su detalle y cierra la hoja.
  await filas.first().click();
  await expect(page).toHaveURL(/\/partidos\/partido\//);
  await expect(page.getByTestId('hoja-jornada')).toHaveCount(0);
});
