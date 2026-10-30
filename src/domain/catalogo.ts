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

/**
 * Identifica un equipo del catálogo entre aperturas de la app. Va por nombre
 * y no por id porque cada fuente trae uno distinto (ver `Equipo`) y el
 * catálogo ya fusiona por nombre dentro de una división.
 */
export function claveEquipo({ division, equipo }: EquipoCatalogo): string {
  return `${division.id}|${equipo.nombre.trim().toUpperCase()}`;
}

export function buscarEquipo(
  catalogo: readonly EquipoCatalogo[],
  clave: string | null,
): EquipoCatalogo | null {
  if (!clave) return null;
  return catalogo.find((e) => claveEquipo(e) === clave) ?? null;
}

/** De menor a mayor edad; lo que no se reconoce va al final. */
const ORDEN_CATEGORIAS = [
  'prebenjam',
  'benjam',
  'alev',
  'infant',
  'juvenil',
  'junior',
  'senior',
];

function rangoCategoria(nombre: string): number {
  const texto = nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const i = ORDEN_CATEGORIAS.findIndex((c) => texto.includes(c));
  return i === -1 ? ORDEN_CATEGORIAS.length : i;
}

export interface GrupoCategoria {
  categoria: string;
  equipos: EquipoCatalogo[];
}

/**
 * Equipos del selector agrupados por categoría (Benjamín, Infantil…),
 * de menor a mayor edad. Dentro de cada una se conserva el orden del catálogo
 * (competición y nombre).
 */
export function agruparPorCategoria(
  catalogo: readonly EquipoCatalogo[],
): GrupoCategoria[] {
  const grupos = new Map<string, EquipoCatalogo[]>();
  for (const entrada of catalogo) {
    const categoria = entrada.division.categoria ?? entrada.division.nombre;
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), entrada]);
  }
  return [...grupos]
    .map(([categoria, equipos]) => ({ categoria, equipos }))
    .sort(
      (a, b) =>
        rangoCategoria(a.categoria) - rangoCategoria(b.categoria) ||
        a.categoria.localeCompare(b.categoria, 'es'),
    );
}
