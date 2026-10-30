import { describe, expect, it } from 'vitest';
import { rankingGoleadores } from '../../domain';
import { fixturesJugadores } from '../fixtures';
import {
  estadisticasJugadoresSchema,
  plantillaSchema,
  statsJugadorSchema,
} from '../schemas';
import {
  fichaJugadorDesdeApi,
  jugadorDivisionDesdeApi,
  plantillaDesdeApi,
} from '.';

describe('mappers de jugador sobre las fixtures', () => {
  const f = fixturesJugadores();

  it('ranking de goleadores de la división', () => {
    const { jugadores } = estadisticasJugadoresSchema.parse(f.estadisticas);
    const ranking = rankingGoleadores(jugadores.map(jugadorDivisionDesdeApi));
    expect(ranking.length).toBeGreaterThan(0);
    expect(ranking.every((r) => r.jugador.goles > 0)).toBe(true);
    const [primero, segundo] = ranking;
    expect(primero?.puesto).toBe(1);
    if (primero && segundo && primero.jugador.goles === segundo.jugador.goles) {
      expect(segundo.puesto).toBe(1);
    }
  });

  it('plantilla: el cuerpo técnico con su rol, aparte de los jugadores', () => {
    const plantilla = plantillaDesdeApi(plantillaSchema.parse(f.plantilla));
    expect(plantilla.equipoId).toBe(f.equipoId);
    expect(plantilla.staff.map((s) => s.rol)).toContain('entrenador');
    expect(plantilla.jugadores.every((j) => j.rol === null)).toBe(true);
  });

  it('ficha: partidos en orden cronológico y portero reconocido', () => {
    const goleador = fichaJugadorDesdeApi(
      statsJugadorSchema.parse(f.stats(f.goleadorId)),
    );
    const portero = fichaJugadorDesdeApi(
      statsJugadorSchema.parse(f.stats(f.porteroId)),
    );
    expect(goleador.rol).toBe('jugador');
    expect(portero.rol).toBe('portero');
    expect(portero.esPortero).toBe(true);
    for (const c of goleador.competiciones) {
      const fechas = c.partidos.map((p) => p.fecha);
      expect(fechas).toEqual([...fechas].sort());
    }
    expect(goleador.total.goles).toBe(
      goleador.competiciones.reduce((s, c) => s + c.total.goles, 0),
    );
  });
});
