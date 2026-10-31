/**
 * Geometría pura de la transición compartida (ver `transicionPagina.ts`):
 * qué elementos se emparejan y qué `transform` lleva cada clon de un sitio a
 * otro. Todas las transformaciones suponen `transform-origin: 0 0`.
 */

export interface Caja {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Candidato {
  nombre: string;
  /** Está dentro del enlace que lanzó la navegación (o al que se vuelve). */
  pulsado: boolean;
}

/** Si `caja` cabe entera en `marco` (con un píxel de holgura por redondeos). */
export function dentro(caja: Caja, marco: Caja): boolean {
  return (
    caja.width > 0 &&
    caja.height > 0 &&
    caja.left >= marco.left - 1 &&
    caja.top >= marco.top - 1 &&
    caja.left + caja.width <= marco.left + marco.width + 1 &&
    caja.top + caja.height <= marco.top + marco.height + 1
  );
}

/** Parte común de dos cajas; `null` si no se tocan. */
export function interseccion(a: Caja, b: Caja): Caja | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}

/** Lleva un elemento que ocupa `de` a ocupar `a`, deformándolo si hace falta. */
export function ajusteCaja(de: Caja, a: Caja): string {
  const sx = a.width / de.width;
  const sy = a.height / de.height;
  return `translate(${a.left - de.left}px, ${a.top - de.top}px) scale(${sx}, ${sy})`;
}

/**
 * Lleva el texto de un elemento sobre el texto de otro. La escala es uniforme
 * (la razón entre tamaños de letra) para que las letras no se deformen, y se
 * alinean los centros del texto y no los de las cajas: así da igual que un
 * lado esté alineado a la izquierda y estirado y el otro centrado.
 */
export function ajusteTexto(
  de: { caja: Caja; texto: Caja },
  a: { texto: Caja },
  escala: number,
): string {
  const cx = de.texto.left - de.caja.left + de.texto.width / 2;
  const cy = de.texto.top - de.caja.top + de.texto.height / 2;
  const tx = a.texto.left + a.texto.width / 2 - de.caja.left - cx * escala;
  const ty = a.texto.top + a.texto.height / 2 - de.caja.top - cy * escala;
  return `translate(${tx}px, ${ty}px) scale(${escala})`;
}

/**
 * Parejas por nombre entre la página que sale y la que entra. Si un nombre se
 * repite en un lado (el mismo equipo en dos tablas), gana el que está en el
 * enlace pulsado y, si no, el primero.
 */
export function emparejar<T extends Candidato>(
  salientes: readonly T[],
  entrantes: readonly T[],
): [T, T][] {
  const elegir = (lista: readonly T[]) => {
    const porNombre = new Map<string, T>();
    for (const c of lista) {
      const previo = porNombre.get(c.nombre);
      if (!previo || (c.pulsado && !previo.pulsado)) porNombre.set(c.nombre, c);
    }
    return porNombre;
  };
  const entrada = elegir(entrantes);
  const parejas: [T, T][] = [];
  for (const [nombre, saliente] of elegir(salientes)) {
    const entrante = entrada.get(nombre);
    if (entrante) parejas.push([saliente, entrante]);
  }
  return parejas;
}
