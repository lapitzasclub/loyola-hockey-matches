import { describe, expect, it } from 'vitest';
import { ErrorContrato, crearCliente } from './cliente';
import { fixturesJugadores, muestra, partidosMuestra } from './fixtures';
import { transporteDeFixtures } from './fixtures/transporte';

function montar() {
  const transporte = transporteDeFixtures();
  return { transporte, api: crearCliente(transporte) };
}

const ligaNorte = muestra().find((m) => m.slug === 'liga-norte');
if (!ligaNorte) throw new Error('Falta liga-norte en la muestra');

describe('catalogo', () => {
  it('se monta en tres rondas: agenda, un POST de divisiones y /equipos por división', async () => {
    const { transporte, api } = montar();
    const { catalogo, agenda, divisiones } = await api.catalogo();

    const [primera, segunda, ...resto] = transporte.peticiones;
    expect(primera?.ruta).toBe('/public/agenda');
    expect(primera?.params).toMatchObject({
      clubId: expect.any(String),
      dias: 60,
    });
    expect(segunda?.ruta).toBe('/hierarchy/competiciones/divisiones');
    expect(segunda?.metodo).toBe('POST');
    expect(resto).toHaveLength(divisiones.length);
    expect(resto.every((p) => p.ruta.endsWith('/equipos'))).toBe(true);

    expect(divisiones).toHaveLength(muestra().length);
    expect(agenda.length).toBeGreaterThan(0);
    expect(catalogo.map((e) => e.equipo.nombre)).toContain('LOYOLA INDAUTXU');
  });

  it('encuentra a los Loyola que /equipos no devuelve gracias a la agenda', async () => {
    const { api } = montar();
    const { catalogo } = await api.catalogo();
    const benjamin = muestra().find((m) => m.slug === 'benjamin-c');
    expect(
      catalogo
        .filter((e) => e.division.id === benjamin?.divisionId)
        .map((e) => e.equipo.nombre),
    ).toEqual(['LOYOLA INDAUTXU A', 'LOYOLA INDAUTXU B']);
  });

  it('si falla un /equipos sale igual con lo que trae la agenda', async () => {
    const base = transporteDeFixtures();
    const api = crearCliente(async (p) => {
      if (p.ruta.endsWith('/equipos')) throw new Error('caído');
      return base(p);
    });
    const { catalogo } = await api.catalogo();
    expect(catalogo.length).toBeGreaterThan(0);
  });

  it('una cancelación no se disfraza de catálogo incompleto', async () => {
    const base = transporteDeFixtures();
    const control = new AbortController();
    const api = crearCliente(async (p) => {
      if (p.ruta.endsWith('/equipos')) control.abort();
      return base(p);
    });
    await expect(
      api.catalogo({ signal: control.signal }),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('recursos', () => {
  it('no pide divisiones sin competiciones', async () => {
    const { transporte, api } = montar();
    await expect(api.divisiones([])).resolves.toEqual([]);
    expect(transporte.peticiones).toHaveLength(0);
  });

  it('calendario y fases de una división, ordenados', async () => {
    const { api } = montar();
    const calendario = await api.calendario({
      id: ligaNorte.divisionId,
      competicionId: ligaNorte.competicionId,
    });
    expect(calendario.fases.length).toBeGreaterThan(0);
    expect(calendario.partidos.length).toBeGreaterThan(0);
    const ordenes = (await api.fases(ligaNorte.divisionId)).map((f) => f.orden);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
  });

  it('clasificación, detalle, marcadores, jugadores y plantilla devuelven dominio', async () => {
    const { api } = montar();
    const [faseId = ''] = ligaNorte.faseIds;
    expect((await api.clasificacion(faseId)).length).toBeGreaterThan(0);

    const [partido] = partidosMuestra();
    expect((await api.partido(partido?.id ?? '')).id).toBe(partido?.id);
    expect(Array.isArray(await api.marcadores())).toBe(true);

    const j = fixturesJugadores();
    expect(
      (await api.estadisticasJugadores(ligaNorte.divisionId)).length,
    ).toBeGreaterThan(0);
    await expect(
      api.plantilla(ligaNorte.divisionId, j.equipoId),
    ).resolves.toBeDefined();
    await expect(api.fichaJugador(j.goleadorId)).resolves.toBeDefined();
  });

  it('si la API cambia de forma lanza ErrorContrato con la ruta', async () => {
    const api = crearCliente(async () => ({ inesperado: true }));
    const error = await api.agenda().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorContrato);
    expect(error).toMatchObject({ ruta: '/public/agenda' });
  });

  it('lo que no existe es un 404 del transporte', async () => {
    const { api } = montar();
    await expect(api.partido('no-existe')).rejects.toMatchObject({
      status: 404,
    });
  });
});
