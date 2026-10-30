import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fixturesJugadores } from '../../api/fixtures';
import { transporteDeFixtures } from '../../api/fixtures/transporte';
import { ErrorApi } from '../../api/transport';
import type { Transporte } from '../../api/transport';
import { App } from '../../app/App';
import '../../i18n';

const transporte = vi.hoisted(() => vi.fn<Transporte>());
vi.mock(import('../../api/transport'), async (original) => ({
  ...(await original()),
  transporte,
}));

const { goleadorId, porteroId } = fixturesJugadores();

function abrir(id: string) {
  window.history.pushState({}, '', `/estadisticas/jugador/${id}`);
  render(<App />);
}

beforeEach(() => {
  localStorage.clear();
  transporte.mockImplementation(transporteDeFixtures());
});

describe('JugadorPage', () => {
  it('enseña la cabecera compacta y los totales de la temporada', async () => {
    abrir(goleadorId);

    const cabecera = await screen.findByTestId('jugador-cabecera');
    expect(cabecera).toHaveTextContent('Jugador');
    expect(cabecera).toHaveTextContent('Nacido en 2000');
    expect(screen.getAllByTestId('contador').length).toBeGreaterThan(0);
    expect(screen.getByTestId('ficha-jugador')).toHaveTextContent(/G\s*11/);
  });

  it('un portero lleva contadores de portero', async () => {
    abrir(porteroId);

    const cabecera = await screen.findByTestId('jugador-cabecera');
    expect(cabecera).toHaveTextContent('Portero');
    const ficha = screen.getByTestId('ficha-jugador');
    expect(ficha).toHaveTextContent(/GE\s*12/);
    expect(ficha).toHaveTextContent(/%Par\s*75\.0%/);
  });

  it('agrupa los partidos por competición y enlaza cada uno a su detalle', async () => {
    abrir(goleadorId);

    expect(
      (await screen.findAllByTestId('jugador-competicion')).length,
    ).toBeGreaterThan(0);
    const partidos = screen.getAllByTestId('jugador-partido');
    expect(partidos.length).toBeGreaterThan(0);
    fireEvent.click(partidos[0]!);
    expect(await screen.findByTestId('page-partido')).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/estadisticas\/partido\//);
  });

  it('carga la gráfica en diferido con una descripción accesible', async () => {
    abrir(goleadorId);

    const grafica = await screen.findByTestId('grafica-partidos');
    const svg = within(grafica).getByRole('img');
    expect(svg).toHaveAccessibleName(/Goles: /);
    expect(svg).toHaveAccessibleName(/Asistencias: /);
  });

  it('si falla ofrece reintentar y se recupera', async () => {
    const fixtures = transporteDeFixtures();
    transporte.mockImplementation((peticion) =>
      /jugador\/.*\/stats$/.test(peticion.ruta)
        ? Promise.reject(new ErrorApi(404, peticion.ruta))
        : fixtures(peticion),
    );
    abrir(goleadorId);

    const error = await screen.findByTestId('estado-error');
    transporte.mockImplementation(fixtures);
    fireEvent.click(within(error).getByText('Reintentar'));
    expect(await screen.findByTestId('jugador-cabecera')).toBeInTheDocument();
  });
});
