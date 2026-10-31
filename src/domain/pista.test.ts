import { describe, expect, it } from 'vitest';

import { crearCoordenadas, enlaceMapa } from './pista';

const BARAKALDO = { latitud: 43.2961, longitud: -2.9924 };

describe('crearCoordenadas', () => {
  it('necesita latitud y longitud', () => {
    expect(crearCoordenadas(43.2, -2.9)).toEqual({
      latitud: 43.2,
      longitud: -2.9,
    });
    expect(crearCoordenadas(43.2, null)).toBeNull();
    expect(crearCoordenadas(undefined, -2.9)).toBeNull();
  });

  it('acepta el 0 como coordenada válida', () => {
    expect(crearCoordenadas(0, 0)).toEqual({ latitud: 0, longitud: 0 });
  });
});

describe('enlaceMapa', () => {
  it('en Android usa geo: con el nombre escapado', () => {
    expect(enlaceMapa(BARAKALDO, 'Polideportivo Lasesarre', 'geo')).toBe(
      'geo:43.2961,-2.9924?q=43.2961,-2.9924(Polideportivo%20Lasesarre)',
    );
  });

  it('en iPhone abre Mapas', () => {
    expect(enlaceMapa(BARAKALDO, 'Pista & Club', 'apple')).toBe(
      'https://maps.apple.com/?ll=43.2961,-2.9924&q=Pista%20%26%20Club',
    );
  });

  it('en escritorio abre Google Maps', () => {
    expect(enlaceMapa(BARAKALDO, 'Lasesarre', 'google')).toBe(
      'https://maps.google.com/?q=43.2961,-2.9924',
    );
  });
});
