import type { PartidoVisible } from '../domain';

const MAXIMO = 30;
const tarjetas = new Map<string, PartidoVisible>();

/**
 * Lo que enseñaba una tarjeta de partido al pulsarla, para que el detalle
 * pinte su cabecera al instante mientras llega el acta. Solo en memoria: con
 * un enlace directo no hay previa.
 */
export function recordarTarjeta(visible: PartidoVisible) {
  tarjetas.delete(visible.partido.id);
  tarjetas.set(visible.partido.id, visible);
  // El Map guarda el orden de inserción: el primero es el más antiguo.
  const antigua = tarjetas.keys().next().value;
  if (tarjetas.size > MAXIMO && antigua !== undefined) tarjetas.delete(antigua);
}

export const tarjetaPulsada = (partidoId: string | undefined) =>
  partidoId ? tarjetas.get(partidoId) : undefined;
