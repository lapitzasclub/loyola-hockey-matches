import { z } from 'zod';
import { horaSchema } from './json';

const ladoAgendaSchema = z.object({
  equipoId: z.guid(),
  clubId: z.guid().nullable(),
  nombre: z.string(),
  nombreAbrev: z.string(),
  logoUrl: z.string().nullable(),
  puntaje: z.number().nullable(),
});

/**
 * Evento de `GET /public/agenda`. El `id` coincide con el del enfrentamiento
 * del árbol. El `estado` usa el vocabulario en español (PROGRAMADO,
 * EN_JUEGO, FINALIZADO); se deja como string y lo normaliza el dominio.
 */
export const eventoAgendaSchema = z.object({
  id: z.guid(),
  tipo: z.string(),
  estado: z.string(),
  fecha: z.iso.date(),
  hora: horaSchema,
  pista: z.string().nullable(),
  latitud: z.number().nullable(),
  longitud: z.number().nullable(),
  competicionId: z.guid(),
  competicionNombre: z.string(),
  temporada: z.string(),
  divisionNombre: z.string(),
  jornadaNombre: z.string().nullable(),
  local: ladoAgendaSchema,
  visitante: ladoAgendaSchema,
});

/** `GET /public/agenda`: solo eventos desde ayer y como mucho 60 días. */
export const agendaSchema = z.object({
  desde: z.iso.date(),
  hasta: z.iso.date(),
  dias: z.number().int(),
  eventos: z.array(eventoAgendaSchema),
});

export type EventoAgendaApi = z.infer<typeof eventoAgendaSchema>;
export type AgendaApi = z.infer<typeof agendaSchema>;
