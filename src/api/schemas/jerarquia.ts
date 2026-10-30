import { z } from 'zod';
import { horaSchema, jsonString } from './json';

/** `POST /hierarchy/competiciones/divisiones` con un array de competicionIds. */
export const divisionSchema = z.object({
  id: z.guid(),
  competicionId: z.guid(),
  nombreDisplay: z.string(),
  categoriaNombre: z.string().nullable(),
  genero: z.string().nullable(),
  orden: z.number().int(),
});
export const divisionesSchema = z.array(divisionSchema);

const leyendaSchema = z.object({
  /** Lista de puestos separados por comas: `"1"`, `"2,3,4"`. */
  puestos: z.string(),
  descripcion: z.string(),
  color: z.string().nullable(),
  colorTexto: z.string().nullable(),
});

/**
 * `configuracionReglas` de una fase. Los `grupos` agrupan inscripcionIds y
 * pueden solaparse (un equipo en «sector» y en «general» a la vez). Las
 * leyendas van por nombre de grupo, o por `general` si la fase no tiene grupos.
 */
const configuracionFaseSchema = z.object({
  grupos: z
    .array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        equipos: z.array(z.guid()),
      }),
    )
    .default([]),
  leyendasGrupos: z.record(z.string(), z.array(leyendaSchema)).default({}),
});

/** `GET /hierarchy/division/{id}/fases`. */
export const faseSchema = z.object({
  id: z.guid(),
  divisionId: z.guid(),
  nombre: z.string(),
  orden: z.number().int(),
  /** LEAGUE o KNOCKOUT; lo traduce el dominio. */
  formato: z.string(),
  configuracionReglas: jsonString(configuracionFaseSchema),
});
export const fasesSchema = z.array(faseSchema);

/**
 * `GET /hierarchy/division/{id}/equipos`. Ojo: no siempre trae todos los
 * equipos de la división; no sirve como única fuente del catálogo.
 */
export const equipoDivisionSchema = z.object({
  equipoId: z.guid(),
  nombre: z.string(),
  nombreAbrev: z.string(),
  clubId: z.guid().nullable(),
  clubLogoUrl: z.string().nullable(),
});
export const equiposDivisionSchema = z.array(equipoDivisionSchema);

/**
 * Participante de un enfrentamiento del árbol. `orden` 0 es el local.
 * `golesActa` es el marcador real (solo vale con el partido finalizado);
 * `puntaje` es el oficial, que en ligas escolares va capado. Aquí `equipoId`
 * viene siempre null: la clave es `inscripcionId`.
 */
const participanteSchema = z.object({
  inscripcionId: z.guid(),
  orden: z.number().int(),
  puntaje: z.number().nullable(),
  golesActa: z.number().int(),
  atletaNombre: z.string(),
  atletaNombreAbrev: z.string(),
  clubId: z.guid().nullable(),
  equipoId: z.guid().nullable(),
  clubLogoUrl: z.string().nullable(),
});

/**
 * Enfrentamiento del árbol. `estado` usa SCHEDULED/FINISHED, salvo en
 * eliminatorias, donde aparece también PROGRAMADO. `actaPeriodo` vale 30
 * con el acta cerrada. Sin participantes si el cruce aún no está decidido.
 */
const enfrentamientoSchema = z.object({
  id: z.guid(),
  nombre: z.string(),
  estado: z.string(),
  fechaInicio: z.iso.datetime(),
  hora: horaSchema,
  pista: z.string().nullable(),
  pistaLatitud: z.number().nullable(),
  pistaLongitud: z.number().nullable(),
  actaPeriodo: z.number().int().nullable(),
  participants: z.array(participanteSchema),
});

const jornadaSchema = z.object({
  id: z.guid(),
  nombre: z.string(),
  orden: z.number().int(),
  enfrentamientos: z.array(enfrentamientoSchema),
});

/** `GET /hierarchy/division/{id}/tree`: el calendario completo por fases. */
export const faseArbolSchema = z.object({
  id: z.guid(),
  nombre: z.string(),
  orden: z.number().int(),
  formato: z.string(),
  configuracionReglas: jsonString(configuracionFaseSchema),
  jornadas: z.array(jornadaSchema),
});
export const arbolSchema = z.array(faseArbolSchema);

export type DivisionApi = z.infer<typeof divisionSchema>;
export type FaseApi = z.infer<typeof faseSchema>;
export type ConfiguracionFaseApi = z.infer<typeof configuracionFaseSchema>;
export type LeyendaApi = z.infer<typeof leyendaSchema>;
export type EquipoDivisionApi = z.infer<typeof equipoDivisionSchema>;
export type ParticipanteApi = z.infer<typeof participanteSchema>;
export type EnfrentamientoApi = z.infer<typeof enfrentamientoSchema>;
export type FaseArbolApi = z.infer<typeof faseArbolSchema>;
