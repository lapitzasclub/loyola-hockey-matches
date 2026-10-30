import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { apiDeFixtures } from './api';

/** Partido de la muestra (Santutxu – Burgos, Liga Norte). */
const PARTIDO = '6636af38-a791-4002-ab03-402a765a7d7f';

/** El botón atrás de una página: las de debajo en la pila siguen en el DOM. */
const atras = (page: Page, testId: string) =>
  page.getByTestId(testId).getByRole('button', { name: 'Atrás' });

test('clasificación → equipo → partido → jugador y vuelta atrás por la pila', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto('/clasificacion');
  await page.locator('ion-select').click();
  await page.getByRole('radio', { name: /^LIGA NORTE · / }).click();
  await page.getByTestId('clasificacion').getByText('SANTUTXU HT').click();

  await expect(page.getByTestId('page-equipo')).toBeVisible();
  await expect(page).toHaveURL(/\/clasificacion\/equipo\//);
  await page
    .locator(
      `[data-testid=partidos-equipo] ion-item[router-link$="${PARTIDO}"]`,
    )
    .click();

  await expect(page.getByTestId('marcador')).toBeVisible();
  await expect(page).toHaveURL(`/clasificacion/partido/${PARTIDO}`);
  await page.getByTestId('abrir-info-partido').click();
  await expect(page.getByTestId('hoja-info-partido')).toBeVisible();
  await expect(page.getByText('POLIDEPORTIVO DE TXURDINAGA')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hoja-info-partido')).toBeHidden();

  await page
    .locator('[data-testid=page-partido] ion-item[router-link*="/jugador/"]')
    .first()
    .click();
  await expect(page).toHaveURL(/\/clasificacion\/jugador\//);
  await expect(page.getByTestId('page-jugador')).toBeVisible();

  await atras(page, 'page-jugador').click();
  await expect(page).toHaveURL(`/clasificacion/partido/${PARTIDO}`);
  await atras(page, 'page-partido').click();
  await expect(page).toHaveURL(/\/clasificacion\/equipo\//);
  await atras(page, 'page-equipo').click();
  await expect(page).toHaveURL(/\/clasificacion$/);
  await expect(page.getByTestId('clasificacion').first()).toBeVisible();
});

test('la pila de cada pestaña se conserva al cambiar de pestaña', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto(`/clasificacion/partido/${PARTIDO}`);
  await expect(page.getByTestId('marcador')).toBeVisible();

  await page.getByRole('tab', { name: 'Partidos' }).click();
  await expect(page).toHaveURL(/\/partidos$/);
  await page.getByRole('tab', { name: 'Clasificación' }).click();
  await expect(page).toHaveURL(`/clasificacion/partido/${PARTIDO}`);
});

test('un detalle abierto por enlace vuelve a la raíz de su pestaña', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto(`/partidos/partido/${PARTIDO}`);
  await expect(page.getByTestId('marcador')).toBeVisible();
  await atras(page, 'page-partido').click();
  await expect(page).toHaveURL(/\/partidos$/);
  await expect(page.getByTestId('agenda')).toBeVisible();
});

test('el pull-to-refresh vuelve a pedir los datos de la vista', async ({
  page,
}) => {
  const pedidas = await apiDeFixtures(page);
  await page.goto('/partidos');
  await expect(page.getByTestId('agenda')).toBeVisible();
  const agenda = () => pedidas.filter((r) => r === '/public/agenda').length;
  const antes = agenda();

  // El gesto lo resuelve Ionic; aquí se dispara el evento que emite al soltar.
  const completado = page.evaluate(
    () =>
      new Promise<void>((resolver) => {
        const refresher = document.querySelector(
          '[data-testid=page-partidos] ion-refresher',
        );
        refresher?.dispatchEvent(
          new CustomEvent('ionRefresh', { detail: { complete: resolver } }),
        );
      }),
  );
  await completado;
  expect(agenda()).toBe(antes + 1);
});
