import { z } from 'zod';
import { jsonString } from './json';

/**
 * `datosAdicionales` llega como string JSON. `form` es la racha completa de
 * la fase en W/D/L (ojo: D es empate), de más antigua a más reciente.
 * `grupoId`/`grupoNombre` solo existen si la fase tiene grupos.
 */
const datosAdicionalesSchema = z.object({
  form: z.array(z.enum(['W', 'D', 'L'])).optional(),
  grupoId: z.string().nullable().optional(),
  grupoNombre: z.string().nullable().optional(),
});

/** Fila de `GET /hierarchy/fase/{faseId}/clasificacion`. */
export const filaClasificacionSchema = z.object({
  faseId: z.guid(),
  inscripcionId: z.guid(),
  puesto: z.number().int(),
  pj: z.number().int(),
  pg: z.number().int(),
  pe: z.number().int(),
  pp: z.number().int(),
  gf: z.number().int(),
  gc: z.number().int(),
  dg: z.number().int(),
  pts: z.number(),
  ajustePuntos: z.number(),
  ajusteNota: z.string().nullable(),
  datosAdicionales: jsonString(datosAdicionalesSchema),
  equipoNombre: z.string(),
  equipoNombreAbrev: z.string(),
  clubId: z.guid().nullable(),
  clubLogoUrl: z.string().nullable(),
});
export const clasificacionSchema = z.array(filaClasificacionSchema);

export type FilaClasificacionApi = z.infer<typeof filaClasificacionSchema>;
