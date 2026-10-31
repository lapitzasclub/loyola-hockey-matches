import { describe, expect, it } from 'vitest';
import {
  agruparClasificacion,
  calcularRacha,
  compararPorFechaHora,
  construirCatalogoLoyola,
} from '../../domain';
import { fixture, fixturesDivision, muestra } from '../fixtures';
import {
  agendaSchema,
  arbolSchema,
  clasificacionSchema,
  divisionesSchema,
  equiposDivisionSchema,
  fasesSchema,
} from '../schemas';
import {
  competicionesDeAgenda,
  divisionDesdeApi,
  faseDesdeApi,
  filaDesdeApi,
  fuentesDivision,
  partidoDesdeAgenda,
  partidosDeArbol,
} from '.';

const agenda = agendaSchema.parse(fixture('agenda.json'));
const divisiones = divisionesSchema.parse(fixture('divisiones.json'));
const slugs = muestra().map((m) => m.slug);

function cargar(slug: string) {
  const entrada = muestra().find((m) => m.slug === slug);
  if (!entrada) throw new Error(`No hay fixtures para ${slug}`);
  const f = fixturesDivision(slug);
  const arbol = arbolSchema.parse(f.tree);
  const filas = [...f.clasificaciones.values()].flatMap((datos) =>
    clasificacionSchema.parse(datos),
  );
  return {
    entrada,
    arbol,
    fases: fasesSchema.parse(f.fases).map(faseDesdeApi),
    equipos: equiposDivisionSchema.parse(f.equipos),
    filasApi: filas,
    filas: filas.map(filaDesdeApi),
    partidos: partidosDeArbol(arbol, entrada.competicionId),
  };
}

const divisionesMuestra = new Map(slugs.map((s) => [s, cargar(s)]));

function division(slug: string) {
  const d = divisionesMuestra.get(slug);
  if (!d) throw new Error(`No hay fixtures para ${slug}`);
  return d;
}

describe('estados', () => {
  // Si una captura nueva trae otro valor, hay que revisar normalizarEstado.
  const CONOCIDOS = ['PROGRAMADO', 'SCHEDULED', 'FINISHED'];

  it('la API solo usa los estados conocidos', () => {
    for (const e of agenda.eventos) expect(CONOCIDOS).toContain(e.estado);
    for (const { arbol } of divisionesMuestra.values()) {
      for (const fase of arbol) {
        for (const j of fase.jornadas) {
          for (const enf of j.enfrentamientos) {
            expect(CONOCIDOS).toContain(enf.estado);
          }
        }
      }
    }
  });

  it('FINISHED va siempre con el acta en el periodo 30', () => {
    for (const { arbol } of divisionesMuestra.values()) {
      const enfs = arbol.flatMap((f) =>
        f.jornadas.flatMap((j) => j.enfrentamientos),
      );
      for (const enf of enfs) {
        expect(enf.estado === 'FINISHED').toBe(enf.actaPeriodo === 30);
      }
    }
  });

  it('los dos vocabularios se normalizan igual', () => {
    const { partidos } = division('liga-norte');
    const estados = new Set(partidos.map((p) => p.estado));
    expect(estados).toEqual(new Set(['programado', 'finalizado']));
    const copa = division('copa-liga-norte').partidos;
    expect(copa.some((p) => p.estado === 'programado')).toBe(true);
    expect(
      agenda.eventos.map(partidoDesdeAgenda).every((p) => {
        return p.estado === 'programado';
      }),
    ).toBe(true);
  });
});

describe('agenda y árbol', () => {
  it('describen igual el mismo partido', () => {
    let comparados = 0;
    for (const evento of agenda.eventos) {
      const desdeAgenda = partidoDesdeAgenda(evento);
      const enArbol = [...divisionesMuestra.values()]
        .flatMap((d) => d.partidos)
        .find((p) => p.id === evento.id);
      expect(enArbol, `partido ${evento.id}`).toBeDefined();
      expect(enArbol).toMatchObject({
        competicionId: desdeAgenda.competicionId,
        fecha: desdeAgenda.fecha,
        hora: desdeAgenda.hora,
        estado: desdeAgenda.estado,
        jornada: desdeAgenda.jornada,
        marcadorOficial: desdeAgenda.marcadorOficial,
        pista: desdeAgenda.pista,
        coordenadas: desdeAgenda.coordenadas,
        local: { nombre: desdeAgenda.local?.nombre },
        visitante: { nombre: desdeAgenda.visitante?.nombre },
      });
      comparados++;
    }
    expect(comparados).toBeGreaterThan(0);
  });

  it('la pista con coordenadas llega al dominio desde la agenda y el árbol', () => {
    const conMapa = [...divisionesMuestra.values()]
      .flatMap((d) => d.partidos)
      .filter((p) => p.coordenadas !== null);
    expect(conMapa.length).toBeGreaterThan(0);
    for (const p of conMapa) {
      expect(p.pista, `partido ${p.id}`).not.toBeNull();
      expect(Math.abs(p.coordenadas?.latitud ?? 0)).toBeGreaterThan(0);
    }
  });

  it('la agenda solo da el resultado oficial, no los goles del acta', () => {
    for (const evento of agenda.eventos) {
      expect(partidoDesdeAgenda(evento).marcador).toBeNull();
    }
  });

  it('descubre las competiciones de la muestra', () => {
    const ids = competicionesDeAgenda(agenda).map((c) => c.id);
    expect(new Set(ids)).toEqual(
      new Set(muestra().map((m) => m.competicionId)),
    );
  });
});

describe('orden del calendario', () => {
  it.each(slugs)('%s sale ordenado por fecha y hora', (slug) => {
    const { partidos } = division(slug);
    for (let i = 1; i < partidos.length; i++) {
      const [a, b] = [partidos[i - 1], partidos[i]];
      if (a && b) expect(compararPorFechaHora(a, b)).toBeLessThan(0);
    }
  });

  it('el orden de jornada no es cronológico (aplazados)', () => {
    const { arbol } = division('liga-norte');
    const enfs = arbol.flatMap((f) =>
      f.jornadas.flatMap((j) =>
        j.enfrentamientos.map((e) => ({
          orden: j.orden,
          fecha: e.fechaInicio.slice(0, 10),
        })),
      ),
    );
    const invertidos = enfs.filter((a) =>
      enfs.some((b) => a.orden < b.orden && a.fecha > b.fecha),
    );
    expect(invertidos.length).toBeGreaterThan(0);
  });

  it('los partidos sin hora van al final de su día', () => {
    const todos = [...divisionesMuestra.values()].flatMap((d) => d.partidos);
    expect(todos.some((p) => p.hora === null)).toBe(true);
    for (const { partidos } of divisionesMuestra.values()) {
      for (let i = 1; i < partidos.length; i++) {
        const [a, b] = [partidos[i - 1], partidos[i]];
        if (a?.fecha === b?.fecha && a?.hora === null) {
          expect(b?.hora).toBeNull();
        }
      }
    }
  });
});

describe('marcadores', () => {
  it('en escolar el resultado oficial está capado y el real no', () => {
    const finalizados = division('infantil-r').partidos.filter(
      (p) => p.estado === 'finalizado',
    );
    expect(finalizados.length).toBeGreaterThan(0);
    const distintos = finalizados.filter(
      (p) =>
        p.marcador?.local !== p.marcadorOficial?.local ||
        p.marcador?.visitante !== p.marcadorOficial?.visitante,
    );
    expect(distintos.length).toBeGreaterThan(0);
  });

  it('en senior coinciden', () => {
    for (const p of division('liga-norte').partidos) {
      if (p.estado === 'finalizado')
        expect(p.marcador).toEqual(p.marcadorOficial);
    }
  });

  it('un partido sin terminar no tiene marcador aunque golesActa valga 0', () => {
    for (const { partidos } of divisionesMuestra.values()) {
      for (const p of partidos) {
        if (p.estado === 'finalizado') {
          expect(p.marcador).not.toBeNull();
          expect(p.marcadorOficial).not.toBeNull();
        } else {
          expect(p.marcador).toBeNull();
        }
      }
    }
  });
});

describe('clasificación', () => {
  it('la racha calculada coincide con la de la federación', () => {
    let comprobadas = 0;
    for (const { fases, filas, partidos } of divisionesMuestra.values()) {
      for (const fase of fases) {
        const delaFase = partidos.filter((p) => p.faseId === fase.id);
        for (const tabla of agruparClasificacion(fase, filas)) {
          const grupo = fase.grupos.find((g) => g.id === tabla.grupo?.id);
          const equipos = grupo ? new Set(grupo.inscripcionIds) : undefined;
          for (const fila of tabla.filas) {
            const id = fila.equipo.inscripcionId;
            if (!fila.racha || !id) continue;
            expect(
              calcularRacha(id, delaFase, equipos),
              fila.equipo.nombre,
            ).toEqual(fila.racha);
            comprobadas++;
          }
        }
      }
    }
    expect(comprobadas).toBeGreaterThan(20);
  });

  it('una fase con grupos solapados da una tabla por grupo', () => {
    const { fases, filas } = division('infantil-r');
    const [fase] = fases;
    if (!fase) throw new Error('infantil-r sin fases');
    const tablas = agruparClasificacion(fase, filas);
    expect(tablas.map((t) => t.grupo?.id)).toEqual(
      fase.grupos.map((g) => g.id),
    );
    const [sector, general] = tablas.map(
      (t) => new Set(t.filas.map((f) => f.equipo.inscripcionId)),
    );
    expect([...(sector ?? [])].some((id) => general?.has(id))).toBe(true);
    for (const t of tablas) {
      expect(t.filas.map((f) => f.puesto)).toEqual(
        t.filas.map((_, i) => i + 1),
      );
    }
  });

  it('las leyendas son por nombre de grupo y descartan colores var()', () => {
    const [fase] = division('infantil-r').fases;
    const [sector, general] = fase?.grupos ?? [];
    expect(sector?.leyendas).toEqual([
      {
        puestos: [1, 2],
        descripcion: 'Clasificación Sector',
        color: null,
        colorTexto: '#22c55e',
      },
    ]);
    expect(general?.leyendas).toEqual([]);
  });

  it('una fase sin grupos da una tabla con las leyendas generales', () => {
    const { fases, filas } = division('liga-norte');
    const [fase] = fases;
    if (!fase) throw new Error('liga-norte sin fases');
    const tablas = agruparClasificacion(fase, filas);
    expect(tablas).toHaveLength(1);
    expect(tablas[0]?.grupo).toBeNull();
    expect(tablas[0]?.leyendas[0]).toMatchObject({
      puestos: [1],
      color: '#dcfce7',
    });
    expect(tablas[0]?.leyendas.at(-1)?.puestos.length).toBeGreaterThan(0);
  });

  it('la liga sin empezar no tiene tabla', () => {
    const { fases, filas } = division('benjamin-c');
    expect(filas).toEqual([]);
    expect(fases.flatMap((f) => agruparClasificacion(f, filas))).toEqual([]);
  });
});

describe('eliminatoria', () => {
  it('los cruces aún sin rival no tienen equipos ni marcador', () => {
    const { fases, partidos } = division('copa-liga-norte');
    expect(fases.every((f) => f.formato === 'eliminatoria')).toBe(true);
    const sinRival = partidos.filter((p) => !p.local && !p.visitante);
    expect(sinRival).toHaveLength(3);
    for (const p of sinRival) {
      expect(p.marcador).toBeNull();
      expect(p.marcadorOficial).toBeNull();
    }
  });
});

describe('catálogo de equipos Loyola', () => {
  const competiciones = competicionesDeAgenda(agenda);
  const catalogo = construirCatalogoLoyola(
    [...divisionesMuestra.values()].map((d) => {
      const competicion = competiciones.find(
        (c) => c.id === d.entrada.competicionId,
      );
      const api = divisiones.find((x) => x.id === d.entrada.divisionId);
      if (!competicion || !api) throw new Error(d.entrada.slug);
      return fuentesDivision({
        competicion,
        division: divisionDesdeApi(api),
        arbol: d.arbol,
        clasificacion: d.filasApi,
        equipos: d.equipos,
        agenda,
      });
    }),
  );
  const de = (slug: string) =>
    catalogo
      .filter((e) => e.division.id === division(slug).entrada.divisionId)
      .map((e) => e.equipo.nombre);

  it('incluye los equipos que /equipos no devuelve', () => {
    expect(division('benjamin-c').equipos).not.toContainEqual(
      expect.objectContaining({ nombre: 'LOYOLA INDAUTXU A' }),
    );
    expect(de('benjamin-c')).toEqual([
      'LOYOLA INDAUTXU A',
      'LOYOLA INDAUTXU B',
    ]);
    expect(de('infantil-sub15-fem')).toEqual(['LOYOLA INDAUTXU']);
    expect(de('infantil-r')).toEqual([
      'LOYOLA INDAUTXU A',
      'LOYOLA INDAUTXU B',
    ]);
  });

  it('cada equipo tiene sus dos ids', () => {
    expect(catalogo).toHaveLength(7);
    for (const { equipo } of catalogo) {
      expect(equipo.inscripcionId, equipo.nombre).not.toBeNull();
      expect(equipo.equipoId, equipo.nombre).not.toBeNull();
    }
  });

  it('se distingue por competición, no por división', () => {
    const nombres = catalogo
      .filter((e) => e.division.nombre === 'Infantil Escolar')
      .map((e) => e.competicion.nombre);
    expect(new Set(nombres).size).toBe(2);
  });
});
