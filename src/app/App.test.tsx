import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { transporteDeFixtures } from '../api/fixtures/transporte';
import type { Transporte } from '../api/transport';
import '../i18n';
import { App } from './App';

const transporte = vi.hoisted(() => vi.fn<Transporte>());
vi.mock(import('../api/transport'), async (original) => ({
  ...(await original()),
  transporte,
}));

beforeEach(() => {
  transporte.mockImplementation(transporteDeFixtures());
});

describe('App', () => {
  it('muestra las tres pestañas y arranca en Partidos', async () => {
    render(<App />);
    expect(await screen.findByTestId('page-partidos')).toBeInTheDocument();
    for (const nombre of ['Partidos', 'Clasificación', 'Estadísticas']) {
      expect(
        screen.getAllByText(nombre, { selector: 'ion-label' }).length,
      ).toBeGreaterThan(0);
    }
  });
});
