import { expect, test } from '@playwright/test';

import { apiDeFixtures } from './api';
import { cacheEscrita } from './cache';

interface Icono {
  src: string;
  sizes: string;
  purpose?: string;
}

/** Partido de la muestra (Santutxu – Burgos, Liga Norte). */
const PARTIDO = '6636af38-a791-4002-ab03-402a765a7d7f';

/** Ancho y alto de un PNG, leídos de la cabecera IHDR. */
const medidasPng = (png: Buffer) =>
  `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;

test('el manifest es instalable y sus iconos existen con su tamaño', async ({
  request,
}) => {
  const respuesta = await request.get('/manifest.webmanifest');
  expect(respuesta.ok()).toBe(true);
  const manifest = (await respuesta.json()) as {
    name: string;
    short_name: string;
    start_url: string;
    display: string;
    icons: Icono[];
  };
  expect(manifest).toMatchObject({
    short_name: expect.any(String),
    start_url: '/',
    display: 'standalone',
  });
  expect(manifest.icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);

  for (const icono of manifest.icons) {
    const png = await request.get(icono.src);
    expect(png.ok(), icono.src).toBe(true);
    expect(medidasPng(await png.body()), icono.src).toBe(icono.sizes);
  }
});

test('las pantallas de arranque de iOS existen para cada iPhone', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const enlaces = await page
    .locator('link[rel=apple-touch-startup-image]')
    .evaluateAll((ls) =>
      ls.map((l) => ({
        href: l.getAttribute('href') ?? '',
        media: l.getAttribute('media') ?? '',
      })),
    );
  // Doce tamaños de iPhone, en claro y en oscuro.
  expect(enlaces).toHaveLength(24);
  for (const { href, media } of enlaces) {
    const [, ancho, alto, ratio] =
      /device-width: (\d+)px\).*device-height: (\d+)px\).*pixel-ratio: (\d)\)/.exec(
        media,
      ) ?? [];
    const png = await request.get(href);
    expect(png.ok(), href).toBe(true);
    expect(medidasPng(await png.body()), href).toBe(
      `${Number(ancho) * Number(ratio)}x${Number(alto) * Number(ratio)}`,
    );
  }
  await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute(
    'href',
    '/apple-touch-icon.png',
  );
});

test('ninguna pantalla choca con la política de seguridad', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const violaciones: string[] = [];
    (window as unknown as { violaciones: string[] }).violaciones = violaciones;
    document.addEventListener('securitypolicyviolation', (e) => {
      violaciones.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  await apiDeFixtures(page);

  await page.goto('/');
  await expect(page.getByTestId('sin-equipo')).toBeVisible();
  await page.getByTestId('elegir-equipo').click();
  await page.getByTestId('selector-equipo').first().click();
  await expect(page.getByTestId('partidos')).toBeVisible();
  for (const pestaña of ['Clasificación', 'Estadísticas', 'Partidos']) {
    await page.getByRole('tab', { name: pestaña }).click();
  }
  await page.getByTestId('page-partidos').getByTestId('abrir-ajustes').click();
  await expect(page.getByTestId('ajustes')).toBeVisible();
  await page.goto(`/clasificacion/partido/${PARTIDO}`);
  await expect(
    page.getByTestId('page-partido').getByTestId('marcador'),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(
    await page.evaluate(
      () => (window as unknown as { violaciones: string[] }).violaciones,
    ),
  ).toEqual([]);
});

test.describe('service worker', () => {
  test.use({ serviceWorkers: 'allow' });

  test('sin conexión abre la app con el shell precacheado y los datos persistidos', async ({
    page,
    context,
  }) => {
    await apiDeFixtures(page);
    await page.goto('/');
    test.skip(
      !(await page.evaluate(() => 'serviceWorker' in navigator)),
      'Este navegador no tiene service worker',
    );
    await expect(page.getByTestId('sin-equipo')).toBeVisible();
    await cacheEscrita(page);
    // Con `clients.claim` la página pasa a estar controlada al activarse.
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        timeout: 15_000,
      })
      .toBe(true);
    const precache = await page.evaluate(async () => {
      const nombre = (await caches.keys()).find((c) => c.startsWith('shell-'));
      const cache = nombre ? await caches.open(nombre) : undefined;
      return (await cache?.keys())?.map((r) => new URL(r.url).pathname) ?? [];
    });
    expect(precache).toEqual(
      expect.arrayContaining(['/', '/manifest.webmanifest']),
    );
    expect(precache.some((ruta) => ruta.startsWith('/static/'))).toBe(true);

    const fallidas: string[] = [];
    page.on('requestfailed', (r) => {
      const { origin, pathname } = new URL(r.url());
      if (
        origin === new URL(page.url()).origin &&
        !pathname.startsWith('/api/')
      ) {
        fallidas.push(pathname);
      }
    });
    await context.setOffline(true);
    await page.goto('/clasificacion');
    await expect(page.getByTestId('page-clasificacion')).toBeVisible();
    await page.getByRole('tab', { name: 'Partidos' }).click();
    await expect(
      page.getByTestId('page-partidos').getByTestId('sin-equipo'),
    ).toBeVisible();
    expect(fallidas).toEqual([]);
  });
});
