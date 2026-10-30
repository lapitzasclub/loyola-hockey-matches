import { describe, expect, it } from 'vitest';

import { pestanaDeRuta, rutas } from './rutas';

describe('rutas', () => {
  it('cada detalle cuelga de la pestaña desde la que se abre', () => {
    expect(
      rutas.equipo('clasificacion', {
        competicionId: 'c',
        divisionId: 'd',
        inscripcionId: 'i',
      }),
    ).toBe('/clasificacion/equipo/c/d/i');
    expect(rutas.partido('partidos', 'p 1')).toBe('/partidos/partido/p%201');
  });

  it('la pestaña sale del primer segmento y cae a la inicial', () => {
    expect(pestanaDeRuta('/clasificacion/partido/x')).toBe('clasificacion');
    expect(pestanaDeRuta('/')).toBe('partidos');
    expect(pestanaDeRuta('/otra')).toBe('partidos');
  });
});
