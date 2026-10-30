import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { transporteDeFixtures } from '../api/fixtures/transporte';
import { ErrorApi } from '../api/transport';
import type { Transporte } from '../api/transport';
import '../i18n';
import { App } from './App';
import { VERSION_CACHE, crearPersister } from './persistencia';
import type { AlmacenCache } from './persistencia';

const transporte = vi.hoisted(() => vi.fn<Transporte>());
vi.mock(import('../api/transport'), async (original) => ({
  ...(await original()),
  transporte,
}));

vi.mock(import('./persistencia'), async (original) => {
  const real = await original();
  return { ...real, almacenIndexedDb: () => almacen };
});

/** IndexedDB de mentira que sobrevive entre «aperturas» de la app. */
function almacenEnMemoria() {
  let guardado: PersistedClient | undefined;
  const almacen: AlmacenCache & { guardado(): PersistedClient | undefined } = {
    leer: async () => guardado && structuredClone(guardado),
    guardar: async (cliente) => {
      guardado = structuredClone(cliente);
    },
    borrar: async () => {
      guardado = undefined;
    },
    guardado: () => guardado,
  };
  return almacen;
}

let almacen: ReturnType<typeof almacenEnMemoria>;

beforeEach(() => {
  almacen = almacenEnMemoria();
  transporte.mockReset().mockImplementation(transporteDeFixtures());
});

/** Abre la app, espera a la agenda y la cierra dejando escrita la caché. */
async function primeraApertura() {
  const { unmount } = render(<App />);
  expect(await screen.findByTestId('agenda')).toBeInTheDocument();
  await waitFor(() => expect(almacen.guardado()).toBeDefined(), {
    timeout: 3000,
  });
  unmount();
}

describe('caché persistida', () => {
  it('la segunda apertura pinta desde la caché sin tocar la red', async () => {
    await primeraApertura();
    const claves = almacen
      .guardado()
      ?.clientState.queries.map((q) => q.queryKey[1]);
    expect(claves).toEqual(expect.arrayContaining(['catalogo', 'agenda']));

    transporte.mockReset().mockRejectedValue(new ErrorApi(0, '/sin-red'));
    render(<App />);
    expect(await screen.findByTestId('agenda')).toBeInTheDocument();
    expect(transporte).not.toHaveBeenCalled();
  });

  it('con otra versión de caché no se restaura nada', async () => {
    await primeraApertura();
    const guardado = almacen.guardado();
    if (!guardado) throw new Error('No se guardó la caché');
    await almacen.guardar({ ...guardado, buster: `${VERSION_CACHE}-vieja` });

    transporte.mockReset().mockRejectedValue(new ErrorApi(404, '/sin-red'));
    render(<App />);
    expect(
      await screen.findByText('No se han podido cargar los partidos.'),
    ).toBeInTheDocument();
    expect(transporte).toHaveBeenCalled();
  });
});

describe('crearPersister', () => {
  const cliente = (timestamp: number): PersistedClient => ({
    timestamp,
    buster: VERSION_CACHE,
    clientState: { queries: [], mutations: [] },
  });

  it('agrupa las escrituras seguidas en una', async () => {
    vi.useFakeTimers();
    try {
      const guardar = vi.fn(async () => {});
      const persister = crearPersister(
        { leer: async () => undefined, guardar, borrar: async () => {} },
        1000,
      );
      persister.persistClient(cliente(1));
      persister.persistClient(cliente(2));
      persister.persistClient(cliente(3));
      await vi.advanceTimersByTimeAsync(1000);
      expect(guardar).toHaveBeenCalledTimes(1);
      expect(guardar).toHaveBeenCalledWith(cliente(3));
    } finally {
      vi.useRealTimers();
    }
  });

  it('vaciar escribe lo pendiente sin esperar', async () => {
    const guardar = vi.fn(async () => {});
    const persister = crearPersister(
      { leer: async () => undefined, guardar, borrar: async () => {} },
      60_000,
    );
    persister.persistClient(cliente(1));
    await persister.vaciar();
    expect(guardar).toHaveBeenCalledWith(cliente(1));
  });

  it('un almacén roto no rompe la app', async () => {
    const roto = async () => {
      throw new Error('QuotaExceededError');
    };
    const persister = crearPersister(
      { leer: roto, guardar: roto, borrar: roto },
      0,
    );
    await expect(persister.restoreClient()).resolves.toBeUndefined();
    persister.persistClient(cliente(1));
    await expect(persister.vaciar()).resolves.toBeUndefined();
    await expect(persister.removeClient()).resolves.toBeUndefined();
  });
});
