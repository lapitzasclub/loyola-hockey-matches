import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { apiDeFixtures } from './api';

/** Partido de la muestra (Santutxu – Burgos, Liga Norte). */
const PARTIDO = '6636af38-a791-4002-ab03-402a765a7d7f';

async function abrirPartido(page: Page) {
  await apiDeFixtures(page);
  await page.goto(`/partidos/partido/${PARTIDO}`);
  const detalle = page.getByTestId('page-partido');
  await expect(detalle.getByTestId('partido-cabecera')).toBeVisible();
  // Mientras las pestañas entran, Playwright reintenta el toque desplazando la
  // página para alcanzarlas, y eso pliega la cabecera antes de tiempo.
  await detalle
    .getByTestId('secciones-partido')
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return detalle;
}

/** En una pantalla alta el resumen cabe entero: los eventos dan para bajar. */
async function abrirEventos(page: Page) {
  const detalle = await abrirPartido(page);
  await detalle.getByTestId('secciones-partido-eventos').click();
  await expect(detalle.getByTestId('evento').first()).toBeVisible();
  return detalle;
}

const izquierda = async (el: Locator) => (await el.boundingBox())?.x ?? NaN;

const opacidad = (el: Locator) =>
  el.evaluate((e) => Number(getComputedStyle(e).opacity));

async function bajar(detalle: Locator, top: number) {
  await detalle
    .locator('ion-content')
    .evaluate(
      (c, y) => (c as HTMLIonContentElement).scrollToPoint(0, y, 0),
      top,
    );
}

test('la pastilla del segmento sigue al gesto y acompaña al cambio por toque', async ({
  page,
}) => {
  const detalle = await abrirPartido(page);
  const pastilla = detalle.locator('.segmento__pastilla');
  const resumen = detalle.getByTestId('secciones-partido-resumen');
  const eventos = detalle.getByTestId('secciones-partido-eventos');
  const alineaciones = detalle.getByTestId('secciones-partido-alineaciones');
  await expect.poll(() => izquierda(pastilla)).toBe(await izquierda(resumen));

  // A mitad de gesto (sin imán, sin llegar a cambiar de panel) la pastilla
  // está entre los dos botones.
  await detalle.locator('.pestanas__fila').evaluate((fila) => {
    (fila as HTMLElement).style.scrollSnapType = 'none';
    fila.scrollTo({ left: fila.clientWidth * 0.4, behavior: 'instant' });
  });
  const desde = await izquierda(resumen);
  const hasta = await izquierda(eventos);
  await expect
    .poll(() => izquierda(pastilla))
    .toBeCloseTo(desde + (hasta - desde) * 0.4, 0);

  await alineaciones.click();
  await expect
    .poll(() => izquierda(pastilla))
    .toBeCloseTo(await izquierda(alineaciones), 0);
});

test('la cabecera del partido se pliega en la barra al bajar', async ({
  page,
}) => {
  const detalle = await abrirEventos(page);
  const titulo = detalle.locator('.pagina__titulo');
  const compacta = detalle.locator('.pagina__compacta');
  const meta = detalle.locator('.partido-cabecera__meta');
  expect(await opacidad(compacta)).toBe(0);

  await bajar(detalle, 60);
  // A mitad, el título ya se ha ido y la versión compacta aún no ha llegado.
  await expect.poll(() => opacidad(meta)).toBe(0);
  await expect.poll(() => opacidad(titulo)).toBeLessThan(0.1);
  expect(await opacidad(compacta)).toBeLessThan(0.1);

  await bajar(detalle, 300);
  await expect.poll(() => opacidad(compacta)).toBe(1);
  expect(await opacidad(titulo)).toBe(0);
  await expect(compacta.locator('.pagina__compacta-marcador')).toHaveText(
    '3–2',
  );

  await bajar(detalle, 0);
  await expect.poll(() => opacidad(titulo)).toBe(1);
});

test('con movimiento reducido la cabecera se pliega de golpe, sin pasos intermedios', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const detalle = await abrirEventos(page);
  const compacta = detalle.locator('.pagina__compacta');

  await bajar(detalle, 40);
  await page.waitForTimeout(100);
  expect(await opacidad(compacta)).toBe(0);
  await bajar(detalle, 80);
  await expect.poll(() => opacidad(compacta)).toBe(1);
});

/** Abre la clasificación de Liga Norte, con el Loyola y su racha. */
async function abrirClasificacion(page: Page) {
  await page.goto('/clasificacion');
  await page.getByTestId('elegir-equipo').click();
  await page
    .getByTestId('selector-equipo')
    .filter({
      has: page.locator('.selector__competicion', { hasText: /^LIGA NORTE$/ }),
    })
    .click();
}

test('el skeleton se funde encima de la clasificación y luego se quita', async ({
  page,
}) => {
  await apiDeFixtures(page);
  // La red lenta deja ver el skeleton antes de que lleguen los datos.
  await page.route('**/api/**', async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.fallback();
  });
  await abrirClasificacion(page);

  const saliente = page.locator('.revelado__saliente');
  await saliente.waitFor({ state: 'attached' });
  await expect(page.locator('.revelado .clasif__fila--loyola')).toHaveCount(1);
  await expect(saliente).toHaveCount(0);
  await expect(page.getByTestId('racha').first()).toBeVisible();
});

test('con movimiento reducido no queda ninguna animación CSS', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await apiDeFixtures(page);
  await page.route('**/api/**', async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.fallback();
  });
  await abrirClasificacion(page);

  await expect(page.locator('.clasif__fila--loyola')).toHaveCount(1);
  await expect(page.getByTestId('racha').first()).toBeVisible();
  await expect(page.locator('.revelado')).toHaveCount(0);
  const animaciones = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a instanceof CSSAnimation)
      .map((a) => (a as CSSAnimation).animationName),
  );
  expect(animaciones).toEqual([]);
});

/** Laguna Negra 5–6 Loyola Indautxu (Copa): gana el Loyola a domicilio. */
const VICTORIA = 'b931107f-6c3d-4811-8469-d616167478f6';

test('el confeti celebra la victoria del Loyola una sola vez', async ({
  page,
}) => {
  await apiDeFixtures(page);
  await page.goto(`/partidos/partido/${VICTORIA}`);
  const confeti = page.getByTestId('confeti');
  await expect(confeti).toBeAttached();
  // Se quita solo al acabar.
  await expect(confeti).toHaveCount(0, { timeout: 5000 });

  await page.reload();
  await expect(page.getByTestId('partido-cabecera')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(confeti).toHaveCount(0);
});

test('con movimiento reducido no hay confeti ni se gasta la celebración', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await apiDeFixtures(page);
  await page.goto(`/partidos/partido/${VICTORIA}`);
  await expect(page.getByTestId('partido-cabecera')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('confeti')).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('loyola.celebrados')),
  ).toBeNull();
});
