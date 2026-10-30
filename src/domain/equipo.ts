/**
 * Equipo según la fuente que lo trae. La API usa dos ids distintos para el
 * mismo equipo: `inscripcionId` (árbol y clasificación, propio de cada
 * división) y `equipoId` (agenda, `/equipos` y plantilla). Cada fuente
 * rellena el suyo; `fusionarEquipos` completa el que falta cruzando por nombre.
 */
export interface Equipo {
  inscripcionId: string | null;
  equipoId: string | null;
  clubId: string | null;
  nombre: string;
  nombreAbrev: string;
  logoUrl: string | null;
}

/** Nombres como «LOYOLA INDAUTXU A» o abreviaturas «LOY», «LOY B». */
export function esEquipoLoyola(
  equipo: Pick<Equipo, 'nombre' | 'nombreAbrev'>,
): boolean {
  return [equipo.nombre, equipo.nombreAbrev].some((texto) => {
    const valor = texto.toUpperCase();
    return valor.includes('LOYOLA') || /\bLOY\b/.test(valor);
  });
}

function claveNombre(nombre: string): string {
  return nombre.trim().toUpperCase();
}

/**
 * Si dos equipos de una misma división son el mismo aunque vengan de fuentes
 * distintas. Cada id solo vale si ambos lo traen: el catálogo sale de la
 * agenda y `/equipos` (solo `equipoId`) y el calendario, del árbol (solo
 * `inscripcionId`), así que entre ellos solo queda el nombre.
 */
export function mismoEquipo(
  a: Pick<Equipo, 'inscripcionId' | 'equipoId' | 'nombre'>,
  b: Pick<Equipo, 'inscripcionId' | 'equipoId' | 'nombre'>,
): boolean {
  if (a.inscripcionId && b.inscripcionId) {
    return a.inscripcionId === b.inscripcionId;
  }
  if (a.equipoId && b.equipoId) return a.equipoId === b.equipoId;
  return claveNombre(a.nombre) === claveNombre(b.nombre);
}

/**
 * Junta los equipos de varias fuentes de una misma división. El nombre es lo
 * único que comparten todas; la primera fuente manda y las siguientes solo
 * rellenan los campos que le faltan.
 */
export function fusionarEquipos(
  ...fuentes: readonly (readonly Equipo[])[]
): Equipo[] {
  const porNombre = new Map<string, Equipo>();
  for (const equipo of fuentes.flat()) {
    const clave = claveNombre(equipo.nombre);
    const previo = porNombre.get(clave);
    porNombre.set(
      clave,
      previo
        ? {
            ...previo,
            inscripcionId: previo.inscripcionId ?? equipo.inscripcionId,
            equipoId: previo.equipoId ?? equipo.equipoId,
            clubId: previo.clubId ?? equipo.clubId,
            logoUrl: previo.logoUrl ?? equipo.logoUrl,
          }
        : equipo,
    );
  }
  return [...porNombre.values()];
}
