import { describe, expect, it } from 'vitest';

import type { CalendarioDeDivision } from './equipoJugador';
import { equipoDelJugador, ladoComun } from './equipoJugador';
import type { CompeticionJugador, PartidoJugador } from './jugador';
import type { PartidoResumen } from './partido';

const partido = (local: string, visitante: string): PartidoJugador =>
  ({
    partidoId: `${local}-${visitante}`,
    fecha: '2026-10-10',
    local: { nombreAbrev: local, logoUrl: `${local}.webp` },
    visitante: { nombreAbrev: visitante, logoUrl: `${visitante}.webp` },
    marcadorOficial: null,
  }) as PartidoJugador;

const competicion = (
  competicionId: string,
  partidos: PartidoJugador[],
): CompeticionJugador =>
  ({
    competicionId,
    nombre: competicionId,
    partidosJugados: partidos.length,
    partidos,
  }) as CompeticionJugador;

const equipo = (divisionId: string, abrev: string) => ({
  inscripcionId: `ins-${divisionId}-${abrev}`,
  nombre: `${abrev} NOMBRE`,
  nombreAbrev: abrev,
});

/** Calendario con un partido entre cada par de equipos consecutivos. */
const calendario = (
  divisionId: string,
  abrevs: string[],
): CalendarioDeDivision => ({
  division: { id: divisionId, competicionId: 'liga' },
  partidos: abrevs.slice(1).map((a, i) => ({
    local: equipo(divisionId, abrevs[i] ?? ''),
    visitante: equipo(divisionId, a),
  })) as unknown as PartidoResumen[],
});

describe('ladoComun', () => {
  it('es el lado que se repite en todos los partidos', () => {
    expect(
      ladoComun([partido('URD', 'BGO'), partido('BGO', 'MUN')])?.nombreAbrev,
    ).toBe('BGO');
  });

  it('con un solo partido no se sabe', () => {
    expect(ladoComun([partido('URD', 'BGO')])).toBeNull();
    expect(ladoComun([])).toBeNull();
  });

  it('un derbi entre dos equipos del club no confunde', () => {
    expect(
      ladoComun([partido('LOY B', 'LOY A'), partido('URD', 'LOY B')])
        ?.nombreAbrev,
    ).toBe('LOY B');
  });
});

describe('equipoDelJugador', () => {
  const ficha = {
    competiciones: [
      competicion('liga', [partido('URD', 'BGO'), partido('BGO', 'MUN')]),
    ],
  };

  it('enlaza al equipo que encuentra en el calendario', () => {
    expect(equipoDelJugador(ficha, [calendario('d1', ['URD', 'BGO'])])).toEqual(
      {
        nombre: 'BGO NOMBRE',
        nombreAbrev: 'BGO',
        logoUrl: 'BGO.webp',
        enlace: {
          competicionId: 'liga',
          divisionId: 'd1',
          inscripcionId: 'ins-d1-BGO',
        },
      },
    );
  });

  it('con la abreviatura en dos divisiones elige la de sus rivales', () => {
    const elegido = equipoDelJugador(ficha, [
      calendario('d1', ['BGO', 'GTK']),
      calendario('d2', ['URD', 'BGO', 'MUN']),
    ]);
    expect(elegido?.enlace?.divisionId).toBe('d2');
  });

  it('sin calendarios enseña la abreviatura sin enlace', () => {
    expect(equipoDelJugador(ficha, [])).toEqual({
      nombre: 'BGO',
      nombreAbrev: 'BGO',
      logoUrl: 'BGO.webp',
      enlace: null,
    });
  });
});
