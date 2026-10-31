import { z } from 'zod';
import { horaSchema, jsonString } from './json';

/**
 * Equipo en el detalle de partido. `puntaje` es el resultado oficial: null
 * hasta que se cierra el acta, y en ligas escolares no coincide con los goles.
 * `ganoDesempate` marca al ganador de la tanda de penaltis o la prórroga.
 */
const ladoPartidoSchema = z.object({
  inscripcionId: z.guid(),
  equipoId: z.guid(),
  nombre: z.string(),
  nombreAbrev: z.string(),
  logoUrl: z.string().nullable(),
  puntaje: z.number().int().nullable(),
  ganoDesempate: z.boolean(),
});

/**
 * Ficha de la alineación. `dorsal` es un string con ceros (`"04"`) y llega
 * como `""` en el staff y en algún jugador. `rolPosicion` puede ser `""`.
 */
const alineacionSchema = z.object({
  plantillaEquipoId: z.guid(),
  dorsal: z.string(),
  rolPosicion: z.string(),
  esInicial: z.boolean(),
  esCapitan: z.boolean(),
  nombre: z.string(),
  nombrePila: z.string(),
  fotoUrl: z.string().nullable(),
});

/**
 * Incidencia tal como llega: un objeto plano para todos los tipos. El
 * jugador principal es el autor (en CAMBIO, el que entra); el secundario,
 * el asistente o el que sale; `portero*`, el portero que recibe el tiro.
 * `resultado` (GOL, NO_GOL, PENDIENTE) solo viene en penaltis y faltas
 * directas. `tipo` queda como string: el mapper descarta los desconocidos.
 */
export const incidenciaSchema = z.object({
  id: z.guid(),
  /** UTC sin zona; desempata incidencias del mismo segundo. */
  fechaCreacion: z.iso.datetime({ local: true }),
  periodo: z.number().int(),
  minuto: z.number().int(),
  segundo: z.number().int(),
  equipoId: z.guid(),
  tipo: z.string(),
  plantillaEquipoId: z.guid().nullable(),
  dorsal: z.string().nullable(),
  nombre: z.string().nullable(),
  nombrePila: z.string().nullable(),
  fotoUrl: z.string().nullable(),
  plantillaEquipoSecundariaId: z.guid().nullable(),
  dorsalSecundario: z.string().nullable(),
  nombreSecundario: z.string().nullable(),
  porteroId: z.guid().nullable(),
  porteroDorsal: z.string().nullable(),
  porteroNombre: z.string().nullable(),
  resultado: z.string().nullable(),
  /** En GOL, `FALTA DIRECTA` o `PENALTI`; en tarjetas, el color. */
  codigo: z.string().nullable(),
  duracionSancionSegundos: z.number().int().nullable(),
});

/** `configuracionReglas` del partido; también trae slots y emisión. */
const configuracionPartidoSchema = z.object({
  /** El empate se resuelve con tanda de penaltis. */
  penaltis: z.boolean().default(false),
});

const textoCronicaSchema = z.object({
  titular: z.string(),
  texto: z.string(),
});

/**
 * `GET /public/partidos/{id}`. El `estado` no es fiable en vivo (se queda
 * en SCHEDULED/PROGRAMADO): manda `periodo`. `numeroPeriodos` puede venir
 * a 0 aunque `duracionPeriodos` tenga los periodos de la liga.
 */
export const partidoDetalleSchema = z.object({
  id: z.guid(),
  nombre: z.string(),
  estado: z.string(),
  /** PROGRAMADO, FINALIZADO o REABIERTA. */
  actaEstado: z.string(),
  periodo: z.number().int(),
  cronoMin: z.number().int().nullable(),
  cronoSec: z.number().int().nullable(),
  cronoEnMarcha: z.boolean(),
  fechaInicio: z.iso.datetime(),
  hora: horaSchema,
  pista: z.string().nullable(),
  pistaLatitud: z.number().nullable(),
  pistaLongitud: z.number().nullable(),
  configuracionReglas: jsonString(configuracionPartidoSchema),
  competicionId: z.guid(),
  competicionNombre: z.string(),
  divisionId: z.guid(),
  divisionNombre: z.string(),
  faseId: z.guid(),
  jornadaNombre: z.string().nullable(),
  arbitro1Nombre: z.string().nullable(),
  arbitro2Nombre: z.string().nullable(),
  local: ladoPartidoSchema,
  visitante: ladoPartidoSchema,
  alineacionesLocal: z.array(alineacionSchema),
  alineacionesVisitante: z.array(alineacionSchema),
  incidencias: z.array(incidenciaSchema),
  duracionPeriodos: z.array(z.number().int()),
  numeroPeriodos: z.number().int(),
  marcadorACero: z.boolean(),
  maxDiferenciaGoles: z.number().int(),
  puntuacionPorPeriodos: z.boolean(),
  puntoBonus: z.boolean(),
  cronica: z
    .object({
      es: textoCronicaSchema.optional(),
      eu: textoCronicaSchema.optional(),
    })
    .nullable(),
});

const ladoMarcadorSchema = z.object({
  inscripcionId: z.guid(),
  equipoId: z.guid(),
  nombreAbrev: z.string(),
  logoUrl: z.string().nullable(),
  goles: z.number().int(),
  ganoDesempate: z.boolean(),
});

/**
 * Partido de `GET /public/partidos/marcadores`. Lista también partidos sin
 * empezar (`periodo` 0, goles 0-0), incluso de días siguientes.
 */
export const partidoMarcadorSchema = z.object({
  id: z.guid(),
  jornadaNombre: z.string().nullable(),
  fechaInicio: z.iso.datetime(),
  hora: horaSchema,
  periodo: z.number().int(),
  actaCerrada: z.boolean(),
  marcadorACero: z.boolean(),
  maxDiferenciaGoles: z.number().int(),
  resultadoOficial: z.boolean(),
  puntuacionPorPeriodos: z.boolean(),
  puntoBonus: z.boolean(),
  desempatePenaltis: z.boolean(),
  local: ladoMarcadorSchema,
  visitante: ladoMarcadorSchema,
});

/** `GET /public/partidos/marcadores`, agrupado por competición. */
export const marcadoresSchema = z.array(
  z.object({
    competicionId: z.guid(),
    competicionNombre: z.string(),
    fases: z.array(z.object({ id: z.guid(), nombre: z.string() })),
    matches: z.array(partidoMarcadorSchema),
  }),
);

export type LadoPartidoApi = z.infer<typeof ladoPartidoSchema>;
export type AlineacionApi = z.infer<typeof alineacionSchema>;
export type IncidenciaApi = z.infer<typeof incidenciaSchema>;
export type PartidoDetalleApi = z.infer<typeof partidoDetalleSchema>;
export type PartidoMarcadorApi = z.infer<typeof partidoMarcadorSchema>;
export type MarcadoresApi = z.infer<typeof marcadoresSchema>;
