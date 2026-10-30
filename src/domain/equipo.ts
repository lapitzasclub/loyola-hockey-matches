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
