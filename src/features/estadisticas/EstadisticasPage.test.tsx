import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { transporteDeFixtures } from '../../api/fixtures/transporte';
import type { Transporte } from '../../api/transport';
import { App } from '../../app/App';
import '../../i18n';

const transporte = vi.hoisted(() => vi.fn<Transporte>());
vi.mock(import('../../api/transport'), async (original) => ({
  ...(await original()),
  transporte,
}));

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/estadisticas');
  transporte.mockImplementation(transporteDeFixtures());
});

async function elegirEquipoDe(competicion: string) {
  fireEvent.click(await screen.findByTestId('elegir-equipo'));
  const equipos = await screen.findAllByTestId('selector-equipo');
  const equipo = equipos.find(
    (e) =>
      e.querySelector('.selector__competicion')?.textContent === competicion,
  );
  expect(equipo).toBeDefined();
  fireEvent.click(equipo!);
}

describe('EstadisticasPage', () => {
  it('sin equipo elegido invita a elegir uno', async () => {
    render(<App />);
    expect(await screen.findByTestId('sin-equipo')).toBeInTheDocument();
  });

  it('enseña los líderes y el ranking de goleadores por defecto', async () => {
    render(<App />);
    await elegirEquipoDe('LIGA NORTE');

    expect((await screen.findAllByTestId('lider')).length).toBeGreaterThan(0);
    const filas = await screen.findAllByTestId('ranking-fila');
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.length).toBeLessThanOrEqual(10);
  });

  it('al tocar un jugador abre su ficha dentro de la pestaña', async () => {
    render(<App />);
    await elegirEquipoDe('LIGA NORTE');

    fireEvent.click((await screen.findAllByTestId('ranking-fila'))[0]!);
    expect(await screen.findByTestId('page-jugador')).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/estadisticas\/jugador\//);
  });

  it('una división sin estadísticas enseña el estado vacío', async () => {
    const fixtures = transporteDeFixtures();
    transporte.mockImplementation((peticion) =>
      /estadisticas-jugadores$/.test(peticion.ruta)
        ? Promise.resolve({
            jugadores: [],
            totales: {
              penaltis: 0,
              faltasDirectas: 0,
              tarjetasAzules: 0,
              tarjetasRojas: 0,
            },
          })
        : fixtures(peticion),
    );
    render(<App />);
    await elegirEquipoDe('LIGA ESCOLAR BENJAMÍN C');
    expect(
      await screen.findByTestId('estadisticas-vacias'),
    ).toBeInTheDocument();
  });
});
