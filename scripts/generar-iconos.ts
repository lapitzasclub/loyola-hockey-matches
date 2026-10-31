/**
 * Genera los iconos de la PWA y los splash de iOS a partir del escudo de
 * `public/assets/sidebar-loyola/escudo`, renderizados con el Chromium de
 * Playwright, y reescribe el bloque de `apple-touch-startup-image` de
 * `index.html`.
 *
 *   npm run iconos
 *
 * Los splash llevan el fondo de la app en claro y en oscuro (el de
 * `tema.css`), para que el paso del splash a la app no se note.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(RAIZ, 'public');
const ESCUDOS = join(PUBLIC, 'assets', 'sidebar-loyola', 'escudo');

const TEMAS = {
  claro: {
    fondo: '#f6f3ec',
    escudo: 'escudo_loyola_indautxu_fondo_claro.webp',
  },
  oscuro: {
    fondo: '#0b1113',
    escudo: 'escudo_loyola_indautxu_fondo_oscuro.webp',
  },
} as const;

/**
 * Pantallas de iPhone en vertical (puntos CSS y densidad) desde los que
 * llegan a iOS 16.4, el mínimo para la PWA con push. Cada una necesita su
 * imagen exacta o iOS no enseña ninguna.
 */
const IPHONES: [ancho: number, alto: number, dpr: number, modelos: string][] = [
  [440, 956, 3, '16 Pro Max, 17 Pro Max'],
  [430, 932, 3, '14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus'],
  [428, 926, 3, '12 Pro Max, 13 Pro Max, 14 Plus'],
  [420, 912, 3, 'Air'],
  [414, 896, 3, 'XS Max, 11 Pro Max'],
  [414, 896, 2, 'XR, 11'],
  [414, 736, 3, '8 Plus'],
  [402, 874, 3, '16 Pro, 17, 17 Pro'],
  [393, 852, 3, '14 Pro, 15, 15 Pro, 16'],
  [390, 844, 3, '12, 13, 14, 16e'],
  [375, 812, 3, 'X, XS, 11 Pro, 12 mini, 13 mini'],
  [375, 667, 2, '8, SE 2.ª y 3.ª gen.'],
];

/** Alto del escudo en el splash: así su ancho es un tercio de la pantalla. */
const ESCALA_SPLASH = 0.39;

const dataUrl = (fichero: string) =>
  `data:image/webp;base64,${readFileSync(join(ESCUDOS, fichero)).toString('base64')}`;

/** Escudo centrado que ocupa `escala` del lado menor del lienzo. */
const html = (fondo: string, escudo: string, escala: number) => `<!doctype html>
<html><body style="margin:0;height:100vh;display:grid;place-items:center;background:${fondo}">
<img src="${escudo}" style="height:${escala * 100}vmin;width:auto;object-fit:contain">
</body></html>`;

const navegador = await chromium.launch();

async function renderizar(
  destino: string,
  ancho: number,
  alto: number,
  dpr: number,
  contenido: string,
) {
  const pagina = await navegador.newPage({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: dpr,
  });
  await pagina.setContent(contenido);
  await pagina.locator('img').evaluate((img: HTMLImageElement) => img.decode());
  mkdirSync(dirname(destino), { recursive: true });
  await pagina.screenshot({ path: destino });
  await pagina.close();
}

// Iconos: fondo blanco como el icono de la v1 y el de Android. El maskable
// deja el escudo dentro del círculo seguro (80 % del lado).
const claro = dataUrl(TEMAS.claro.escudo);
await renderizar(
  join(PUBLIC, 'icons', 'icon-192.png'),
  192,
  192,
  1,
  html('#ffffff', claro, 0.86),
);
await renderizar(
  join(PUBLIC, 'icons', 'icon-512.png'),
  512,
  512,
  1,
  html('#ffffff', claro, 0.86),
);
await renderizar(
  join(PUBLIC, 'icons', 'maskable-512.png'),
  512,
  512,
  1,
  html('#ffffff', claro, 0.6),
);
await renderizar(
  join(PUBLIC, 'icons', 'favicon-32.png'),
  32,
  32,
  1,
  html('#ffffff', claro, 0.94),
);
// iOS rellena de negro la transparencia y redondea él las esquinas.
await renderizar(
  join(PUBLIC, 'apple-touch-icon.png'),
  180,
  180,
  1,
  html('#ffffff', claro, 0.8),
);

rmSync(join(PUBLIC, 'splash'), { recursive: true, force: true });
const enlaces: string[] = [];
for (const [ancho, alto, dpr, modelos] of IPHONES) {
  for (const [nombre, tema] of Object.entries(TEMAS)) {
    const fichero = `splash/${ancho * dpr}x${alto * dpr}-${nombre}.png`;
    await renderizar(
      join(PUBLIC, fichero),
      ancho,
      alto,
      dpr,
      html(tema.fondo, dataUrl(tema.escudo), ESCALA_SPLASH),
    );
    const esquema = nombre === 'claro' ? 'light' : 'dark';
    enlaces.push(
      `    <!-- iPhone ${modelos} (${esquema}) -->\n` +
        `    <link rel="apple-touch-startup-image" media="(device-width: ${ancho}px) and (device-height: ${alto}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${esquema})" href="/${fichero}" />`,
    );
  }
}
await navegador.close();

const INICIO = '    <!-- splash:inicio (npm run iconos) -->';
const FIN = '    <!-- splash:fin -->';
const indice = join(RAIZ, 'index.html');
const actual = readFileSync(indice, 'utf8');
const [antes, resto] = actual.split(INICIO);
const despues = resto?.split(FIN)[1];
if (antes === undefined || despues === undefined) {
  throw new Error('index.html no tiene las marcas del bloque de splash');
}
writeFileSync(
  indice,
  [antes, INICIO, '\n', enlaces.join('\n'), '\n', FIN, despues].join(''),
);
// Prettier manda en el formato del HTML (los `link` van en varias líneas).
execSync('npx prettier --write index.html', { cwd: RAIZ });
console.log(`Iconos y ${enlaces.length} splash generados.`);
