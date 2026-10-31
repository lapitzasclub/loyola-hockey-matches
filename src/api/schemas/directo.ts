import { z } from 'zod';

/** `GET /auth/config`: de aquí sale la URL del WebSocket de Centrifugo. */
export const configDirectoSchema = z.object({
  centrifugoWsUrl: z.url({ protocol: /^wss?$/ }),
});

/**
 * `GET /auth/centrifugo-token-public` y `/auth/centrifugo-sub-token`: JWT de
 * conexión (24 h) y de suscripción a un canal (1 h).
 */
export const tokenDirectoSchema = z.object({ token: z.string().min(1) });

/**
 * Incidencia tal como llega por el directo. No es la de REST: trae los ids
 * de las personas pero no sus dorsales ni nombres (los `atleta*` llegan a
 * null), y `fechaCreacion` viene en UTC con `Z` y siete decimales.
 */
export const incidenciaDirectoSchema = z.object({
  id: z.guid(),
  fechaCreacion: z.iso.datetime(),
  periodo: z.number().int(),
  minuto: z.number().int(),
  segundo: z.number().int(),
  equipoId: z.guid(),
  tipo: z.string(),
  plantillaEquipoId: z.guid().nullable(),
  plantillaEquipoSecundariaId: z.guid().nullable(),
  porteroId: z.guid().nullable(),
  resultado: z.string().nullable(),
  codigo: z.string().nullable(),
  duracionSancionSegundos: z.number().int().nullable(),
});

/**
 * Mensaje del canal `acta_<partidoId>`: `{ type, ...campos }`. Los que no
 * cambian nada que se pueda aplicar a mano (`alineacion_actualizada`,
 * `atleta_verificado`, `firma_guardada` y cualquiera nuevo) quedan como
 * `otro`: se resuelven volviendo a pedir el detalle.
 */
export const eventoDirectoSchema = z.union([
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('incidencia_creada'),
      incidencia: incidenciaDirectoSchema,
    }),
    z.object({ type: z.literal('incidencia_eliminada'), id: z.guid() }),
    z.object({
      type: z.literal('periodo_actualizado'),
      periodo: z.number().int(),
    }),
    z.object({ type: z.literal('acta_cerrada') }),
    z.object({ type: z.literal('acta_reabierta') }),
    /** Llega cada ~3 s mientras corre el reloj, y al pararlo. */
    z.object({
      type: z.literal('crono'),
      periodo: z.number().int(),
      min: z.number().int(),
      sec: z.number().int(),
      enMarcha: z.boolean(),
    }),
  ]),
  z.object({ type: z.string() }).transform(({ type }) => ({
    type: 'otro' as const,
    original: type,
  })),
]);

export type ConfigDirectoApi = z.infer<typeof configDirectoSchema>;
export type IncidenciaDirectoApi = z.infer<typeof incidenciaDirectoSchema>;
export type EventoDirectoApi = z.output<typeof eventoDirectoSchema>;
