import { describe, expect, it } from 'vitest';

import { pastillaEn } from './pastilla';

const tramos = [
  { x: 0, ancho: 100 },
  { x: 100, ancho: 100 },
  { x: 200, ancho: 140 },
];

describe('pastillaEn', () => {
  it('en un panel exacto ocupa el hueco de su botón', () => {
    expect(pastillaEn(tramos, 1)).toEqual({ x: 100, ancho: 100 });
  });

  it('a mitad de gesto interpola posición y ancho entre los dos botones', () => {
    expect(pastillaEn(tramos, 1.5)).toEqual({ x: 150, ancho: 120 });
  });

  it('con rebote fuera de rango se queda en el extremo', () => {
    expect(pastillaEn(tramos, -0.3)).toEqual({ x: 0, ancho: 100 });
    expect(pastillaEn(tramos, 2.4)).toEqual({ x: 200, ancho: 140 });
  });

  it('sin botones no hay pastilla', () => {
    expect(pastillaEn([], 0)).toBeNull();
  });
});
