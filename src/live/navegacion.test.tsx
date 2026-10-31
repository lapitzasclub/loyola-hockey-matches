import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  useParams,
} from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../app/queryClient';
import { fechaLocal } from '../domain';
import { detalle } from '../domain/test-utils';
import { claves, usePartido } from '../queries';
import type { ConexionDirecto, ManejadoresCanal } from './conexion';
import { instalarDirecto } from './gestor';

const canales = new Map<string, ManejadoresCanal>();
const conexion: ConexionDirecto = {
  suscribir(canal, manejadores) {
    canales.set(canal, manejadores);
    return () => canales.delete(canal);
  },
  reanudar: vi.fn(),
  suspender: vi.fn(),
};

function Partido() {
  const { id } = useParams();
  const { data } = usePartido(id);
  return <p>{data?.id}</p>;
}

let desinstalar = () => {};
afterEach(() => desinstalar());
beforeEach(() => canales.clear());

it('al navegar solo queda suscrito el partido en pantalla, y ninguno al salir', async () => {
  const cliente = createQueryClient();
  const hoy = fechaLocal(new Date());
  for (const id of ['a', 'b']) {
    cliente.setQueryData(
      claves.partido(id),
      detalle({ id, fecha: hoy, estado: 'en_juego', periodo: 1 }),
    );
  }
  desinstalar = instalarDirecto(cliente, { conectar: async () => conexion });

  const router = createMemoryRouter([
    { path: '/', element: null },
    { path: '/partido/:id', element: <Partido /> },
  ]);
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const suscritos = () => [...canales.keys()];
  expect(suscritos()).toEqual([]);

  await act(() => router.navigate('/partido/a'));
  await waitFor(() => expect(suscritos()).toEqual(['acta_a']));

  await act(() => router.navigate('/partido/b'));
  await waitFor(() => expect(suscritos()).toEqual(['acta_b']));

  await act(() => router.navigate('/'));
  await waitFor(() => expect(suscritos()).toEqual([]));
});
