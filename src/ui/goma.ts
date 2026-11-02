/** Lo más que se abre el hueco del pull-to-refresh, por mucho que se tire. */
export const HUECO_MAX = 104;
/** A partir de aquí, al soltar se refresca. */
export const HUECO_LISTO = 68;
/** Lo que queda abierto mientras actualiza: cabe el spinner y el texto. */
export const HUECO_REFRESCANDO = 76;

/**
 * Hueco (px) para un arrastre de `dedo` px: al principio sigue al dedo y se
 * va frenando hasta `HUECO_MAX`, sin llegar nunca, como una goma.
 */
export function huecoPara(dedo: number): number {
  if (dedo <= 0) return 0;
  return HUECO_MAX * (1 - Math.exp(-dedo / (HUECO_MAX * 1.3)));
}
