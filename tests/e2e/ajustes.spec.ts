import { expect, test } from '@playwright/test';

import { apiDeFixtures } from './api';

test('tema e idioma se aplican al momento y sobreviven a recargar', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/partidos');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');

  await page.getByTestId('abrir-ajustes').click();
  await expect(page.getByTestId('ajustes')).toBeVisible();
  await page.getByTestId('tema-oscuro').click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('idioma-eu').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'eu');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ajustes')).toBeHidden();

  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'eu');
  await expect(page.getByRole('tab', { name: 'Partidak' })).toBeVisible();
});

test('«sistema» sigue al esquema de color del sistema', async ({ page }) => {
  await apiDeFixtures(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/partidos');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
});
