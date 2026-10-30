import { describe, expect, it } from 'vitest';

import { agruparPorCategoria, buscarEquipo, claveEquipo } from './catalogo';
import type { EquipoCatalogo } from './catalogo';
import { equipo } from './test-utils';

function entrada(categoria: string | null, nombre: string): EquipoCatalogo {
  return {
    division: { id: 'd1', nombre: `Liga ${categoria}`, categoria },
    equipo: equipo(nombre),
  } as unknown as EquipoCatalogo;
}

describe('claveEquipo / buscarEquipo', () => {
  const a = entrada('Infantil', 'Loyola A');
  const b = entrada('Infantil', 'Loyola B');

  it('distingue equipos y es estable ante mayúsculas y espacios', () => {
    expect(claveEquipo(a)).not.toBe(claveEquipo(b));
    expect(claveEquipo(entrada('Infantil', ' loyola a '))).toBe(claveEquipo(a));
  });

  it('encuentra el equipo o devuelve null', () => {
    expect(buscarEquipo([a, b], claveEquipo(b))).toBe(b);
    expect(buscarEquipo([a, b], 'nada')).toBeNull();
    expect(buscarEquipo([a, b], null)).toBeNull();
  });
});

describe('agruparPorCategoria', () => {
  it('de menor a mayor edad, ignorando tildes, y lo desconocido al final', () => {
    const grupos = agruparPorCategoria([
      entrada('Juvenil', 'J'),
      entrada('Raras', 'R'),
      entrada('Benjamín', 'B'),
      entrada('Alevín', 'A'),
      entrada('Benjamín', 'B2'),
    ]);
    expect(grupos.map((g) => g.categoria)).toEqual([
      'Benjamín',
      'Alevín',
      'Juvenil',
      'Raras',
    ]);
    expect(grupos[0]?.equipos).toHaveLength(2);
  });
});
