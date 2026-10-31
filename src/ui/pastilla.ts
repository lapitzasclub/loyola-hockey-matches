/** Hueco horizontal de un botón del segmento, relativo al segmento. */
export interface Tramo {
  x: number;
  ancho: number;
}

/**
 * Dónde va la pastilla del segmento cuando los paneles están desplazados
 * `posicion` paneles (fraccionaria a mitad de gesto): entre dos botones, se
 * interpola su hueco. Fuera de rango se queda en el extremo.
 */
export function pastillaEn(
  tramos: readonly Tramo[],
  posicion: number,
): Tramo | null {
  const ultimo = tramos.length - 1;
  if (ultimo < 0) return null;
  const p = Math.min(Math.max(posicion, 0), ultimo);
  const i = Math.floor(p);
  const a = tramos[i];
  const b = tramos[Math.min(i + 1, ultimo)] ?? a;
  if (!a || !b) return null;
  const f = p - i;
  return { x: a.x + (b.x - a.x) * f, ancho: a.ancho + (b.ancho - a.ancho) * f };
}
