import { describe, expect, it } from 'vitest';
import { crearAlineacion } from './alineacion';
import type { MiembroAlineacion } from './alineacion';
import {
  cronologia,
  indiceAlineacion,
  iniciales,
  personaVisible,
  totalesPartido,
} from './cronologia';
import type { Incidencia } from './incidencia';
import { gol, penalti } from './test-utils';

const base = {
  id: 'x',
  lado: 'local',
  periodo: 1,
  minuto: 10,
  segundo: 0,
  registro: '2026-10-03T18:00:00',
} as const;

function miembro(
  id: string,
  extra: Partial<MiembroAlineacion> = {},
): MiembroAlineacion {
  return {
    plantillaEquipoId: id,
    nombre: `NOMBRE ${id}`,
    nombrePila: id,
    dorsal: '7',
    rol: 'jugador',
    titular: false,
    capitan: false,
    fotoUrl: null,
    ...extra,
  };
}

describe('cronologia', () => {
  it('agrupa por periodo en orden cronológico con el marcador en cada gol', () => {
    const grupos = cronologia([
      gol('visitante', 2, { minuto: 20 }),
      gol('local', 1, { minuto: 15 }),
      gol('local', 1, { minuto: 5 }),
    ]);
    expect(grupos.map((g) => g.periodo)).toEqual([1, 2]);
    expect(grupos[0]?.filas.map((f) => f.marcador)).toEqual([
      { local: 1, visitante: 0 },
      { local: 2, visitante: 0 },
    ]);
    expect(grupos[1]?.filas[0]?.marcador).toEqual({ local: 2, visitante: 1 });
  });

  it('deja fuera paradas, la tanda y los lanzamientos convertidos (duplican el gol)', () => {
    const parada: Incidencia = { ...base, tipo: 'PARADA', portero: null };
    const grupos = cronologia([
      parada,
      gol('local', 1, { via: 'penalti' }),
      penalti('visitante', 'gol', { periodo: 1 }),
      penalti('visitante', 'fallo', { periodo: 1 }),
      penalti('local', 'gol'),
    ]);
    const tipos = grupos.flatMap((g) => g.filas.map((f) => f.incidencia.tipo));
    expect(tipos).toEqual(['GOL', 'PENALTI']);
    expect(grupos).toHaveLength(1);
  });

  it('la tanda no suma al marcador acumulado', () => {
    const grupos = cronologia([
      gol('local', 1),
      gol('local', 21),
      gol('visitante', 2),
    ]);
    expect(grupos.at(-1)?.filas[0]?.marcador).toEqual({
      local: 1,
      visitante: 1,
    });
  });

  it('coloca el descanso entre el primer y el segundo periodo', () => {
    const cambio: Incidencia = {
      ...base,
      tipo: 'CAMBIO',
      periodo: 9,
      entra: null,
      sale: null,
    };
    const grupos = cronologia([gol('local', 2), cambio, gol('local', 1)]);
    expect(grupos.map((g) => g.periodo)).toEqual([1, 9, 2]);
  });
});

describe('totalesPartido', () => {
  it('cuenta por lado faltas, tarjetas, tiempos muertos y goles de juego', () => {
    const incidencias: Incidencia[] = [
      gol('local', 1),
      gol('local', 21),
      { ...base, tipo: 'FALTA', jugador: null },
      { ...base, tipo: 'FALTA-HL', jugador: null },
      { ...base, lado: 'visitante', tipo: 'TM' },
      {
        ...base,
        lado: 'visitante',
        tipo: 'TARJETAAZUL',
        persona: null,
        sancionSegundos: 120,
      },
      {
        ...base,
        tipo: 'TARJETAROJA',
        persona: null,
        sancionSegundos: 240,
      },
      {
        ...base,
        tipo: 'TARJETAAMARILLA',
        persona: null,
        sancionSegundos: null,
      },
    ];
    const t = totalesPartido(incidencias);
    expect(t.local).toEqual({
      goles: 1,
      faltas: 2,
      azules: 0,
      amarillas: 1,
      rojas: 1,
      tiemposMuertos: 0,
    });
    expect(t.visitante).toMatchObject({ azules: 1, tiemposMuertos: 1 });
  });
});

describe('personaVisible', () => {
  const indice = indiceAlineacion({
    local: {
      alineacion: crearAlineacion([
        miembro('ana', { nombre: 'ANA', dorsal: '9' }),
        miembro('seb', { rol: 'entrenador', dorsal: null, nombre: 'SEB' }),
      ]),
    },
    visitante: { alineacion: crearAlineacion([]) },
  } as Parameters<typeof indiceAlineacion>[0]);

  it('completa dorsal y nombre con la alineación', () => {
    expect(
      personaVisible(
        { plantillaEquipoId: 'ana', dorsal: null, nombre: null },
        indice,
      ),
    ).toEqual({
      plantillaEquipoId: 'ana',
      dorsal: '9',
      nombre: 'ANA',
      conFicha: true,
    });
  });

  it('el cuerpo técnico no tiene ficha', () => {
    expect(
      personaVisible(
        { plantillaEquipoId: 'seb', dorsal: null, nombre: 'SEB' },
        indice,
      )?.conFicha,
    ).toBe(false);
  });

  it('sin alineación, el dorsal decide si es jugador', () => {
    const sinDorsal = { plantillaEquipoId: 'z', dorsal: null, nombre: 'Z' };
    expect(personaVisible(sinDorsal, indice)?.conFicha).toBe(false);
    expect(
      personaVisible({ ...sinDorsal, dorsal: '3' }, indice)?.conFicha,
    ).toBe(true);
  });

  it('null si no se sabe quién es', () => {
    expect(personaVisible(null, indice)).toBeNull();
    expect(
      personaVisible(
        { plantillaEquipoId: 'nadie', dorsal: '3', nombre: null },
        indice,
      ),
    ).toBeNull();
  });
});

describe('iniciales', () => {
  it.each([
    ['GARCÍA LÓPEZ, ANA', 'GL'],
    ['Ana', 'A'],
    ['  ', ''],
    ['PERSONA 150', 'P1'],
  ])('%s → %s', (nombre, esperado) => {
    expect(iniciales(nombre)).toBe(esperado);
  });
});
