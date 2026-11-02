import { describe, expect, it } from 'vitest';

import { HUECO_LISTO, HUECO_MAX, huecoPara } from './goma';

describe('huecoPara', () => {
  it('cerrado sin tirar o al tirar hacia arriba', () => {
    expect(huecoPara(0)).toBe(0);
    expect(huecoPara(-40)).toBe(0);
  });

  it('al principio sigue al dedo, con algo de resistencia', () => {
    expect(huecoPara(20)).toBeGreaterThan(13);
  });

  it('se refresca con un tirón corto, no hace falta cruzar la pantalla', () => {
    expect(huecoPara(160)).toBeGreaterThanOrEqual(HUECO_LISTO);
    expect(huecoPara(120)).toBeLessThan(HUECO_LISTO);
  });

  it('nunca pasa del máximo', () => {
    expect(huecoPara(2000)).toBeLessThanOrEqual(HUECO_MAX);
    expect(huecoPara(2000)).toBeGreaterThan(HUECO_MAX - 1);
  });
});
