/**
 * Quita del APK lo que `cap sync` copia de `dist/` y solo sirve a la web en
 * Cloudflare: el worker, sus reglas, el service worker y los splash de iOS.
 *
 *   npm run android:sync   (lo ejecuta tras `cap sync android`)
 */
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLICO = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'android/app/src/main/assets/public',
);

for (const ruta of [
  '_worker.js',
  '_routes.json',
  '_headers',
  'sw.js',
  'splash',
]) {
  rmSync(join(PUBLICO, ruta), { recursive: true, force: true });
}
