import type { Competicion, Division } from './competicion';
import { esEquipoLoyola, fusionarEquipos } from './equipo';
import type { Equipo } from './equipo';

/** Entrada del selector de equipo: un equipo Loyola en una división. */
export interface EquipoCatalogo {
  competicion: Competicion;
  division: Division;
  equipo: Equipo;
}

export interface FuentesDivision {
  competicion: Competicion;
  division: Division;
  /**
   * Equipos por fuente, de más a menos fiable. `/equipos` no trae siempre
   * todos los equipos (a veces faltan justo los Loyola) y una liga recién
   * empezada aún no tiene clasificación, así que se combinan todas.
   */
  fuentes: readonly (readonly Equipo[])[];
}

export function construirCatalogoLoyola(
  divisiones: readonly FuentesDivision[],
): EquipoCatalogo[] {
  return divisiones
    .flatMap(({ competicion, division, fuentes }) =>
      fusionarEquipos(...fuentes)
        .filter(esEquipoLoyola)
        .map((equipo) => ({ competicion, division, equipo })),
    )
    .sort(
      (a, b) =>
        a.competicion.nombre.localeCompare(b.competicion.nombre, 'es') ||
        a.equipo.nombre.localeCompare(b.equipo.nombre, 'es'),
    );
}
