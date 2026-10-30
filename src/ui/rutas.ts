import { useLocation } from 'react-router-dom';

/**
 * Cada pestaña tiene su propia pila: equipo, partido y jugador cuelgan de la
 * pestaña desde la que se abren, así que el back y el swipe vuelven dentro de
 * ella y al cambiar de pestaña se conserva dónde se estaba.
 */
export const PESTANAS = ['partidos', 'clasificacion', 'estadisticas'] as const;
export type Pestana = (typeof PESTANAS)[number];

/** Pestaña de arranque; el back de Android sale de la app desde su raíz. */
export const PESTANA_INICIAL: Pestana = 'partidos';

/** Rutas de detalle relativas a la pestaña, para el router. */
export const PATRONES = {
  equipo: 'equipo/:competicionId/:divisionId/:inscripcionId',
  partido: 'partido/:partidoId',
  jugador: 'jugador/:plantillaEquipoId',
} as const;

export interface ParamsEquipo {
  competicionId: string;
  divisionId: string;
  inscripcionId: string;
}

export function pestanaDeRuta(pathname: string): Pestana {
  const primero = pathname.split('/').find(Boolean);
  return PESTANAS.find((p) => p === primero) ?? PESTANA_INICIAL;
}

const seg = encodeURIComponent;

export const rutas = {
  raiz: (p: Pestana) => `/${p}`,
  equipo: (p: Pestana, e: ParamsEquipo) =>
    `/${p}/equipo/${seg(e.competicionId)}/${seg(e.divisionId)}/${seg(e.inscripcionId)}`,
  partido: (p: Pestana, id: string) => `/${p}/partido/${seg(id)}`,
  jugador: (p: Pestana, id: string) => `/${p}/jugador/${seg(id)}`,
};

/** Rutas para enlazar desde la pantalla actual, sin salir de su pestaña. */
export function useRutas() {
  const pestana = pestanaDeRuta(useLocation().pathname);
  return {
    pestana,
    raiz: rutas.raiz(pestana),
    equipo: (e: ParamsEquipo) => rutas.equipo(pestana, e),
    partido: (id: string) => rutas.partido(pestana, id),
    jugador: (id: string) => rutas.jugador(pestana, id),
  };
}
