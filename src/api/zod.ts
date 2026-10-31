import { z } from 'zod';

/**
 * La CSP de la web no permite `eval`: sin esto Zod prueba `new Function` al
 * crear cada esquema de objeto y la CSP lo denuncia en cada carga. Tiene que
 * ejecutarse antes de definir ningún esquema: `main.tsx` lo importa el primero.
 */
z.config({ jitless: true });
