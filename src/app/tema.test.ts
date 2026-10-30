import { beforeEach, describe, expect, it } from 'vitest';

import { esColorClaro } from './barrasSistema';
import { leerPreferenciaTema, temaEfectivo } from './tema';

describe('temaEfectivo', () => {
  it('«sistema» sigue al sistema y las fijas lo ignoran', () => {
    expect(temaEfectivo('sistema', true)).toBe('dark');
    expect(temaEfectivo('sistema', false)).toBe('light');
    expect(temaEfectivo('claro', true)).toBe('light');
    expect(temaEfectivo('oscuro', false)).toBe('dark');
  });
});

describe('leerPreferenciaTema', () => {
  beforeEach(() => localStorage.clear());

  it('recupera la guardada y descarta valores desconocidos', () => {
    expect(leerPreferenciaTema()).toBe('sistema');
    localStorage.setItem('loyola.tema', 'oscuro');
    expect(leerPreferenciaTema()).toBe('oscuro');
    localStorage.setItem('loyola.tema', 'rosa');
    expect(leerPreferenciaTema()).toBe('sistema');
  });
});

describe('esColorClaro', () => {
  it('distingue las barras de cada tema', () => {
    expect(esColorClaro('#ffffff')).toBe(true);
    expect(esColorClaro('#0e3a43')).toBe(false);
    expect(esColorClaro('#121212')).toBe(false);
  });
});
