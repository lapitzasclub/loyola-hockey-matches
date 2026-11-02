import { expect, test } from '@playwright/test';

import { apiDeFixtures } from './api';

/** Partido de la muestra (Santutxu – Burgos, Liga Norte). */
const PARTIDO = '6636af38-a791-4002-ab03-402a765a7d7f';

test('el detalle del partido cambia de sección con las pastillas y con el gesto', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto(`/partidos/partido/${PARTIDO}`);
  const detalle = page.getByTestId('page-partido');

  await expect(detalle.getByTestId('partido-cabecera')).toBeVisible();
  await expect(detalle.getByTestId('totales-partido')).toBeVisible();

  await detalle.getByTestId('secciones-partido-eventos').click();
  await expect(detalle.getByTestId('eventos-partido')).toBeVisible();
  await expect(detalle.getByTestId('evento').first()).toBeVisible();

  await detalle.getByTestId('secciones-partido-alineaciones').click();
  await expect(detalle.getByTestId('alineacion-local')).toBeVisible();
  await expect(detalle.getByTestId('miembro-staff').first()).toBeVisible();

  // El gesto: se desliza la fila de paneles hacia el panel anterior.
  await detalle.getByTestId('secciones-partido').evaluate((fila) => {
    const filaPaneles = fila.querySelector('.pestanas__fila');
    filaPaneles?.scrollTo({
      left: filaPaneles.clientWidth,
      behavior: 'instant',
    });
  });
  await expect(detalle.getByTestId('eventos-partido')).toBeVisible();
});

test('la pista del resumen es un enlace al mapa', async ({ page }) => {
  await apiDeFixtures(page);
  await page.goto(`/partidos/partido/${PARTIDO}`);
  const enlace = page.getByTestId('page-partido').getByTestId('enlace-pista');
  await expect(enlace).toBeVisible();
  await expect(enlace).toHaveAttribute(
    'href',
    /^(geo:|https:\/\/maps\.(apple|google)\.com\/)/,
  );
});
