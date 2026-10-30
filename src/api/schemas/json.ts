import { z } from 'zod';

/**
 * Campo que la API manda como string con JSON dentro (`datosAdicionales`,
 * `configuracionReglas`…): se parsea y se valida el contenido. Todos son
 * objetos, y alguno llega como `""` cuando está vacío, que se trata como `{}`.
 */
export function jsonString<T extends z.ZodType>(esquema: T) {
  return z
    .string()
    .transform((texto, ctx): unknown => {
      if (texto.trim() === '') return {};
      try {
        return JSON.parse(texto);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'JSON inválido' });
        return z.NEVER;
      }
    })
    .pipe(esquema);
}

/** Hora `HH:MM` del partido; null si aún no está asignada. */
export const horaSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .nullable();
