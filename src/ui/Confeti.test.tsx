import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Confeti, PIEZAS } from './Confeti';

describe('Confeti', () => {
  it('se quita solo cuando han caído todas las piezas', () => {
    const { container } = render(<Confeti azar={() => 0.5} />);
    const piezas = [...container.querySelectorAll('.confeti__pieza')];
    expect(piezas).toHaveLength(PIEZAS);
    expect(screen.getByTestId('confeti')).toHaveAttribute('aria-hidden');

    // jsdom no tiene AnimationEvent y React escucha la variante con prefijo.
    const acabar = (pieza: Element) =>
      fireEvent(pieza, new Event('webkitAnimationEnd', { bubbles: true }));
    piezas.slice(1).forEach(acabar);
    expect(screen.queryByTestId('confeti')).not.toBeNull();
    acabar(piezas[0]!);
    expect(screen.queryByTestId('confeti')).toBeNull();
  });
});
