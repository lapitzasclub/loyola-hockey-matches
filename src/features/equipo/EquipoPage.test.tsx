import { fireEvent, render, screen, within } from '@testing-library/react';
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
  window.history.pushState({}, '', '/clasificacion');
  transporte.mockImplementation(transporteDeFixtures());
});

/** Elige el Loyola de Liga Norte y abre su detalle desde la clasificación. */
async function abrirEquipo() {
  fireEvent.click(await screen.findByTestId('elegir-equipo'));
  const equipos = await screen.findAllByTestId('selector-equipo');
  fireEvent.click(
    equipos.find(
      (e) =>
        e.querySelector('.selector__competicion')?.textContent === 'LIGA NORTE',
    )!,
  );
  const filas = await screen.findAllByTestId('clasificacion-fila');
  fireEvent.click(
    filas.find((f) => f.classList.contains('clasif__fila--loyola'))!,
  );
  await screen.findByTestId('equipo-cabecera');
}

describe('EquipoPage', () => {
  it('lleva el escudo y el nombre con los nombres de transición listos', async () => {
    render(<App />);
    await abrirEquipo();
    const cabecera = screen.getByTestId('equipo-cabecera');
    const marcas = [...cabecera.querySelectorAll('[data-transicion]')].map(
      (e) => e.getAttribute('data-transicion'),
    );
    expect(marcas).toHaveLength(2);
    expect(marcas[0]).toMatch(/^escudo-/);
    expect(marcas[1]).toMatch(/^nombre-/);
  });

  it('el resumen enseña el puesto, el balance y la racha', async () => {
    render(<App />);
    await abrirEquipo();
    const resumen = await screen.findByTestId('resumen-equipo');
    expect(await within(resumen).findByText('Puesto')).toBeInTheDocument();
    expect(await within(resumen).findByTestId('racha')).toBeInTheDocument();
  });

  it('desde el equipo se llega al partido', async () => {
    render(<App />);
    await abrirEquipo();
    const resumen = await screen.findByTestId('resumen-equipo');
    const [tarjeta] = await within(resumen).findAllByTestId('tarjeta-partido');
    fireEvent.click(tarjeta!);
    expect(await screen.findByTestId('page-partido')).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/clasificacion\/partido\//);
  });
});
