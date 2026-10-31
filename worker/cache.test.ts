// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { segundosDeCache } from './cache';

const detalle = { tipo: 'vivo', abierto: 5, cerrado: 600 } as const;

describe('segundosDeCache del detalle de partido', () => {
  it('guarda poco mientras el acta no está cerrada', () => {
    for (const actaEstado of ['PROGRAMADO', 'REABIERTA', null]) {
      expect(
        segundosDeCache(detalle, JSON.stringify({ actaEstado })),
        String(actaEstado),
      ).toBe(5);
    }
  });

  it('guarda más con el acta cerrada', () => {
    expect(
      segundosDeCache(detalle, JSON.stringify({ actaEstado: 'FINALIZADO' })),
    ).toBe(600);
  });

  it('un cuerpo que no es JSON se trata como abierto', () => {
    expect(segundosDeCache(detalle, '<html>')).toBe(5);
  });
});
