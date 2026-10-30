import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import '../i18n';
import { App } from './App';

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
