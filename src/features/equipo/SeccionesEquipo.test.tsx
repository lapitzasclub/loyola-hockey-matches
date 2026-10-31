import { IonReactRouter } from '@ionic/react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fixturesJugadores, muestra } from '../../api/fixtures';
import { transporteDeFixtures } from '../../api/fixtures/transporte';
import { ErrorApi } from '../../api/transport';
import type { Transporte } from '../../api/transport';
import { Providers } from '../../app/Providers';
import { equipo, jugado } from '../../domain/test-utils';
import '../../i18n';
import { AlineacionesEquipo } from './AlineacionesEquipo';
import { EstadisticasEquipo } from './EstadisticasEquipo';
import { PartidosEquipo } from './PartidosEquipo';
import { PlantillaEquipo } from './PlantillaEquipo';
import type { DatosEquipo } from './tipos';

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

const { slug, equipoId } = fixturesJugadores();
const divisionId = muestra().find((m) => m.slug === slug)!.divisionId;

const loyola = equipo('LOYOLA INDAUTXU', { inscripcionId: 'loy', equipoId });

function datos(partidos: DatosEquipo['partidos'] = []): DatosEquipo {
  return {
    equipo: loyola,
    inscripcionId: 'loy',
    divisionId,
    partidos,
    hoy: '2026-11-15',
    directos: new Map(),
  };
}

const jugados = [
  jugado('p1', '2026-10-03', 'loy', 'a', [3, 0]),
  jugado('p2', '2026-10-17', 'b', 'loy', [2, 2]),
  jugado('p3', '2026-11-07', 'loy', 'c', [0, 1]),
];

function pintar(seccion: ReactNode) {
  return render(
    <Providers>
      <IonReactRouter>{seccion}</IonReactRouter>
    </Providers>,
  );
}

describe('PlantillaEquipo', () => {
  it('separa porteros, jugadores y cuerpo técnico y enlaza a las fichas', async () => {
    pintar(<PlantillaEquipo datos={datos()} />);

    const filas = await screen.findAllByTestId('jugador-fila');
    expect(filas[0]).toHaveAttribute(
      'router-link',
      expect.stringMatching(/^\/clasificacion\/jugador\//),
    );
    const titulos = [...document.querySelectorAll('.seccion__titulo')].map(
      (t) => t.textContent,
    );
    expect(titulos).toContain('Porteros');
    expect(titulos).toContain('Jugadores');
    expect(titulos).toContain('Cuerpo técnico');
  });

  it('el cuerpo técnico no lleva enlace a una ficha', async () => {
    pintar(<PlantillaEquipo datos={datos()} />);
    await screen.findAllByTestId('jugador-fila');
    const personas = document.querySelectorAll('.persona');
    const enlaces = document.querySelectorAll('.persona--enlace');
    expect(personas.length).toBeGreaterThan(enlaces.length);
  });

  it('sin equipoId no hay forma de pedir la plantilla', () => {
    pintar(
      <PlantillaEquipo
        datos={{ ...datos(), equipo: { ...loyola, equipoId: null } }}
      />,
    );
    expect(
      screen.getByText('Todavía no hay plantilla publicada.'),
    ).toBeVisible();
    expect(transporte).not.toHaveBeenCalled();
  });

  it('si falla ofrece reintentar y se recupera', async () => {
    const fixtures = transporteDeFixtures();
    transporte.mockImplementation((peticion) =>
      /plantilla$/.test(peticion.ruta)
        ? Promise.reject(new ErrorApi(404, peticion.ruta))
        : fixtures(peticion),
    );
    pintar(<PlantillaEquipo datos={datos()} />);

    const error = await screen.findByTestId('estado-error');
    transporte.mockImplementation(fixtures);
    fireEvent.click(within(error).getByText('Reintentar'));
    expect(
      (await screen.findAllByTestId('jugador-fila')).length,
    ).toBeGreaterThan(0);
  });
});

describe('EstadisticasEquipo', () => {
  it('sin partidos jugados no hay estadísticas', () => {
    pintar(<EstadisticasEquipo datos={datos()} />);
    expect(screen.getByTestId('estadisticas-vacias')).toBeInTheDocument();
  });

  it('calcula el balance con el resultado oficial y suma los goleadores de la plantilla', async () => {
    pintar(<EstadisticasEquipo datos={datos(jugados)} />);

    const estadisticas = await screen.findByTestId('estadisticas-equipo');
    // 1 victoria de 3 partidos.
    expect(within(estadisticas).getByText('33%')).toBeInTheDocument();
    expect(
      within(estadisticas).getByRole('img', { name: /Victoria: 1/ }),
    ).toBeInTheDocument();
    expect(
      await within(estadisticas).findByText('Goleadores'),
    ).toBeInTheDocument();
    expect(
      await within(estadisticas).findByText('Disciplina'),
    ).toBeInTheDocument();
  });
});

describe('AlineacionesEquipo', () => {
  it('sin partidos jugados enseña el estado vacío', () => {
    pintar(<AlineacionesEquipo datos={datos()} />);
    expect(screen.getByTestId('alineaciones-vacias')).toBeInTheDocument();
  });

  it('lista los partidos jugados del más reciente al más antiguo', async () => {
    pintar(<AlineacionesEquipo datos={datos(jugados)} />);

    const hub = await screen.findByTestId('alineaciones-equipo');
    const fechas = within(hub)
      .getAllByTestId('tarjeta-partido')
      .map((t) => t.getAttribute('data-fecha'));
    expect(fechas).toEqual(['2026-11-07', '2026-10-17', '2026-10-03']);
  });
});

describe('PartidosEquipo', () => {
  it('agrupa los partidos por mes, por fecha', () => {
    pintar(<PartidosEquipo datos={datos(jugados)} />);
    expect(document.querySelectorAll('.mes')).toHaveLength(2);
    expect(
      screen
        .getAllByTestId('tarjeta-partido')
        .map((t) => t.getAttribute('data-fecha')),
    ).toEqual(['2026-10-03', '2026-10-17', '2026-11-07']);
  });

  it('sin partidos enseña el estado vacío', () => {
    pintar(<PartidosEquipo datos={datos()} />);
    expect(
      screen.getByText('No hay partidos que mostrar.'),
    ).toBeInTheDocument();
  });
});
