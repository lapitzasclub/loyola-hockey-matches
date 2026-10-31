import { expect, test } from '@playwright/test';

import { apiDeFixtures } from './api';
import { cacheEscrita } from './cache';

test('la segunda apertura pinta desde la caché persistida sin red', async ({
  page,
}) => {
  const pedidas = await apiDeFixtures(page);
  await page.goto('/');
  await expect(page.getByTestId('sin-equipo')).toBeVisible();
  expect(pedidas).toContain('/public/agenda');
  await cacheEscrita(page);

  pedidas.length = 0;
  await page.reload();
  await expect(page.getByTestId('sin-equipo')).toBeVisible();
  // La precarga del catálogo arranca tras restaurar: se deja asentar la red.
  await page.waitForLoadState('networkidle');
  expect(pedidas).toEqual([]);
});
