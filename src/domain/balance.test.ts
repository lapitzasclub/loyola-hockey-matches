import { describe, expect, it } from 'vitest';
import { balanceEquipo, equipoDeCalendario, faseDelEquipo } from './balance';
import type { Fase } from './competicion';
import { jugado, partido } from './test-utils';

describe('balanceEquipo', () => {
  const partidos = [
    jugado('p1', '2026-10-03', 'loy', 'a', [3, 0]),
    jugado('p2', '2026-10-10', 'b', 'loy', [2, 2]),
    jugado('p3', '2026-10-17', 'loy', 'c', [0, 1]),
    partido({ id: 'p4', fecha: '2026-10-24', estado: 'programado' }),
    jugado('p5', '2026-10-31', 'a', 'b', [5, 5]),
  ];

  it('suma resultados y goles de los partidos terminados del equipo', () => {
    const { total, local, visitante } = balanceEquipo(partidos, 'loy');
    expect(total).toEqual({ pj: 3, pg: 1, pe: 1, pp: 1, gf: 5, gc: 3 });
    expect(local).toEqual({ pj: 2, pg: 1, pe: 0, pp: 1, gf: 3, gc: 1 });
    expect(visitante).toEqual({ pj: 1, pg: 0, pe: 1, pp: 0, gf: 2, gc: 2 });
  });

  it('calcula promedios, porcentaje de victorias, ceros y racha', () => {
    const b = balanceEquipo(partidos, 'loy');
    expect(b.promedioFavor).toBeCloseTo(5 / 3);
    expect(b.promedioContra).toBe(1);
    expect(b.porcentajeVictorias).toBeCloseTo(100 / 3);
    expect(b.porteriasACero).toBe(1);
    expect(b.sinMarcar).toBe(1);
    expect(b.racha).toEqual(['victoria', 'empate', 'derrota']);
  });

  it('usa el resultado oficial y no los goles del acta', () => {
    const capado = {
      ...jugado('p', '2026-10-03', 'loy', 'a', [6, 0]),
      marcador: { local: 19, visitante: 1 },
    };
    const { total } = balanceEquipo([capado], 'loy');
    expect([total.gf, total.gc]).toEqual([6, 0]);
  });

  it('sin partidos jugados no divide por cero', () => {
    const b = balanceEquipo([], 'loy');
    expect(b.promedioFavor).toBe(0);
    expect(b.porcentajeVictorias).toBe(0);
    expect(b.racha).toEqual([]);
  });

  it('ordena por fecha aunque lleguen desordenados', () => {
    const b = balanceEquipo([...partidos].reverse(), 'loy');
    expect(b.racha).toEqual(['victoria', 'empate', 'derrota']);
  });
});

describe('equipoDeCalendario', () => {
  it('devuelve el equipo con su inscripción, sea local o visitante', () => {
    const ps = [jugado('p', '2026-10-03', 'a', 'b', [1, 0])];
    expect(equipoDeCalendario(ps, 'b')?.nombre).toBe('b');
    expect(equipoDeCalendario(ps, 'z')).toBeNull();
  });
});

describe('faseDelEquipo', () => {
  const fase = (id: string, formato: Fase['formato'], orden: number): Fase => ({
    id,
    nombre: id,
    orden,
    formato,
    grupos: [],
    leyendas: [],
  });
  const fases = [
    fase('regular', 'liga', 1),
    fase('copa', 'eliminatoria', 2),
    fase('playoff', 'liga', 3),
  ];
  const enFase = (id: string, fecha: string, faseId: string) => ({
    ...jugado(id, fecha, 'loy', 'rival', [1, 0]),
    faseId,
  });

  it('elige la fase de liga del próximo partido', () => {
    const ps = [
      enFase('p1', '2026-10-03', 'regular'),
      enFase('p2', '2026-12-05', 'playoff'),
    ];
    expect(faseDelEquipo(fases, ps, 'loy', '2026-11-01')?.id).toBe('playoff');
    expect(faseDelEquipo(fases, ps, 'loy', '2026-10-01')?.id).toBe('regular');
  });

  it('ignora las fases de eliminatoria', () => {
    const ps = [enFase('p1', '2026-12-05', 'copa')];
    expect(faseDelEquipo(fases, ps, 'loy', '2026-11-01')?.id).toBe('regular');
  });

  it('sin fases, null', () => {
    expect(faseDelEquipo([], [], 'loy', '2026-11-01')).toBeNull();
  });
});
