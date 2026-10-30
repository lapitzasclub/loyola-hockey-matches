import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { AlineacionesPartido } from './AlineacionesPartido';
import { detalle, pintar } from './test-utils';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/partidos');
});

function pintarAlineaciones(clave: string) {
  const partido = detalle(clave);
  pintar(
    <AlineacionesPartido local={partido.local} visitante={partido.visitante} />,
  );
  return partido;
}

describe('AlineacionesPartido', () => {
  it('pinta ambos equipos con sus jugadores y su cuerpo técnico', () => {
    const partido = pintarAlineaciones('copa');
    const local = screen.getByTestId('alineacion-local');
    expect(local).toHaveTextContent(partido.local.equipo.nombre);
    expect(within(local).getAllByTestId('miembro-jugador')).toHaveLength(
      partido.local.alineacion.jugadores.length,
    );
    expect(within(local).getAllByTestId('miembro-staff')).toHaveLength(
      partido.local.alineacion.staff.length,
    );
    const visitante = screen.getByTestId('alineacion-visitante');
    expect(visitante).toHaveTextContent(partido.visitante.equipo.nombre);
    expect(within(visitante).getAllByTestId('miembro-jugador')).toHaveLength(
      partido.visitante.alineacion.jugadores.length,
    );
  });

  it('separa porteros, jugadores y cuerpo técnico en bloques', () => {
    pintarAlineaciones('copa');
    const local = screen.getByTestId('alineacion-local');
    expect(within(local).getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('marca al capitán de cada equipo', () => {
    pintarAlineaciones('copa');
    for (const id of ['alineacion-local', 'alineacion-visitante']) {
      expect(
        within(screen.getByTestId(id)).getAllByText('C', {
          selector: '.chip',
        }),
      ).toHaveLength(1);
    }
  });

  it('enlaza a la ficha de jugadores y porteros, no del cuerpo técnico', () => {
    pintarAlineaciones('copa');
    for (const fila of screen.getAllByTestId('miembro-jugador')) {
      expect(fila.getAttribute('router-link')).toMatch(/\/jugador\/.+/);
    }
    for (const fila of screen.getAllByTestId('miembro-staff')) {
      expect(fila.getAttribute('router-link')).toBeNull();
      expect(fila.querySelector('ion-router-link')).toBeNull();
    }
  });

  it('pinta las iniciales y tolera un jugador sin dorsal', () => {
    const partido = pintarAlineaciones('jugador-sin-dorsal');
    const sinDorsal = [
      ...partido.local.alineacion.jugadores,
      ...partido.visitante.alineacion.jugadores,
    ].find((m) => m.dorsal === null);
    expect(sinDorsal).toBeDefined();
    expect(
      document.querySelectorAll('.persona__foto--iniciales').length,
    ).toBeGreaterThan(0);
  });

  it('muestra un estado vacío si ningún equipo tiene alineación', () => {
    pintarAlineaciones('programado');
    expect(screen.getByTestId('alineaciones-vacias')).toBeInTheDocument();
    expect(screen.queryByTestId('alineaciones-partido')).toBeNull();
  });
});
