import { describe, expect, it } from 'vitest';
import {
  ganaLoyola,
  ladoGanador,
  marcadorOficial,
  marcadorPorIncidencias,
  resultadoPartido,
} from '../../domain';
import type { Lanzamiento, PartidoDetalle } from '../../domain';
import { fixture, fixturePartido } from '../fixtures';
import { marcadoresSchema, partidoDetalleSchema } from '../schemas';
import type { PartidoDetalleApi } from '../schemas';
import {
  incidenciaDesdeApi,
  marcadoresDesdeApi,
  partidoDetalleDesdeApi,
} from '.';

function api(clave: string): PartidoDetalleApi {
  return partidoDetalleSchema.parse(fixturePartido(clave));
}

function detalle(clave: string): PartidoDetalle {
  return partidoDetalleDesdeApi(api(clave));
}

function resultado(clave: string) {
  const r = resultadoPartido(detalle(clave));
  if (!r) throw new Error(`${clave} no tiene resultado`);
  return r;
}

function lanzamientos(p: PartidoDetalle): Lanzamiento[] {
  return p.incidencias.filter(
    (i): i is Lanzamiento => i.tipo === 'PENALTI' || i.tipo === 'FALTADIRECTA',
  );
}

describe('estado del detalle', () => {
  it('el periodo 30 de las actas cerradas es finalizado', () => {
    expect(detalle('copa').estado).toBe('finalizado');
  });

  it('un partido sin empezar (periodo 0) no tiene marcador, ni 0-0', () => {
    const p = detalle('programado');
    expect(p.estado).toBe('programado');
    expect(p.incidencias).toEqual([]);
    expect(resultadoPartido(p)).toBeNull();
  });

  it('en vivo manda el periodo aunque el estado siga en SCHEDULED', () => {
    const d = api('descanso');
    const vivo = partidoDetalleDesdeApi({
      ...d,
      estado: 'SCHEDULED',
      actaEstado: 'PROGRAMADO',
      periodo: 2,
      local: { ...d.local, puntaje: null },
      visitante: { ...d.visitante, puntaje: null },
    });
    expect(vivo.estado).toBe('en_juego');
    // Sin puntaje, el oficial sale de las incidencias.
    expect(resultadoPartido(vivo)?.oficial).toEqual({ local: 2, visitante: 5 });
  });

  it('las incidencias del periodo 0 no dan el partido por empezado', () => {
    const d = api('periodo-0');
    expect(d.incidencias.some((i) => i.periodo === 0)).toBe(true);
    const previa = partidoDetalleDesdeApi({
      ...d,
      estado: 'SCHEDULED',
      actaEstado: 'PROGRAMADO',
      periodo: 0,
    });
    expect(previa.estado).toBe('programado');
  });
});

describe('ganador y victoria del Loyola', () => {
  it('gana el Loyola a domicilio por el resultado oficial', () => {
    const p = detalle('copa');
    expect(ladoGanador(p)).toBe('visitante');
    expect(ganaLoyola(p)).toBe(true);
  });

  it('una derrota o un partido sin el Loyola no cuentan', () => {
    expect(ganaLoyola(detalle('jugador-sin-dorsal'))).toBe(false);
    const ajeno = detalle('falta-directa');
    expect(ladoGanador(ajeno)).toBe('local');
    expect(ganaLoyola(ajeno)).toBe(false);
  });

  it('sin terminar no hay ganador aunque el Loyola vaya por delante', () => {
    expect(ladoGanador(detalle('programado'))).toBeNull();
    const c = api('copa');
    const vivo = partidoDetalleDesdeApi({
      ...c,
      estado: 'SCHEDULED',
      actaEstado: 'PROGRAMADO',
      periodo: 2,
      local: { ...c.local, puntaje: null },
      visitante: { ...c.visitante, puntaje: null },
    });
    expect(vivo.estado).toBe('en_juego');
    expect(ganaLoyola(vivo)).toBe(false);
  });

  it('en tablas gana quien se lleva el desempate, y si no, nadie', () => {
    expect(ladoGanador(detalle('penaltis-fallados'))).toBeNull();
    const d = api('penaltis-fallados');
    const desempate = partidoDetalleDesdeApi({
      ...d,
      visitante: {
        ...d.visitante,
        nombre: 'LOYOLA INDAUTXU',
        ganoDesempate: true,
      },
    });
    expect(ladoGanador(desempate)).toBe('visitante');
    expect(ganaLoyola(desempate)).toBe(true);
  });

  it('entre dos equipos del Loyola no se celebra', () => {
    const c = api('copa');
    const derbi = partidoDetalleDesdeApi({
      ...c,
      local: { ...c.local, nombre: 'LOYOLA INDAUTXU B' },
    });
    expect(ladoGanador(derbi)).toBe('visitante');
    expect(ganaLoyola(derbi)).toBe(false);
  });
});

describe('NO_GOL', () => {
  it('un penalti NO_GOL es un fallo, no un gol', () => {
    const p = detalle('penaltis-fallados');
    const penaltis = lanzamientos(p);
    expect(penaltis).toHaveLength(2);
    expect(penaltis.every((l) => l.resultado === 'fallo')).toBe(true);
    expect(resultado('penaltis-fallados').goles).toEqual({
      local: 1,
      visitante: 1,
    });
  });

  it('distingue GOL y NO_GOL en las faltas directas', () => {
    const resultados = lanzamientos(detalle('copa')).map(
      (l) => `${l.tipo}:${l.resultado}`,
    );
    expect(resultados.sort()).toEqual([
      'FALTADIRECTA:fallo',
      'FALTADIRECTA:gol',
      'PENALTI:fallo',
    ]);
  });

  it('cada lanzamiento convertido tiene su GOL del mismo lado y segundo', () => {
    for (const clave of ['copa', 'roja', 'escolar-por-periodos', 'periodo-0']) {
      const p = detalle(clave);
      for (const l of lanzamientos(p).filter((x) => x.resultado === 'gol')) {
        const gol = p.incidencias.find(
          (i) =>
            i.tipo === 'GOL' &&
            i.periodo === l.periodo &&
            i.minuto === l.minuto &&
            i.segundo === l.segundo,
        );
        expect(gol?.lado, `${clave} ${l.minuto}:${l.segundo}`).toBe(l.lado);
      }
    }
  });

  it('el portero del lanzamiento es del equipo que defiende', () => {
    const p = detalle('copa');
    for (const l of lanzamientos(p)) {
      const defensor = l.lado === 'local' ? p.visitante : p.local;
      const ids = defensor.alineacion.jugadores.map((j) => j.plantillaEquipoId);
      if (l.portero) expect(ids).toContain(l.portero.plantillaEquipoId);
    }
  });
});

describe('marcador en vivo y oficial', () => {
  it.each([
    ['escolar-capado', { local: 1, visitante: 9 }, { local: 1, visitante: 6 }],
    ['escolar-a-cero', { local: 12, visitante: 6 }, { local: 0, visitante: 0 }],
    [
      'escolar-por-periodos',
      { local: 6, visitante: 6 },
      { local: 3, visitante: 3 },
    ],
    [
      'jugador-sin-dorsal',
      { local: 1, visitante: 6 },
      { local: 1, visitante: 6 },
    ],
    [
      'puntaje-fuera-de-regla',
      { local: 10, visitante: 0 },
      { local: 10, visitante: 0 },
    ],
    ['copa', { local: 5, visitante: 6 }, { local: 5, visitante: 6 }],
  ])('%s: goles %o, oficial %o', (clave, goles, oficial) => {
    const r = resultado(clave);
    expect(r.goles).toEqual(goles);
    expect(r.oficial).toEqual(oficial);
  });

  it.each([
    'copa',
    'descanso',
    'escolar-a-cero',
    'escolar-capado',
    'escolar-por-periodos',
    'falta-directa',
    'jugador-sin-dorsal',
    'penaltis-fallados',
    'periodo-0',
    'roja',
  ])('%s: las reglas reproducen el puntaje del acta', (clave) => {
    const p = detalle(clave);
    const calculado = marcadorOficial(p.incidencias, p.periodo, p.reglas, null);
    expect(calculado).toEqual({
      local: p.local.puntaje,
      visitante: p.visitante.puntaje,
    });
  });

  it('un acta cerrada fuera de regla gana al cálculo', () => {
    const p = detalle('puntaje-fuera-de-regla');
    expect(marcadorOficial(p.incidencias, p.periodo, p.reglas, null)).toEqual({
      local: 5,
      visitante: 0,
    });
    expect(resultado('puntaje-fuera-de-regla').regla).toBeNull();
  });

  it('explica por qué el oficial no son los goles', () => {
    expect(resultado('escolar-capado').regla).toEqual({
      tipo: 'diferencia-maxima',
      max: 5,
    });
    expect(resultado('escolar-a-cero').regla).toEqual({ tipo: 'a-cero' });
    expect(resultado('escolar-por-periodos').regla).toMatchObject({
      tipo: 'por-periodos',
      parciales: [
        { local: 1, visitante: 3 },
        { local: 2, visitante: 2 },
        { local: 3, visitante: 1 },
      ],
    });
    expect(resultado('roja').regla).toBeNull();
  });

  it('toma numeroPeriodos de duracionPeriodos cuando la API manda 0', () => {
    expect(api('escolar-a-cero').numeroPeriodos).toBe(0);
    expect(detalle('escolar-a-cero').reglas.numeroPeriodos).toBe(3);
  });

  it('lee la tanda de penaltis de configuracionReglas', () => {
    expect(detalle('copa').reglas.desempatePenaltis).toBe(true);
    expect(detalle('roja').reglas.desempatePenaltis).toBe(false);
  });

  it('no hay tanda en partidos sin periodo 21', () => {
    expect(resultado('penaltis-fallados').tanda).toBeNull();
  });
});

describe('incidencias', () => {
  it('ordena el descanso (9) entre los dos periodos', () => {
    const periodos = detalle('descanso').incidencias.map((i) => i.periodo);
    const sinRepetir = periodos.filter((x, i) => x !== periodos[i - 1]);
    expect(sinRepetir).toEqual([1, 9, 2]);
  });

  it('dentro de un periodo el reloj va hacia atrás', () => {
    const primeras = detalle('roja').incidencias.filter((i) => i.periodo === 1);
    const segundos = primeras.map((i) => i.minuto * 60 + i.segundo);
    expect(segundos).toEqual([...segundos].sort((a, b) => b - a));
  });

  it('en un CAMBIO el principal entra y el secundario sale', () => {
    const d = api('descanso');
    const original = d.incidencias.find(
      (i) => i.tipo === 'CAMBIO' && i.plantillaEquipoSecundariaId,
    );
    const p = partidoDetalleDesdeApi(d);
    const cambio = p.incidencias.find((i) => i.id === original?.id);
    expect(cambio).toMatchObject({
      tipo: 'CAMBIO',
      entra: { plantillaEquipoId: original?.plantillaEquipoId },
      sale: { plantillaEquipoId: original?.plantillaEquipoSecundariaId },
    });
  });

  it('tarjetas con su sanción: azul 120 s, roja 240 s, amarilla sin tiempo', () => {
    const tarjetas = detalle('roja').incidencias.flatMap((i) =>
      i.tipo === 'TARJETAAZUL' ||
      i.tipo === 'TARJETAAMARILLA' ||
      i.tipo === 'TARJETAROJA'
        ? [[i.tipo, i.sancionSegundos]]
        : [],
    );
    expect(new Set(tarjetas.map((t) => t.join(':')))).toEqual(
      new Set(['TARJETAAZUL:120', 'TARJETAAMARILLA:', 'TARJETAROJA:240']),
    );
  });

  it('descarta tipos desconocidos y equipos ajenos', () => {
    const d = api('roja');
    const equipos = {
      local: d.local.equipoId,
      visitante: d.visitante.equipoId,
    };
    const [primera] = d.incidencias;
    if (!primera) throw new Error('roja sin incidencias');
    expect(
      incidenciaDesdeApi({ ...primera, tipo: 'AMONESTACIONVERBAL' }, equipos),
    ).toBeNull();
    expect(
      incidenciaDesdeApi(
        { ...primera, equipoId: '00000000-0000-0000-0000-000000000000' },
        equipos,
      ),
    ).toBeNull();
  });

  it('el gol cuenta para su lado y el marcador vivo es la suma de GOL', () => {
    const p = detalle('roja');
    expect(marcadorPorIncidencias(p.incidencias)).toEqual({
      local: 4,
      visitante: 6,
    });
  });
});

describe('alineaciones y staff sin dorsal', () => {
  it('el staff llega sin dorsal y con su rol, incluido ENTRENADOR2', () => {
    const p = detalle('penaltis-fallados');
    const staff = [
      ...p.local.alineacion.staff,
      ...p.visitante.alineacion.staff,
    ];
    expect(staff.map((s) => s.rol)).toContain('segundo-entrenador');
    expect(staff.every((s) => s.dorsal === null)).toBe(true);
  });

  it('rolPosicion vacío sin dorsal es staff', () => {
    const p = detalle('escolar-a-cero');
    const staff = [
      ...p.local.alineacion.staff,
      ...p.visitante.alineacion.staff,
    ];
    expect(staff.map((s) => s.rol)).toContain('staff');
    const jugadores = [
      ...p.local.alineacion.jugadores,
      ...p.visitante.alineacion.jugadores,
    ];
    expect(jugadores.some((j) => j.dorsal === null)).toBe(false);
  });

  it('un JUGADOR sin dorsal sigue en la lista de jugadores', () => {
    const p = detalle('jugador-sin-dorsal');
    const jugadores = [
      ...p.local.alineacion.jugadores,
      ...p.visitante.alineacion.jugadores,
    ];
    const sinDorsal = jugadores.filter((j) => j.dorsal === null);
    expect(sinDorsal.length).toBeGreaterThan(0);
    expect(sinDorsal.every((j) => j.rol === 'jugador')).toBe(true);
  });

  it('la amarilla al staff apunta a alguien sin dorsal del staff de su lado', () => {
    const p = detalle('falta-directa');
    const tarjeta = p.incidencias.find(
      (i) => i.tipo === 'TARJETAAMARILLA' && i.persona?.dorsal === null,
    );
    if (tarjeta?.tipo !== 'TARJETAAMARILLA')
      throw new Error('sin amarilla al staff');
    const lado = tarjeta.lado === 'local' ? p.local : p.visitante;
    expect(lado.alineacion.staff.map((s) => s.plantillaEquipoId)).toContain(
      tarjeta.persona?.plantillaEquipoId,
    );
  });

  it('respeta los dorsales con cero delante', () => {
    const dorsales = [
      ...detalle('copa').local.alineacion.jugadores,
      ...detalle('copa').visitante.alineacion.jugadores,
    ].map((j) => j.dorsal);
    expect(dorsales).toContain('09');
  });
});

describe('marcadores', () => {
  it('ignora los partidos sin empezar de /marcadores', () => {
    const m = marcadoresSchema.parse(fixture('marcadores.json'));
    expect(m.flatMap((c) => c.matches).length).toBeGreaterThan(0);
    expect(marcadoresDesdeApi(m)).toEqual([]);
  });

  it('aplica las reglas de la liga a un partido en juego', () => {
    const m = marcadoresSchema.parse(fixture('marcadores.json'));
    const [competicion] = m;
    const [partido] = competicion?.matches ?? [];
    if (!competicion || !partido) throw new Error('marcadores vacío');
    const [directo] = marcadoresDesdeApi([
      {
        ...competicion,
        matches: [
          {
            ...partido,
            periodo: 2,
            maxDiferenciaGoles: 5,
            puntuacionPorPeriodos: false,
            marcadorACero: false,
            local: { ...partido.local, goles: 9 },
            visitante: { ...partido.visitante, goles: 1 },
          },
        ],
      },
    ]);
    expect(directo).toMatchObject({
      estado: 'en_juego',
      goles: { local: 9, visitante: 1 },
      oficial: { local: 6, visitante: 1 },
    });
  });
});
