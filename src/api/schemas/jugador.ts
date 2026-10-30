import { z } from 'zod';

/** Contadores comunes a todas las vistas de estadísticas de jugador. */
const contadoresSchema = z.object({
  goles: z.number().int(),
  asistencias: z.number().int(),
  faltasDirectasExitosas: z.number().int(),
  faltasDirectasIntentos: z.number().int(),
  penaltisExitosos: z.number().int(),
  penaltisIntentos: z.number().int(),
  tarjetasAmarillas: z.number().int(),
  tarjetasRojas: z.number().int(),
  tarjetasAzules: z.number().int(),
  faltas: z.number().int(),
  minutosJugados: z.number().int(),
  segundosSancion: z.number().int(),
  golesEncajados: z.number().int(),
  paradas: z.number().int(),
  tirosRecibidos: z.number().int(),
  /** 0–100, con decimales. */
  porcentajeParadas: z.number(),
});

/**
 * Fila de jugador de `estadisticas-jugadores` y de `plantilla`. En
 * `estadisticas-jugadores` `equipoNombre` es la abreviatura y solo salen
 * quienes han jugado algún partido; en `plantilla` es el nombre completo y
 * sale todo el equipo. La clave fiable es `equipoId`.
 */
export const filaJugadorSchema = contadoresSchema.extend({
  plantillaEquipoId: z.guid(),
  nombreCompleto: z.string(),
  nombreCorto: z.string(),
  equipoId: z.guid(),
  equipoNombre: z.string(),
  clubId: z.guid().nullable(),
  clubLogoUrl: z.string().nullable(),
  fotoUrl: z.string().nullable(),
  partidosJugados: z.number().int(),
  esPortero: z.boolean(),
  penaltisEncajados: z.number().int(),
  penaltisParados: z.number().int(),
  penaltisRecibidos: z.number().int(),
  porcentajeParadaPenaltis: z.number(),
  faltasDirectasEncajadas: z.number().int(),
  faltasDirectasParadas: z.number().int(),
  faltasDirectasRecibidas: z.number().int(),
  porcentajeParadaFaltasDirectas: z.number(),
  /** Rol en el cuerpo técnico; null en los jugadores. */
  rolCuerpoTecnico: z.string().nullable(),
});

/** `GET /hierarchy/division/{id}/estadisticas-jugadores`. */
export const estadisticasJugadoresSchema = z.object({
  jugadores: z.array(filaJugadorSchema),
  totales: z.object({
    penaltis: z.number().int(),
    faltasDirectas: z.number().int(),
    tarjetasAzules: z.number().int(),
    tarjetasRojas: z.number().int(),
  }),
});

/** `GET /hierarchy/division/{id}/equipo/{equipoId}/plantilla`. */
export const plantillaSchema = z.object({
  equipoId: z.guid(),
  nombre: z.string(),
  clubLogoUrl: z.string().nullable(),
  jugadores: z.array(filaJugadorSchema),
  cuerpoTecnico: z.array(filaJugadorSchema),
});

/** Partido de un jugador; los nombres de equipo son abreviaturas. */
const partidoJugadorSchema = contadoresSchema.extend({
  enfrentamientoId: z.guid(),
  fechaInicio: z.iso.datetime(),
  localNombre: z.string(),
  localLogoUrl: z.string().nullable(),
  localPuntaje: z.number().int().nullable(),
  visitanteNombre: z.string(),
  visitanteLogoUrl: z.string().nullable(),
  visitantePuntaje: z.number().int().nullable(),
});

/**
 * `GET /public/partidos/jugador/{plantillaEquipoId}/stats`: la temporada
 * del jugador en todas las competiciones de su ficha.
 */
export const statsJugadorSchema = z.object({
  plantillaEquipoId: z.guid(),
  personaId: z.guid(),
  nombreCompleto: z.string(),
  nacionalidad: z.string().nullable(),
  anioNacimiento: z.number().int().nullable(),
  fotoUrl: z.string().nullable(),
  rolPosicion: z.string(),
  esPortero: z.boolean(),
  resumenGlobal: contadoresSchema,
  competiciones: z.array(
    z.object({
      competicionId: z.guid(),
      competicionNombre: z.string(),
      totalPartidos: z.number().int(),
      resumenCompeticion: contadoresSchema,
      partidos: z.array(partidoJugadorSchema),
    }),
  ),
});

export type ContadoresJugadorApi = z.infer<typeof contadoresSchema>;
export type FilaJugadorApi = z.infer<typeof filaJugadorSchema>;
export type EstadisticasJugadoresApi = z.infer<
  typeof estadisticasJugadoresSchema
>;
export type PlantillaApi = z.infer<typeof plantillaSchema>;
export type PartidoJugadorApi = z.infer<typeof partidoJugadorSchema>;
export type StatsJugadorApi = z.infer<typeof statsJugadorSchema>;
