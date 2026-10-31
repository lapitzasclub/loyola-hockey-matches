/**
 * Si se puede animar desplazamientos: no, cuando el sistema pide reducir el
 * movimiento. Sin `matchMedia` (jsdom) se da por permitido.
 */
export const movimientoPermitido = () =>
  !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
