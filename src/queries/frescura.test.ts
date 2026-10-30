import { describe, expect, it } from 'vitest';

import { frescuraPartido } from './frescura';

const ahora = Date.parse('2026-10-30T20:00:00Z');
const MINUTO = 60_000;

describe('frescuraPartido', () => {
  it('en juego se revisa cada pocos segundos', () => {
    expect(
      frescuraPartido({ estado: 'en_juego', fecha: '2026-10-30' }, ahora),
    ).toBe(15_000);
  });

  it('programado, cada pocos minutos', () => {
    expect(
      frescuraPartido({ estado: 'programado', fecha: '2026-11-02' }, ahora),
    ).toBe(5 * MINUTO);
  });

  it('recién finalizado sigue revisándose: el acta se corrige durante la jornada', () => {
    for (const fecha of ['2026-10-30', '2026-10-28']) {
      expect(frescuraPartido({ estado: 'finalizado', fecha }, ahora)).toBe(
        30 * MINUTO,
      );
    }
  });

  it('finalizado hace más de dos días ya no cambia', () => {
    expect(
      frescuraPartido({ estado: 'finalizado', fecha: '2026-10-27' }, ahora),
    ).toBe(Infinity);
  });

  it('sin datos todavía, se pide', () => {
    expect(frescuraPartido(undefined, ahora)).toBe(0);
  });
});
