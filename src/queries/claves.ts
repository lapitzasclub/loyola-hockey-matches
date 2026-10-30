/**
 * Query keys de toda la app. Cuelgan de una raíz común para poder invalidar
 * o descartar la caché de la federación de golpe, y lo de una división cuelga
 * de su id para refrescar una pantalla entera con un solo `invalidateQueries`.
 */
const RAIZ = 'fvp';

const division = (id: string | undefined) => [RAIZ, 'division', id] as const;

export const claves = {
  todo: [RAIZ] as const,
  agenda: () => [RAIZ, 'agenda'] as const,
  marcadores: () => [RAIZ, 'marcadores'] as const,
  catalogo: () => [RAIZ, 'catalogo'] as const,
  /** El orden de los ids no cambia la respuesta: se normaliza. */
  divisiones: (competicionIds: readonly string[]) =>
    [RAIZ, 'divisiones', [...competicionIds].sort()] as const,
  division,
  calendario: (divisionId: string | undefined) =>
    [...division(divisionId), 'calendario'] as const,
  fases: (divisionId: string | undefined) =>
    [...division(divisionId), 'fases'] as const,
  equiposDivision: (divisionId: string | undefined) =>
    [...division(divisionId), 'equipos'] as const,
  estadisticasJugadores: (divisionId: string | undefined) =>
    [...division(divisionId), 'estadisticas-jugadores'] as const,
  plantilla: (divisionId: string | undefined, equipoId: string | undefined) =>
    [...division(divisionId), 'plantilla', equipoId] as const,
  /** Las tablas de todas las fases, para refrescar la que haya en pantalla. */
  clasificaciones: () => [RAIZ, 'fase'] as const,
  clasificacion: (faseId: string | undefined) =>
    [RAIZ, 'fase', faseId, 'clasificacion'] as const,
  partido: (id: string | undefined) => [RAIZ, 'partido', id] as const,
  fichaJugador: (plantillaEquipoId: string | undefined) =>
    [RAIZ, 'jugador', plantillaEquipoId] as const,
};
