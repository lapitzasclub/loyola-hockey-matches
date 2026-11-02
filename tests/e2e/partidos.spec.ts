import { expect, test } from '@playwright/test';

import { apiDeFixtures } from './api';
import { tirarParaRefrescar } from './gestos';

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

  await tirarParaRefrescar(page, 'page-partidos');
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
  // textContent: el CSS cambia las mayúsculas de la jornada en la tarjeta.
  const jornada = (
    (await tarjeta.getByTestId('tarjeta-jornada').textContent()) ?? ''
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

test('la pista de una tarjeta abre el mapa sin entrar al detalle', async ({
  page,
}) => {
  // El clic sobre un enlace creado a mano se anota en lugar de abrir el mapa.
  await page.addInitScript(() => {
    const abiertos: string[] = [];
    (window as unknown as { abiertos: string[] }).abiertos = abiertos;
    HTMLAnchorElement.prototype.click = function () {
      abiertos.push(this.href);
    };
  });
  await apiDeFixtures(page);
  await page.goto('/partidos');
  await page.getByTestId('elegir-equipo').click();
  await page.getByTestId('selector-equipo').first().click();

  const pista = page
    .getByTestId('page-partidos')
    .getByTestId('enlace-pista')
    .first();
  await expect(pista).toBeVisible();
  await pista.click();

  await expect(page).toHaveURL(/\/partidos$/);
  const [abierto] = await page.evaluate(
    () => (window as unknown as { abiertos: string[] }).abiertos,
  );
  expect(abierto).toMatch(/^(geo:|https:\/\/maps\.(apple|google)\.com\/)/);
  expect(abierto).toContain(
    (await pista.getAttribute('data-href'))?.split('?')[1]?.split('&')[0] ??
      '?',
  );
});

test('el botón del calendario ofrece suscribirse al .ics del equipo', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const abiertos: string[] = [];
    (window as unknown as { abiertos: string[] }).abiertos = abiertos;
    HTMLAnchorElement.prototype.click = function () {
      abiertos.push(this.href);
    };
  });
  await apiDeFixtures(page);
  await page.goto('/partidos');
  await page.getByTestId('elegir-equipo').click();
  await page.getByTestId('selector-equipo').first().click();

  await page
    .getByTestId('page-partidos')
    .getByTestId('suscribir-calendario')
    .click();
  await page
    .getByRole('button', {
      name: /^(iPhone, Mac u Outlook|Otra app de calendario)$/,
    })
    .click();

  const [abierto] = await page.evaluate(
    () => (window as unknown as { abiertos: string[] }).abiertos,
  );
  expect(abierto).toMatch(
    /^webcal:\/\/fvpatinaje\.eus\/api\/public\/calendario\/equipo\/[0-9a-f-]{36}\.ics$/,
  );
});
