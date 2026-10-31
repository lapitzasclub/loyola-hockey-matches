import { describe, expect, it } from 'vitest';

import {
  agruparPorMes,
  estadoVisible,
  fechaLocal,
  indiceProximoPartido,
  partidoVisible,
  partidosDeEquipo,
  partidosDeJornada,
} from './calendario';
import type { MarcadorDirecto } from './marcador';
import { equipo, partido } from './test-utils';

const HOY = '2026-10-30';

describe('fechaLocal', () => {
  it('usa la fecha local, no la UTC', () => {
    expect(fechaLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('estadoVisible', () => {
  it('un programado pasado hace poco está pendiente de resultado', () => {
    expect(
      estadoVisible({ estado: 'programado', fecha: '2026-10-29' }, HOY),
    ).toBe('pendiente');
    expect(
      estadoVisible({ estado: 'programado', fecha: '2026-10-27' }, HOY),
    ).toBe('pendiente');
  });

  it('pasado el margen sin resultado se da por aplazado', () => {
    expect(
      estadoVisible({ estado: 'programado', fecha: '2026-10-26' }, HOY),
    ).toBe('aplazado');
  });

  it('un programado de hoy o futuro sigue programado', () => {
    expect(estadoVisible({ estado: 'programado', fecha: HOY }, HOY)).toBe(
      'programado',
    );
  });

  it('un finalizado pasado no es aplazado', () => {
    expect(
      estadoVisible({ estado: 'finalizado', fecha: '2026-10-01' }, HOY),
    ).toBe('finalizado');
  });
});

describe('partidosDeEquipo', () => {
  const loyola = equipo('LOYOLA', { equipoId: 'E1' });
  const otro = equipo('OTRO', { equipoId: 'E2' });
  const partidos = [
    partido({ id: 'b', fecha: '2026-11-02', local: otro, visitante: loyola }),
    partido({
      id: 'a',
      fecha: '2026-10-05',
      hora: '10:00',
      local: loyola,
      visitante: otro,
    }),
    partido({
      id: 'x',
      fecha: '2026-10-06',
      local: otro,
      visitante: equipo('Z'),
    }),
    partido({
      id: 'c',
      fecha: '2026-10-05',
      hora: '09:00',
      local: otro,
      visitante: loyola,
    }),
  ];

  it('filtra por equipo y ordena por fecha y hora', () => {
    expect(partidosDeEquipo(partidos, loyola).map((p) => p.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('casa por nombre si los ids no coinciden', () => {
    const porNombre = equipo('Loyola', { inscripcionId: 'I9' });
    expect(partidosDeEquipo(partidos, porNombre)).toHaveLength(3);
  });
});

describe('indiceProximoPartido', () => {
  it('es -1 sin partidos', () => {
    expect(indiceProximoPartido([], HOY)).toBe(-1);
  });

  it('elige el primero de hoy en adelante', () => {
    const ps = [
      partido({ fecha: '2026-10-20', estado: 'finalizado' }),
      partido({ fecha: '2026-10-30' }),
      partido({ fecha: '2026-11-06' }),
    ];
    expect(indiceProximoPartido(ps, HOY)).toBe(1);
  });

  it('un aplazado pasado no le roba el sitio a un partido futuro', () => {
    const ps = [
      partido({ fecha: '2026-10-10', estado: 'programado' }),
      partido({ fecha: '2026-11-06' }),
    ];
    expect(indiceProximoPartido(ps, HOY)).toBe(1);
  });

  it('sin futuro, el último pendiente; si no, el último', () => {
    const aplazado = [
      partido({ fecha: '2026-10-01', estado: 'finalizado' }),
      partido({ fecha: '2026-10-10', estado: 'programado' }),
      partido({ fecha: '2026-10-20', estado: 'finalizado' }),
    ];
    expect(indiceProximoPartido(aplazado, HOY)).toBe(1);
    const todos = aplazado.map((p) => ({
      ...p,
      estado: 'finalizado' as const,
    }));
    expect(indiceProximoPartido(todos, HOY)).toBe(2);
  });
});

describe('agruparPorMes', () => {
  it('agrupa por mes conservando el orden', () => {
    const grupos = agruparPorMes([
      partido({ id: '1', fecha: '2026-10-03' }),
      partido({ id: '2', fecha: '2026-10-31' }),
      partido({ id: '3', fecha: '2026-11-01' }),
    ]);
    expect(grupos.map((g) => [g.mes, g.partidos.map((p) => p.id)])).toEqual([
      ['2026-10', ['1', '2']],
      ['2026-11', ['3']],
    ]);
  });
});

describe('partidoVisible', () => {
  const directo = (extra: Partial<MarcadorDirecto> = {}): MarcadorDirecto => ({
    partidoId: 'p',
    competicionId: 'c',
    estado: 'en_juego',
    periodo: 2,
    goles: { local: 3, visitante: 1 },
    oficial: null,
    ganadorDesempate: null,
    ...extra,
  });

  it('el marcador en directo manda sobre un calendario aún programado', () => {
    const v = partidoVisible(partido({ fecha: HOY }), HOY, directo());
    expect(v.estado).toBe('en_juego');
    expect(v.marcador).toEqual({ local: 3, visitante: 1 });
  });

  it('un jugado sin acta en el árbol sale finalizado si /marcadores lo da por terminado', () => {
    const v = partidoVisible(
      partido({ fecha: '2026-10-25' }),
      HOY,
      directo({ estado: 'finalizado', goles: { local: 2, visitante: 2 } }),
    );
    expect(v.estado).toBe('finalizado');
    expect(v.marcador).toEqual({ local: 2, visitante: 2 });
  });

  it('un directo que sigue programado no cambia nada', () => {
    const v = partidoVisible(
      partido({ fecha: '2026-10-29' }),
      HOY,
      directo({ estado: 'programado', goles: { local: 0, visitante: 0 } }),
    );
    expect(v.estado).toBe('pendiente');
    expect(v.marcador).toBeNull();
  });

  it('un finalizado no vuelve a en juego por un directo atrasado', () => {
    const v = partidoVisible(
      partido({ estado: 'finalizado', marcador: { local: 4, visitante: 1 } }),
      HOY,
      directo(),
    );
    expect(v.estado).toBe('finalizado');
    expect(v.marcador).toEqual({ local: 4, visitante: 1 });
  });

  it('el oficial solo aparece si difiere de los goles', () => {
    const base = {
      estado: 'finalizado' as const,
      marcador: { local: 19, visitante: 1 },
    };
    expect(
      partidoVisible(
        partido({ ...base, marcadorOficial: { local: 6, visitante: 0 } }),
        HOY,
      ).oficial,
    ).toEqual({ local: 6, visitante: 0 });
    expect(
      partidoVisible(
        partido({ ...base, marcadorOficial: { local: 19, visitante: 1 } }),
        HOY,
      ).oficial,
    ).toBeNull();
  });
});

describe('partidosDeJornada', () => {
  const j9 = (id: string, extra = {}) =>
    partido({ id, jornada: 'JORNADA 9', faseId: 'f1', ...extra });

  it('reúne los de la misma jornada y fase, por fecha y hora', () => {
    const tarde = j9('tarde', { fecha: '2026-12-19', hora: '17:00' });
    const manana = j9('manana', { fecha: '2026-12-19', hora: '10:00' });
    const aplazado = j9('aplazado', { fecha: '2027-01-09', hora: '10:00' });
    const otraJornada = j9('otra', { jornada: 'JORNADA 10' });
    const otraFase = j9('fase', { faseId: 'f2' });
    expect(
      partidosDeJornada(
        [aplazado, otraJornada, tarde, otraFase, manana],
        tarde,
      ).map((p) => p.id),
    ).toEqual(['manana', 'tarde', 'aplazado']);
  });

  it('un partido sin jornada no tiene con quién agruparse', () => {
    const suelto = partido({ jornada: null });
    expect(partidosDeJornada([suelto], suelto)).toEqual([]);
  });
});
