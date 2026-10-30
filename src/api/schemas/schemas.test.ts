import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  fixture,
  fixturePartido,
  fixturesDivision,
  fixturesJugadores,
  muestra,
  partidosMuestra,
} from '../fixtures';
import {
  agendaSchema,
  arbolSchema,
  clasificacionSchema,
  divisionesSchema,
  equiposDivisionSchema,
  estadisticasJugadoresSchema,
  eventoAgendaSchema,
  fasesSchema,
  filaClasificacionSchema,
  jsonString,
  marcadoresSchema,
  partidoDetalleSchema,
  plantillaSchema,
  statsJugadorSchema,
} from '.';

function esperarValido<T extends z.ZodType>(esquema: T, datos: unknown) {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new Error(z.prettifyError(r.error));
  return r.data;
}

describe('esquemas sobre las fixtures reales', () => {
  it('validan la agenda y las divisiones en batch', () => {
    const agenda = esperarValido(agendaSchema, fixture('agenda.json'));
    expect(agenda.eventos.length).toBeGreaterThan(0);
    const divisiones = esperarValido(
      divisionesSchema,
      fixture('divisiones.json'),
    );
    expect(divisiones).toHaveLength(muestra().length);
  });

  it.each(muestra().map((m) => m.slug))(
    'validan fases, equipos, árbol y clasificación de %s',
    (slug) => {
      const f = fixturesDivision(slug);
      expect(esperarValido(fasesSchema, f.fases).length).toBeGreaterThan(0);
      esperarValido(equiposDivisionSchema, f.equipos);
      expect(esperarValido(arbolSchema, f.tree).length).toBeGreaterThan(0);
      for (const filas of f.clasificaciones.values()) {
        esperarValido(clasificacionSchema, filas);
      }
    },
  );
});

describe('esquemas de partido y jugador sobre las fixtures reales', () => {
  it.each(partidosMuestra().map((p) => p.clave))(
    'validan el detalle del partido %s',
    (clave) => {
      const d = esperarValido(partidoDetalleSchema, fixturePartido(clave));
      expect(d.id).toBe(partidosMuestra().find((p) => p.clave === clave)?.id);
    },
  );

  it('parsea configuracionReglas del partido', () => {
    const copa = esperarValido(partidoDetalleSchema, fixturePartido('copa'));
    expect(copa.configuracionReglas.penaltis).toBe(true);
    const liga = esperarValido(partidoDetalleSchema, fixturePartido('roja'));
    expect(liga.configuracionReglas.penaltis).toBe(false);
  });

  it('validan los marcadores', () => {
    const m = esperarValido(marcadoresSchema, fixture('marcadores.json'));
    expect(m.flatMap((c) => c.matches).length).toBeGreaterThan(0);
  });

  it('validan estadísticas, plantilla y stats de jugador', () => {
    const f = fixturesJugadores();
    const est = esperarValido(estadisticasJugadoresSchema, f.estadisticas);
    expect(est.jugadores.length).toBeGreaterThan(0);
    const plantilla = esperarValido(plantillaSchema, f.plantilla);
    expect(plantilla.equipoId).toBe(f.equipoId);
    expect(plantilla.cuerpoTecnico.length).toBeGreaterThan(0);
    for (const id of [f.goleadorId, f.porteroId]) {
      const stats = esperarValido(statsJugadorSchema, f.stats(id));
      expect(stats.plantillaEquipoId).toBe(id);
    }
  });
});

describe('campos string JSON', () => {
  const esquema = jsonString(z.object({ form: z.array(z.string()) }));

  it('parsea datosAdicionales tal como llega de la API', () => {
    const fila = esperarValido(
      clasificacionSchema,
      fixturesDivision('liga-norte').clasificaciones.values().next().value,
    )[0];
    expect(Array.isArray(fila?.datosAdicionales.form)).toBe(true);
    expect(esquema.parse('{"form": ["W", "D"]}')).toEqual({
      form: ['W', 'D'],
    });
  });

  it('trata el string vacío como objeto vacío', () => {
    expect(jsonString(z.object({})).parse('')).toEqual({});
  });

  it('rechaza JSON roto y contenido que no encaja', () => {
    expect(esquema.safeParse('{"form": [').success).toBe(false);
    expect(esquema.safeParse('{"form": "W"}').success).toBe(false);
  });

  it('rechaza una racha con letras desconocidas', () => {
    const fila = primeraFila();
    const mala = { ...fila, datosAdicionales: '{"form": ["V"]}' };
    expect(filaClasificacionSchema.safeParse(mala).success).toBe(false);
  });
});

describe('tolerancia y rigor', () => {
  const evento = () => {
    const agenda = fixture('agenda.json') as { eventos: unknown[] };
    return { ...(agenda.eventos[0] as Record<string, unknown>) };
  };

  it('ignora campos que no usamos', () => {
    const r = eventoAgendaSchema.parse({ ...evento(), campoNuevo: 42 });
    expect(r).not.toHaveProperty('campoNuevo');
    expect(r).not.toHaveProperty('duracionMinutos');
  });

  it('falla si falta o cambia de tipo un campo que usamos', () => {
    const sinFecha = evento();
    delete sinFecha.fecha;
    expect(eventoAgendaSchema.safeParse(sinFecha).success).toBe(false);
    expect(
      eventoAgendaSchema.safeParse({ ...evento(), hora: '19:30:00' }).success,
    ).toBe(false);
    expect(
      eventoAgendaSchema.safeParse({ ...evento(), competicionId: 7 }).success,
    ).toBe(false);
  });

  it('acepta el puntaje como float (3.00)', () => {
    const fila = JSON.parse('{"pts": 3.00, "ajustePuntos": 0.0}') as object;
    const r = filaClasificacionSchema.parse({ ...primeraFila(), ...fila });
    expect(r.pts).toBe(3);
  });
});

function primeraFila(): Record<string, unknown> {
  const filas = fixturesDivision('liga-norte').clasificaciones.values().next()
    .value as Record<string, unknown>[];
  const fila = filas[0];
  if (!fila) throw new Error('Clasificación vacía en la fixture');
  return fila;
}
