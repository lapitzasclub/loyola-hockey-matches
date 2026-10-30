import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeEach(() => {
  localStorage.clear();
  transporte.mockImplementation(transporteDeFixtures());
});

async function elegirPrimerEquipo() {
  fireEvent.click(await screen.findByTestId('elegir-equipo'));
  const equipos = await screen.findAllByTestId('selector-equipo');
  fireEvent.click(equipos[0]!);
}

describe('PartidosPage', () => {
  it('mientras carga enseña skeletons con la forma de las tarjetas', async () => {
    const fixtures = transporteDeFixtures();
    let soltar = () => {};
    const bloqueo = new Promise<void>((resolver) => (soltar = resolver));
    transporte.mockImplementation(async (peticion) => {
      await bloqueo;
      return fixtures(peticion);
    });
    render(<App />);
    const lista = await screen.findByTestId('partidos-skeleton');
    expect(within(lista).getAllByTestId('tarjeta-skeleton')).toHaveLength(3);
    soltar();
    expect(await screen.findByTestId('sin-equipo')).toBeInTheDocument();
  });

  it('sin equipo elegido invita a elegir uno', async () => {
    render(<App />);
    expect(await screen.findByTestId('sin-equipo')).toBeInTheDocument();
  });

  it('el selector agrupa por categoría y al elegir enseña su calendario', async () => {
    render(<App />);
    fireEvent.click(await screen.findByTestId('elegir-equipo'));
    expect(
      (await screen.findAllByTestId('selector-equipo')).length,
    ).toBeGreaterThan(0);
    expect(
      document.querySelectorAll('.selector__categoria').length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByTestId('selector-equipo')[0]!);
    expect(await screen.findByTestId('cabecera-equipo')).toBeInTheDocument();
    expect(
      (await screen.findAllByTestId('tarjeta-partido')).length,
    ).toBeGreaterThan(0);
  });

  it('lista los partidos por fecha, no por jornada', async () => {
    render(<App />);
    await elegirPrimerEquipo();
    const tarjetas = await screen.findAllByTestId('tarjeta-partido');
    const fechas = tarjetas.map((t) => t.getAttribute('data-fecha'));
    expect(fechas).toEqual([...fechas].sort());
  });

  it('cada tarjeta lleva su insignia de estado', async () => {
    render(<App />);
    await elegirPrimerEquipo();
    const tarjetas = await screen.findAllByTestId('tarjeta-partido');
    for (const tarjeta of tarjetas) {
      expect(tarjeta.querySelector('[data-estado]')).not.toBeNull();
    }
  });

  it('recuerda el equipo elegido al volver a abrir la app', async () => {
    const primera = render(<App />);
    await elegirPrimerEquipo();
    await screen.findByTestId('cabecera-equipo');
    primera.unmount();

    render(<App />);
    expect(await screen.findByTestId('cabecera-equipo')).toBeInTheDocument();
    expect(screen.queryByTestId('sin-equipo')).not.toBeInTheDocument();
  });

  it('si falla la carga ofrece reintentar y se recupera', async () => {
    const fixtures = transporteDeFixtures();
    transporte.mockImplementation(() =>
      Promise.reject(new ErrorApi(404, '/public/agenda')),
    );
    render(<App />);
    const error = await screen.findByTestId('estado-error');

    transporte.mockImplementation(fixtures);
    fireEvent.click(within(error).getByText('Reintentar'));
    expect(await screen.findByTestId('sin-equipo')).toBeInTheDocument();
  });
});
