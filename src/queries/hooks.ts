import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

import type { Division } from '../domain';
import { consultas } from './consultas';

export const useAgenda = () => useQuery(consultas.agenda());

/** Con `enDirecto` se vuelve a pedir cada 30 s mientras la pantalla está abierta. */
export const useMarcadores = (enDirecto = false) =>
  useQuery({
    ...consultas.marcadores(),
    refetchInterval: enDirecto ? 30_000 : false,
  });

/** Equipos Loyola de la temporada, ordenados por competición y nombre. */
export const useCatalogo = () => useQuery(consultas.catalogo());

export const useDivisiones = (competicionIds: readonly string[]) =>
  useQuery(consultas.divisiones(competicionIds));

export const useCalendario = (
  division: Pick<Division, 'id' | 'competicionId'> | undefined,
) => useQuery(consultas.calendario(division));

export const useFases = (divisionId: string | undefined) =>
  useQuery(consultas.fases(divisionId));

export const useEquiposDivision = (divisionId: string | undefined) =>
  useQuery(consultas.equiposDivision(divisionId));

export const useClasificacion = (faseId: string | undefined) =>
  useQuery(consultas.clasificacion(faseId));

export const usePartido = (id: string | undefined) =>
  useQuery(consultas.partido(id));

export const useEstadisticasJugadores = (divisionId: string | undefined) =>
  useQuery(consultas.estadisticasJugadores(divisionId));

export const usePlantilla = (
  divisionId: string | undefined,
  equipoId: string | undefined,
) => useQuery(consultas.plantilla(divisionId, equipoId));

export const useFichaJugador = (plantillaEquipoId: string | undefined) =>
  useQuery(consultas.fichaJugador(plantillaEquipoId));

/**
 * Pull-to-refresh: invalida las consultas de la vista y resuelve cuando las
 * que están en pantalla han vuelto a pedirse (bien o con error), para cerrar
 * el spinner justo entonces.
 */
export function useRefrescar(...vista: QueryKey[]) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      vista.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}
