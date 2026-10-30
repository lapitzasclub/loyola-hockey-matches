import { queryOptions, skipToken } from '@tanstack/react-query';

import { api } from '../api/cliente';
import type { Division } from '../domain';
import { claves } from './claves';
import { FRESCURA, frescuraPartido } from './frescura';

/**
 * Opciones de cada consulta, para usarlas igual en hooks, `prefetchQuery` o
 * `invalidateQueries`. Un id `undefined` deja la consulta en espera
 * (`skipToken`) hasta que la pantalla sepa qué pedir.
 */
export const consultas = {
  agenda: () =>
    queryOptions({
      queryKey: claves.agenda(),
      queryFn: ({ signal }) => api.agenda({ signal }),
      staleTime: FRESCURA.agenda,
    }),

  marcadores: () =>
    queryOptions({
      queryKey: claves.marcadores(),
      queryFn: ({ signal }) => api.marcadores({ signal }),
      staleTime: FRESCURA.marcadores,
      meta: { persistir: false },
    }),

  /**
   * El catálogo sale de la agenda del club: se aprovecha para dejarla en
   * caché y que la pestaña de partidos no la pida otra vez.
   */
  catalogo: () =>
    queryOptions({
      queryKey: claves.catalogo(),
      queryFn: async ({ signal, client }) => {
        const { catalogo, agenda } = await api.catalogo({ signal });
        client.setQueryData(claves.agenda(), agenda);
        return catalogo;
      },
      staleTime: FRESCURA.catalogo,
    }),

  divisiones: (competicionIds: readonly string[]) =>
    queryOptions({
      queryKey: claves.divisiones(competicionIds),
      queryFn: ({ signal }) => api.divisiones(competicionIds, { signal }),
      staleTime: FRESCURA.divisiones,
    }),

  calendario: (division: Pick<Division, 'id' | 'competicionId'> | undefined) =>
    queryOptions({
      queryKey: claves.calendario(division?.id),
      queryFn: division
        ? ({ signal }) => api.calendario(division, { signal })
        : skipToken,
      staleTime: FRESCURA.calendario,
    }),

  fases: (divisionId: string | undefined) =>
    queryOptions({
      queryKey: claves.fases(divisionId),
      queryFn: divisionId
        ? ({ signal }) => api.fases(divisionId, { signal })
        : skipToken,
      staleTime: FRESCURA.fases,
    }),

  equiposDivision: (divisionId: string | undefined) =>
    queryOptions({
      queryKey: claves.equiposDivision(divisionId),
      queryFn: divisionId
        ? ({ signal }) => api.equiposDivision(divisionId, { signal })
        : skipToken,
      staleTime: FRESCURA.equiposDivision,
    }),

  clasificacion: (faseId: string | undefined) =>
    queryOptions({
      queryKey: claves.clasificacion(faseId),
      queryFn: faseId
        ? ({ signal }) => api.clasificacion(faseId, { signal })
        : skipToken,
      staleTime: FRESCURA.clasificacion,
    }),

  partido: (id: string | undefined) =>
    queryOptions({
      queryKey: claves.partido(id),
      queryFn: id ? ({ signal }) => api.partido(id, { signal }) : skipToken,
      staleTime: (consulta) => frescuraPartido(consulta.state.data),
    }),

  estadisticasJugadores: (divisionId: string | undefined) =>
    queryOptions({
      queryKey: claves.estadisticasJugadores(divisionId),
      queryFn: divisionId
        ? ({ signal }) => api.estadisticasJugadores(divisionId, { signal })
        : skipToken,
      staleTime: FRESCURA.estadisticasJugadores,
    }),

  plantilla: (divisionId: string | undefined, equipoId: string | undefined) =>
    queryOptions({
      queryKey: claves.plantilla(divisionId, equipoId),
      queryFn:
        divisionId && equipoId
          ? ({ signal }) => api.plantilla(divisionId, equipoId, { signal })
          : skipToken,
      staleTime: FRESCURA.plantilla,
    }),

  fichaJugador: (plantillaEquipoId: string | undefined) =>
    queryOptions({
      queryKey: claves.fichaJugador(plantillaEquipoId),
      queryFn: plantillaEquipoId
        ? ({ signal }) => api.fichaJugador(plantillaEquipoId, { signal })
        : skipToken,
      staleTime: FRESCURA.fichaJugador,
    }),
};
