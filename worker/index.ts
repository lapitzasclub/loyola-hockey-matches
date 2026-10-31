import { crearApp } from './app';

/**
 * Entrada del worker de Pages en modo avanzado: `npm run build` lo compila a
 * `dist/_worker.js` y `public/_routes.json` hace que solo lo invoquen `/api/*`
 * y `/connection/*` (los estáticos no gastan peticiones del plan gratuito).
 */
export default crearApp();
