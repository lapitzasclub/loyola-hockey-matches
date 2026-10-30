import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { cronologia, indiceAlineacion } from '../../domain';
import type { PartidoDetalle } from '../../domain';
import { penalti } from '../../domain/test-utils';
import { EventosPartido } from './EventosPartido';
import { detalle, pintar } from './test-utils';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/partidos');
});

function pintarEventos(partido: PartidoDetalle) {
  return pintar(
    <EventosPartido partido={partido} indice={indiceAlineacion(partido)} />,
  );
}

const filas = () => screen.queryAllByTestId('evento');
const tipos = () => filas().map((f) => f.getAttribute('data-tipo'));

describe('EventosPartido', () => {
  it('pinta cada evento visible una vez y deja fuera las paradas', () => {
    const partido = detalle('copa');
    pintarEventos(partido);
    const visibles = cronologia(partido.incidencias).flatMap((g) => g.filas);
    expect(filas()).toHaveLength(visibles.length);
    expect(tipos()).not.toContain('PARADA');
  });

  it('agrupa por periodo con el más reciente arriba y los goles más nuevos primero', () => {
    pintarEventos(detalle('copa'));
    const periodos = [
      ...screen
        .getByTestId('eventos-partido')
        .querySelectorAll('[data-periodo]'),
    ].map((s) => s.getAttribute('data-periodo'));
    expect(periodos).toEqual(['2', '1']);

    const marcadores = screen
      .getAllByTestId('evento')
      .map((f) => f.querySelector('.evento__marcador')?.textContent)
      .filter(Boolean);
    expect(marcadores[0]).toBe('5–6');
    expect(marcadores.at(-1)).toMatch(/^[01]–[01]$/);
  });

  it('no duplica el penalti ni la falta directa convertidos con su gol', () => {
    const partido = detalle('roja');
    pintarEventos(partido);
    const lanzamientosFallados = partido.incidencias.filter(
      (i) =>
        (i.tipo === 'PENALTI' || i.tipo === 'FALTADIRECTA') &&
        i.resultado !== 'gol',
    );
    expect(
      tipos().filter((t) => t === 'PENALTI' || t === 'FALTADIRECTA'),
    ).toHaveLength(lanzamientosFallados.length);
    expect(tipos().filter((t) => t === 'GOL')).toHaveLength(10);
  });

  it('muestra tarjetas y cambios', () => {
    pintarEventos(detalle('roja'));
    expect(tipos()).toContain('TARJETAROJA');
    expect(tipos()).toContain('TARJETAAMARILLA');
    expect(document.querySelector('.tarjeta-color--roja')).toBeInTheDocument();

    document.body.innerHTML = '';
    pintarEventos(detalle('descanso'));
    expect(tipos().filter((t) => t === 'CAMBIO')).toHaveLength(34);
  });

  it('enseña el periodo de descanso y el de previa como secciones propias', () => {
    pintarEventos(detalle('descanso'));
    expect(document.querySelector('[data-periodo="9"]')).toBeInTheDocument();

    document.body.innerHTML = '';
    pintarEventos(detalle('periodo-0'));
    expect(document.querySelector('[data-periodo="0"]')).toBeInTheDocument();
  });

  it('enlaza a la ficha de los jugadores que intervienen', () => {
    pintarEventos(detalle('copa'));
    const enlaces = document.querySelectorAll('[router-link*="/jugador/"]');
    expect(enlaces.length).toBeGreaterThan(0);
  });

  it('muestra un estado vacío si no hay incidencias', () => {
    pintarEventos(detalle('programado'));
    expect(screen.getByTestId('eventos-vacios')).toBeInTheDocument();
    expect(filas()).toHaveLength(0);
  });

  it('pinta la tanda de penaltis por rondas, antes que el resto', () => {
    const partido = detalle('copa');
    partido.incidencias = [
      ...partido.incidencias,
      penalti('local', 'gol'),
      penalti('visitante', 'fallo'),
      penalti('local', 'fallo'),
      penalti('visitante', 'gol'),
    ];
    pintarEventos(partido);

    const tanda = screen.getByTestId('tanda-penaltis');
    // Siempre hay cinco rondas; las no lanzadas quedan vacías.
    expect(within(tanda).getAllByTestId('tanda-ronda')).toHaveLength(5);
    expect(within(tanda).getByTestId('tanda-marcador')).toHaveTextContent(
      '1–1',
    );
    expect(
      within(tanda)
        .getAllByTestId('tanda-ronda')[0]!
        .querySelectorAll('[data-resultado]'),
    ).toHaveLength(2);
    // La tanda no aparece también como eventos sueltos.
    expect(
      document.querySelector('[data-periodo="21"]'),
    ).not.toBeInTheDocument();
    expect(
      tanda.compareDocumentPosition(screen.getAllByTestId('evento')[0]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
