import { z } from 'zod';

import { construirCatalogoLoyola, ordenarPartidos } from '../domain';
import type {
  CalendarioDivision,
  Division,
  Equipo,
  EquipoCatalogo,
  Fase,
  FichaJugador,
  FilaClasificacion,
  JugadorDivision,
  MarcadorDirecto,
  PartidoDetalle,
  PartidoResumen,
  Plantilla,
} from '../domain';
import {
  competicionesDeAgenda,
  divisionDesdeApi,
  equipoDesdeDivision,
  faseDesdeApi,
  fichaJugadorDesdeApi,
  filaDesdeApi,
  fuentesDivision,
  jugadorDivisionDesdeApi,
  marcadoresDesdeApi,
  partidoDesdeAgenda,
  partidoDetalleDesdeApi,
  partidosDeArbol,
  plantillaDesdeApi,
} from './mappers';
import {
  agendaSchema,
  arbolSchema,
  clasificacionSchema,
  configDirectoSchema,
  divisionesSchema,
  equiposDivisionSchema,
  estadisticasJugadoresSchema,
  fasesSchema,
  marcadoresSchema,
  partidoDetalleSchema,
  plantillaSchema,
  statsJugadorSchema,
  tokenDirectoSchema,
} from './schemas';
import { transporte } from './transport';
import type { PeticionApi, Transporte } from './transport';

/** Federación Vasca de Patinaje en DigitalSport. */
export const ENTIDAD_ID = '00000000-0000-4000-0000-000000000001';

/**
 * Club Loyola Indautxu. Con `clubId` la agenda trae solo sus partidos (123 KB
 * frente a 493 KB) y cubre todos sus equipos: comprobado el 2026-10-30, no
 * hay equipos «Loyola» colgados de otro club.
 */
export const CLUB_LOYOLA_ID = '00000000-0000-4000-0000-000000000044';

const DEPORTE = 'hp';

/** La API no da más: pedir más días devuelve 60. */
const AGENDA_DIAS = 60;

/** La API ha cambiado de forma: reintentar no sirve. */
export class ErrorContrato extends Error {
  readonly ruta: string;

  constructor(ruta: string, error: z.ZodError) {
    super(`${ruta} no cumple el esquema:\n${z.prettifyError(error)}`, {
      cause: error,
    });
    this.name = 'ErrorContrato';
    this.ruta = ruta;
  }
}

export interface Opciones {
  signal?: AbortSignal;
}

/**
 * Lo que cuesta montar el catálogo deja también la agenda del Loyola y las
 * divisiones, para sembrar su caché sin pedirlas otra vez.
 */
export interface CatalogoCargado {
  catalogo: EquipoCatalogo[];
  agenda: PartidoResumen[];
  divisiones: Division[];
}

const id = encodeURIComponent;

export function crearCliente(transporte: Transporte) {
  async function pedir<T extends z.ZodType>(
    esquema: T,
    peticion: PeticionApi,
  ): Promise<z.output<T>> {
    const datos = await transporte(peticion);
    const resultado = esquema.safeParse(datos);
    if (!resultado.success) {
      throw new ErrorContrato(peticion.ruta, resultado.error);
    }
    return resultado.data;
  }

  const agendaApi = ({ signal }: Opciones) =>
    pedir(agendaSchema, {
      ruta: '/public/agenda',
      params: {
        entidadId: ENTIDAD_ID,
        deporte: DEPORTE,
        dias: AGENDA_DIAS,
        clubId: CLUB_LOYOLA_ID,
      },
      signal,
    });

  const equiposApi = (divisionId: string, { signal }: Opciones) =>
    pedir(equiposDivisionSchema, {
      ruta: `/hierarchy/division/${id(divisionId)}/equipos`,
      signal,
    });

  async function divisiones(
    competicionIds: readonly string[],
    { signal }: Opciones = {},
  ): Promise<Division[]> {
    if (competicionIds.length === 0) return [];
    const lista = await pedir(divisionesSchema, {
      ruta: '/hierarchy/competiciones/divisiones',
      metodo: 'POST',
      cuerpo: competicionIds,
      signal,
    });
    return lista.map(divisionDesdeApi);
  }

  return {
    /**
     * Equipos Loyola de la temporada en tres rondas: agenda del club,
     * divisiones de sus competiciones en un solo POST y `/equipos` de cada
     * división en paralelo. El árbol (hasta 220 KB por división) no hace
     * falta aquí: se pide solo el de la división que se abre.
     */
    async catalogo(opciones: Opciones = {}): Promise<CatalogoCargado> {
      const agenda = await agendaApi(opciones);
      const competiciones = competicionesDeAgenda(agenda);
      const lista = await divisiones(
        competiciones.map((c) => c.id),
        opciones,
      );
      // `/equipos` solo completa a quien no juega en los próximos 60 días:
      // si falla, el catálogo sale igual con lo que trae la agenda.
      const equipos = await Promise.all(
        lista.map((d) =>
          equiposApi(d.id, opciones).catch((error: unknown) => {
            if (opciones.signal?.aborted) throw error;
            return [];
          }),
        ),
      );
      const porId = new Map(competiciones.map((c) => [c.id, c]));
      const fuentes = lista.flatMap((division, i) => {
        const competicion = porId.get(division.competicionId);
        return competicion
          ? [
              fuentesDivision({
                competicion,
                division,
                agenda,
                equipos: equipos[i],
              }),
            ]
          : [];
      });
      return {
        catalogo: construirCatalogoLoyola(fuentes),
        agenda: ordenarPartidos(agenda.eventos.map(partidoDesdeAgenda)),
        divisiones: lista,
      };
    },

    /** Partidos del Loyola en los próximos 60 días (desde ayer). */
    async agenda(opciones: Opciones = {}): Promise<PartidoResumen[]> {
      const agenda = await agendaApi(opciones);
      return ordenarPartidos(agenda.eventos.map(partidoDesdeAgenda));
    },

    divisiones,

    async fases(
      divisionId: string,
      { signal }: Opciones = {},
    ): Promise<Fase[]> {
      const fases = await pedir(fasesSchema, {
        ruta: `/hierarchy/division/${id(divisionId)}/fases`,
        signal,
      });
      return fases.map(faseDesdeApi).sort((a, b) => a.orden - b.orden);
    },

    async equiposDivision(
      divisionId: string,
      opciones: Opciones = {},
    ): Promise<Equipo[]> {
      const equipos = await equiposApi(divisionId, opciones);
      return equipos.map(equipoDesdeDivision);
    },

    async calendario(
      division: Pick<Division, 'id' | 'competicionId'>,
      { signal }: Opciones = {},
    ): Promise<CalendarioDivision> {
      const arbol = await pedir(arbolSchema, {
        ruta: `/hierarchy/division/${id(division.id)}/tree`,
        signal,
      });
      return {
        fases: arbol.map(faseDesdeApi).sort((a, b) => a.orden - b.orden),
        partidos: partidosDeArbol(arbol, division.competicionId),
      };
    },

    async clasificacion(
      faseId: string,
      { signal }: Opciones = {},
    ): Promise<FilaClasificacion[]> {
      const filas = await pedir(clasificacionSchema, {
        ruta: `/hierarchy/fase/${id(faseId)}/clasificacion`,
        signal,
      });
      return filas.map(filaDesdeApi);
    },

    async partido(
      partidoId: string,
      { signal }: Opciones = {},
    ): Promise<PartidoDetalle> {
      const detalle = await pedir(partidoDetalleSchema, {
        ruta: `/public/partidos/${id(partidoId)}`,
        signal,
      });
      return partidoDetalleDesdeApi(detalle);
    },

    /** Marcadores del momento de toda la federación, solo los empezados. */
    async marcadores({ signal }: Opciones = {}): Promise<MarcadorDirecto[]> {
      const marcadores = await pedir(marcadoresSchema, {
        ruta: '/public/partidos/marcadores',
        params: { entidadId: ENTIDAD_ID, deporte: DEPORTE },
        signal,
      });
      return marcadoresDesdeApi(marcadores);
    },

    /** URL del WebSocket de Centrifugo tal como la da la federación. */
    async configDirecto({ signal }: Opciones = {}): Promise<string> {
      const config = await pedir(configDirectoSchema, {
        ruta: '/auth/config',
        signal,
      });
      return config.centrifugoWsUrl;
    },

    /** JWT de conexión al directo; vale 24 h. */
    async tokenDirecto({ signal }: Opciones = {}): Promise<string> {
      const { token } = await pedir(tokenDirectoSchema, {
        ruta: '/auth/centrifugo-token-public',
        signal,
      });
      return token;
    },

    /** JWT para suscribirse a un canal del directo; vale 1 h. */
    async tokenCanal(
      canal: string,
      { signal }: Opciones = {},
    ): Promise<string> {
      const { token } = await pedir(tokenDirectoSchema, {
        ruta: '/auth/centrifugo-sub-token',
        params: { channel: canal },
        signal,
      });
      return token;
    },

    /** Solo quien ha jugado algún partido en la división. */
    async estadisticasJugadores(
      divisionId: string,
      { signal }: Opciones = {},
    ): Promise<JugadorDivision[]> {
      const estadisticas = await pedir(estadisticasJugadoresSchema, {
        ruta: `/hierarchy/division/${id(divisionId)}/estadisticas-jugadores`,
        signal,
      });
      return estadisticas.jugadores.map(jugadorDivisionDesdeApi);
    },

    async plantilla(
      divisionId: string,
      equipoId: string,
      { signal }: Opciones = {},
    ): Promise<Plantilla> {
      const plantilla = await pedir(plantillaSchema, {
        ruta: `/hierarchy/division/${id(divisionId)}/equipo/${id(equipoId)}/plantilla`,
        signal,
      });
      return plantillaDesdeApi(plantilla);
    },

    async fichaJugador(
      plantillaEquipoId: string,
      { signal }: Opciones = {},
    ): Promise<FichaJugador> {
      const stats = await pedir(statsJugadorSchema, {
        ruta: `/public/partidos/jugador/${id(plantillaEquipoId)}/stats`,
        signal,
      });
      return fichaJugadorDesdeApi(stats);
    },
  };
}

export type ClienteApi = ReturnType<typeof crearCliente>;

/** Cliente de la app: usa el transporte de este runtime. */
export const api: ClienteApi = crearCliente(transporte);
