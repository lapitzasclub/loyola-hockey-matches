/** Competición descubierta en la agenda (no hay endpoint de competiciones). */
export interface Competicion {
  id: string;
  nombre: string;
  temporada: string;
}

/**
 * División de una competición. Su `nombre` se repite entre competiciones
 * («Infantil Escolar» lo usan tres ligas), así que para mostrar manda el
 * nombre de la competición.
 */
export interface Division {
  id: string;
  competicionId: string;
  nombre: string;
  categoria: string | null;
  genero: string | null;
  orden: number;
}

export type FormatoFase = 'liga' | 'eliminatoria';

/** Franja de color de la clasificación («Ascenso directo», «Plazas sector»…). */
export interface Leyenda {
  puestos: number[];
  descripcion: string;
  /** Solo colores hex; null si la API manda otra cosa (p. ej. `var(--…)`). */
  color: string | null;
  colorTexto: string | null;
}

/** Subconjunto de equipos de una fase con su propia tabla. */
export interface Grupo {
  id: string;
  nombre: string;
  inscripcionIds: string[];
  leyendas: Leyenda[];
}

export interface Fase {
  id: string;
  nombre: string;
  orden: number;
  formato: FormatoFase;
  /** Los grupos pueden solaparse: un equipo puede estar en varios. */
  grupos: Grupo[];
  /** Leyendas de la tabla única, cuando la fase no tiene grupos. */
  leyendas: Leyenda[];
}

/** `"2,3,4"` → `[2, 3, 4]`; admite también rangos `"1-4"`. */
export function parsearPuestos(texto: string): number[] {
  return texto.split(',').flatMap((parte) => {
    const rango = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(parte);
    if (!rango) return [];
    const desde = Number(rango[1]);
    const hasta = Number(rango[2] ?? rango[1]);
    return Array.from(
      { length: Math.max(0, hasta - desde + 1) },
      (_, i) => desde + i,
    );
  });
}

/**
 * Los colores llegan pensados para la web de la federación y a veces son
 * variables CSS suyas, que aquí no existen. Solo se aceptan hex.
 */
export function colorHex(color: string | null | undefined): string | null {
  const valor = color?.trim() ?? '';
  return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(valor)
    ? valor
    : null;
}

export function leyendaDePuesto(
  leyendas: readonly Leyenda[],
  puesto: number,
): Leyenda | null {
  return leyendas.find((l) => l.puestos.includes(puesto)) ?? null;
}
