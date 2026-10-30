import { expect, test } from '@playwright/test';

test('arranca en Partidos y navega por las tres pestañas', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/partidos$/);
  await expect(page.getByTestId('page-partidos')).toBeVisible();

  await page.getByRole('tab', { name: 'Clasificación' }).click();
  await expect(page).toHaveURL(/\/clasificacion$/);
  await expect(page.getByTestId('page-clasificacion')).toBeVisible();

  await page.getByRole('tab', { name: 'Estadísticas' }).click();
  await expect(page).toHaveURL(/\/estadisticas$/);
  await expect(page.getByTestId('page-estadisticas')).toBeVisible();

  await page.getByRole('tab', { name: 'Partidos' }).click();
  await expect(page).toHaveURL(/\/partidos$/);
});
