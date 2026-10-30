import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { muestra, partidosMuestra } from '../api/fixtures';
import { transporteDeFixtures } from '../api/fixtures/transporte';
import type { TransporteFixtures } from '../api/fixtures/transporte';
import { ErrorApi } from '../api/transport';
import type { Transporte } from '../api/transport';
import { createQueryClient } from '../app/queryClient';
import { claves, consultas, useAgenda, useCalendario, useCatalogo } from '.';

const transporte = vi.hoisted(() => vi.fn<Transporte>());
vi.mock(import('../api/transport'), async (original) => ({
  ...(await original()),
  transporte,
}));

let fixtures: TransporteFixtures;

beforeEach(() => {
  fixtures = transporteDeFixtures();
  transporte.mockReset().mockImplementation(fixtures);
});

function montar() {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const rutas = () => fixtures.peticiones.map((p) => p.ruta);

describe('claves', () => {
  it('las divisiones en batch no dependen del orden de los ids', () => {
    expect(claves.divisiones(['b', 'a'])).toEqual(
      claves.divisiones(['a', 'b']),
    );
  });

  it('todo lo de una división cuelga de su clave', () => {
    const division = claves.division('d1');
    for (const clave of [
      claves.calendario('d1'),
      claves.fases('d1'),
      claves.equiposDivision('d1'),
      claves.estadisticasJugadores('d1'),
      claves.plantilla('d1', 'e1'),
    ]) {
      expect(clave.slice(0, division.length)).toEqual(division);
    }
  });
});

describe('hooks', () => {
  it('el catálogo deja sembrada la agenda: la pestaña de partidos no la vuelve a pedir', async () => {
    const { wrapper } = montar();
    const catalogo = renderHook(() => useCatalogo(), { wrapper });
    await waitFor(() => expect(catalogo.result.current.isSuccess).toBe(true));
    const pedidas = fixtures.peticiones.length;

    const agenda = renderHook(() => useAgenda(), { wrapper });
    expect(agenda.result.current.isSuccess).toBe(true);
    expect(agenda.result.current.data?.length).toBeGreaterThan(0);
    expect(fixtures.peticiones).toHaveLength(pedidas);
    expect(rutas().filter((r) => r === '/public/agenda')).toHaveLength(1);
  });

  it('una consulta sin id espera sin pedir nada', async () => {
    const { wrapper } = montar();
    const { result, rerender } = renderHook(
      ({ division }) => useCalendario(division),
      {
        wrapper,
        initialProps: {
          division: undefined as
            { id: string; competicionId: string } | undefined,
        },
      },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(transporte).not.toHaveBeenCalled();

    const [liga] = muestra();
    rerender({
      division: {
        id: liga?.divisionId ?? '',
        competicionId: liga?.competicionId ?? '',
      },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rutas()).toEqual([`/hierarchy/division/${liga?.divisionId}/tree`]);
  });
});

describe('reintentos', () => {
  const reintentar = () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') throw new Error('retry debe ser función');
    return retry;
  };

  it('reintenta tres veces lo pasajero', () => {
    const retry = reintentar();
    const caida = new ErrorApi(503, '/x');
    expect([0, 1, 2, 3].map((n) => retry(n, caida))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(retry(0, new ErrorApi(0, '/x'))).toBe(true);
  });

  it('no reintenta un 404 ni un cambio de contrato', async () => {
    const retry = reintentar();
    expect(retry(0, new ErrorApi(404, '/x'))).toBe(false);

    transporte.mockResolvedValue({ inesperado: true });
    const { wrapper } = montar();
    const { result } = renderHook(() => useAgenda(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.name).toBe('ErrorContrato');
    expect(transporte).toHaveBeenCalledTimes(1);
  });
});

describe('frescura en las consultas', () => {
  it('un partido finalizado hace tiempo no se vuelve a pedir', async () => {
    const { client } = montar();
    const finalizado = partidosMuestra().find((p) => p.clave === 'roja');
    const opciones = consultas.partido(finalizado?.id);
    await client.fetchQuery(opciones);
    await client.prefetchQuery(opciones);
    expect(transporte).toHaveBeenCalledTimes(1);
  });

  it('los marcadores en directo no se persisten', () => {
    expect(consultas.marcadores().meta?.persistir).toBe(false);
    expect(consultas.agenda().meta?.persistir).toBeUndefined();
  });
});
