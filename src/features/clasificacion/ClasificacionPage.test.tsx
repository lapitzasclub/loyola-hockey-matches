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
  window.history.pushState({}, '', '/clasificacion');
  transporte.mockImplementation(transporteDeFixtures());
});

/** Elige el primer equipo del selector cuya competición se llama `competicion`. */
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

describe('ClasificacionPage', () => {
  it('sin equipo elegido invita a elegir uno', async () => {
    render(<App />);
    expect(await screen.findByTestId('sin-equipo')).toBeInTheDocument();
  });

  it('enseña la tabla con el Loyola destacado y la racha de cada equipo', async () => {
    render(<App />);
    await elegirEquipoDe('LIGA NORTE');

    const filas = await screen.findAllByTestId('clasificacion-fila');
    expect(filas.length).toBeGreaterThan(2);
    expect(
      filas.filter((f) => f.classList.contains('clasif__fila--loyola')),
    ).toHaveLength(1);
    // La racha sale de los partidos, que llegan en otra petición.
    expect((await screen.findAllByTestId('racha')).length).toBeGreaterThan(0);
  });

  it('con grupos que se solapan saca una tabla por grupo', async () => {
    render(<App />);
    await elegirEquipoDe('LIGA ESCOLAR INFANTIL R');

    await screen.findAllByTestId('clasificacion-fila');
    expect(screen.getAllByTestId('clasificacion').length).toBeGreaterThan(1);
  });

  it('una división sin clasificación enseña el estado vacío', async () => {
    render(<App />);
    await elegirEquipoDe('LIGA ESCOLAR BENJAMÍN C');
    expect(
      await screen.findByTestId('clasificacion-vacia'),
    ).toBeInTheDocument();
  });

  it('al tocar un equipo abre su detalle y el back vuelve a la clasificación', async () => {
    render(<App />);
    await elegirEquipoDe('LIGA NORTE');

    const filas = await screen.findAllByTestId('clasificacion-fila');
    fireEvent.click(filas.find((f) => f.hasAttribute('data-inscripcion'))!);

    const detalle = await screen.findByTestId('page-equipo');
    expect(
      await within(detalle).findByTestId('equipo-cabecera'),
    ).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/clasificacion\/equipo\//);
  });

  it('si falla la clasificación ofrece reintentar y se recupera', async () => {
    const fixtures = transporteDeFixtures();
    transporte.mockImplementation((peticion) =>
      /clasificacion$/.test(peticion.ruta)
        ? Promise.reject(new ErrorApi(404, peticion.ruta))
        : fixtures(peticion),
    );
    render(<App />);
    await elegirEquipoDe('LIGA NORTE');

    const error = await screen.findByTestId('estado-error');
    transporte.mockImplementation(fixtures);
    fireEvent.click(within(error).getByText('Reintentar'));
    expect(
      (await screen.findAllByTestId('clasificacion-fila')).length,
    ).toBeGreaterThan(0);
  });
});
