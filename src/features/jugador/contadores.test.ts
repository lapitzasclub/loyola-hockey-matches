import { describe, expect, it } from 'vitest';

import type { ContadoresJugador, PartidoJugador } from '../../domain';
import { contadoresVisibles, seriesPartidos } from './contadores';

const vacios: ContadoresJugador = {
  goles: 0,
  asistencias: 0,
  faltasDirectasMarcadas: 0,
  faltasDirectasLanzadas: 0,
  penaltisMarcados: 0,
  penaltisLanzados: 0,
  amarillas: 0,
  rojas: 0,
  azules: 0,
  faltas: 0,
  minutosJugados: 0,
  segundosSancion: 0,
  golesEncajados: 0,
  paradas: 0,
  tirosRecibidos: 0,
  porcentajeParadas: 0,
};

const claves = (c: ContadoresJugador, portero: boolean) =>
  contadoresVisibles(c, portero).map((x) => x.clave);

describe('contadoresVisibles', () => {
  it('omite los contadores a cero', () => {
    expect(claves(vacios, false)).toEqual([]);
    expect(claves(vacios, true)).toEqual([]);
    expect(claves({ ...vacios, goles: 3, azules: 1 }, false)).toEqual([
      'goles',
      'azules',
    ]);
  });

  it('de un jugador de pista enseña lanzamientos como aciertos/intentos', () => {
    const c = {
      ...vacios,
      faltasDirectasMarcadas: 1,
      faltasDirectasLanzadas: 4,
      penaltisLanzados: 2,
    };
    expect(contadoresVisibles(c, false)).toEqual([
      { clave: 'faltasDirectas', valor: '1/4' },
      { clave: 'penaltis', valor: '0/2' },
    ]);
  });

  it('de un portero ignora lo de pista y da el porcentaje de paradas', () => {
    const c = {
      ...vacios,
      goles: 1,
      golesEncajados: 12,
      paradas: 36,
      tirosRecibidos: 48,
      porcentajeParadas: 75,
      minutosJugados: 450,
    };
    expect(contadoresVisibles(c, true)).toEqual([
      { clave: 'encajados', valor: '12' },
      { clave: 'paradas', valor: '36' },
      { clave: 'tiros', valor: '48' },
      { clave: 'porcentajeParadas', valor: '75.0%' },
      { clave: 'minutos', valor: '450' },
    ]);
  });

  it('no inventa un porcentaje sin tiros recibidos', () => {
    expect(
      claves({ ...vacios, minutosJugados: 20, porcentajeParadas: 0 }, true),
    ).toEqual(['minutos']);
  });
});

describe('seriesPartidos', () => {
  const partido = (goles: number, asistencias: number, paradas: number) =>
    ({
      stats: { ...vacios, goles, asistencias, paradas, golesEncajados: 2 },
    }) as PartidoJugador;
  const partidos = [partido(1, 0, 5), partido(2, 1, 7)];

  it('en pista, goles y asistencias por partido', () => {
    expect(seriesPartidos(partidos, false)).toEqual([
      { clave: 'goles', valores: [1, 2] },
      { clave: 'asistencias', valores: [0, 1] },
    ]);
  });

  it('bajo palos, paradas y goles encajados', () => {
    expect(seriesPartidos(partidos, true)).toEqual([
      { clave: 'paradas', valores: [5, 7] },
      { clave: 'encajados', valores: [2, 2] },
    ]);
  });
});
